import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams, idParam } from '../middleware/validate.js';
import { uploadInspectionPhoto, assertSniffedPhoto, deleteUploadFile, UPLOAD_ROOT } from '../middleware/upload.js';
import { badRequest, notFound, forbidden, conflict } from '../utils/errors.js';
import { seedDefaultResponses, serializeInspection, inspectionInclude, mapResponses } from '../services/inspections.js';
import path from 'node:path';

const router = Router();

router.use(requireAuth);

function assertCanView(user, inspection) {
  if (user.activeRole === 'ADMIN') return;
  if (inspection.status === 'DRAFT') {
    if (user.activeRole !== 'INSPECTOR') throw forbidden();
    return;
  }
  if (user.activeRole === 'CAMP_SUPERVISOR' && user.campId !== inspection.campId) throw forbidden();
}

async function loadInspection(id) {
  const inspection = await prisma.inspection.findUnique({ where: { id }, include: inspectionInclude });
  if (!inspection) throw notFound('Inspection not found');
  return inspection;
}

const createSchema = z.object({ roomId: z.coerce.number().int().positive() });

router.post(
  '/',
  requireRole('INSPECTOR'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const room = await prisma.room.findUnique({ where: { id: req.body.roomId } });
    if (!room) throw notFound('Room not found');

    const existingDraft = await prisma.inspection.findFirst({
      where: { roomId: room.id, status: 'DRAFT' },
      include: inspectionInclude,
    });
    if (existingDraft) return res.status(200).json({ inspection: serializeInspection(existingDraft) });

    const created = await prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          roomId: room.id,
          campId: room.campId, // server-set from room — never accepted from the client
          inspectorId: req.user.id,
        },
      });
      await seedDefaultResponses(tx, inspection.id);
      return tx.inspection.findUnique({ where: { id: inspection.id }, include: inspectionInclude });
    });

    res.status(201).json({ inspection: serializeInspection(created) });
  })
);

const latestByRoomQuery = z.object({ campId: z.coerce.number().int().positive() });

router.get(
  '/latest-by-room',
  validateQuery(latestByRoomQuery),
  asyncHandler(async (req, res) => {
    const { campId } = req.query;
    if (req.user.activeRole === 'CAMP_SUPERVISOR' && req.user.campId !== campId) {
      throw forbidden('You can only view your assigned camp');
    }

    const rooms = await prisma.room.findMany({
      where: { campId },
      include: {
        inspections: {
          where: { status: 'SUBMITTED' },
          orderBy: { inspectedAt: 'desc' },
          take: 1,
          include: {
            inspector: true,
            responses: { include: { selectedOptions: { include: { option: true } } } },
          },
        },
      },
    });

    const roomInspections = rooms
      .filter((room) => room.inspections.length > 0)
      .map((room) => {
        const inspection = room.inspections[0];
        return {
          roomId: room.id,
          roomNumber: room.roomNumber,
          approvedCapacity: room.approvedCapacity,
          inspectedAt: inspection.inspectedAt,
          inspectorName: inspection.inspector.name,
          headcount: inspection.headcount,
          responses: mapResponses(inspection.responses),
        };
      });

    res.json({ roomInspections });
  })
);

router.get(
  '/:id',
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const inspection = await loadInspection(req.params.id);
    assertCanView(req.user, inspection);
    res.json({ inspection: serializeInspection(inspection) });
  })
);

const responseSchema = z.object({
  checklistItemId: z.number().int().positive(),
  selectedOptionIds: z.array(z.number().int().positive()).optional(),
  counts: z.record(z.string(), z.number().int().min(0)).optional(),
  textValue: z.string().nullable().optional(),
  commentText: z.string().nullable().optional(),
});

const patchSchema = z.object({
  headcount: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  residentIdNumbers: z.array(z.string().min(1)).optional(),
  responses: z.array(responseSchema).optional(),
});

router.patch(
  '/:id',
  requireRole('INSPECTOR'),
  validateParams(idParam),
  validateBody(patchSchema),
  asyncHandler(async (req, res) => {
    const existing = await loadInspection(req.params.id);
    if (existing.status !== 'DRAFT') throw conflict('Only DRAFT inspections can be edited');

    const { headcount, notes, residentIdNumbers, responses } = req.body;

    await prisma.$transaction(async (tx) => {
      const data = {};
      if (headcount !== undefined) data.headcount = headcount;
      if (notes !== undefined) data.notes = notes;
      if (Object.keys(data).length > 0) {
        await tx.inspection.update({ where: { id: existing.id }, data });
      }

      if (residentIdNumbers !== undefined) {
        await tx.inspectionResident.deleteMany({ where: { inspectionId: existing.id } });
        for (const residentIdNumber of residentIdNumbers) {
          await tx.inspectionResident.create({ data: { inspectionId: existing.id, residentIdNumber } });
        }
      }

      if (responses !== undefined) {
        for (const r of responses) {
          const response = await tx.inspectionResponse.upsert({
            where: { inspectionId_checklistItemId: { inspectionId: existing.id, checklistItemId: r.checklistItemId } },
            update: {
              commentText: r.commentText !== undefined ? r.commentText : undefined,
              textValue: r.textValue !== undefined ? r.textValue : undefined,
            },
            create: {
              inspectionId: existing.id,
              checklistItemId: r.checklistItemId,
              commentText: r.commentText ?? null,
              textValue: r.textValue ?? null,
            },
          });

          await tx.inspectionResponseOption.deleteMany({ where: { responseId: response.id } });

          for (const optionId of r.selectedOptionIds ?? []) {
            await tx.inspectionResponseOption.create({ data: { responseId: response.id, optionId } });
          }
          for (const [optionId, count] of Object.entries(r.counts ?? {})) {
            await tx.inspectionResponseOption.create({
              data: { responseId: response.id, optionId: Number(optionId), count },
            });
          }
        }
      }
    });

    const updated = await loadInspection(req.params.id);
    res.json({ inspection: serializeInspection(updated) });
  })
);

router.post(
  '/:id/submit',
  requireRole('INSPECTOR'),
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const existing = await loadInspection(req.params.id);
    if (existing.status !== 'DRAFT') throw conflict('Only DRAFT inspections can be submitted');

    await prisma.inspection.update({ where: { id: existing.id }, data: { status: 'SUBMITTED' } });
    const updated = await loadInspection(req.params.id);
    res.json({ inspection: serializeInspection(updated) });
  })
);

router.post(
  '/:id/photos',
  requireRole('INSPECTOR'),
  validateParams(idParam),
  uploadInspectionPhoto,
  assertSniffedPhoto,
  asyncHandler(async (req, res) => {
    const existing = await loadInspection(req.params.id);
    if (existing.status !== 'DRAFT') {
      deleteUploadFile(req.file.path);
      throw conflict('Only DRAFT inspections can receive photos');
    }
    if (existing.photos.length >= 4) {
      deleteUploadFile(req.file.path);
      throw badRequest('Maximum 4 photos per inspection');
    }

    const photo = await prisma.photo.create({
      data: {
        inspectionId: existing.id,
        filePath: path.basename(req.file.path),
        mimeType: req.file.mimetype,
      },
    });

    res.status(201).json({ photo: { id: photo.id, url: `/uploads/inspection-photos/${photo.filePath}`, mimeType: photo.mimeType } });
  })
);

router.delete(
  '/:id/photos/:photoId',
  requireRole('INSPECTOR'),
  validateParams(idParam.extend({ photoId: z.coerce.number().int().positive() })),
  asyncHandler(async (req, res) => {
    const existing = await loadInspection(req.params.id);
    if (existing.status !== 'DRAFT') throw conflict('Only DRAFT inspections can be edited');

    const photo = existing.photos.find((p) => p.id === req.params.photoId);
    if (!photo) throw notFound('Photo not found');

    await prisma.photo.delete({ where: { id: photo.id } });
    deleteUploadFile(path.join(UPLOAD_ROOT, 'inspection-photos', photo.filePath));

    res.status(204).end();
  })
);

export default router;
