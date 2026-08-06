import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams, idParam } from '../middleware/validate.js';
import { forbidden, notFound } from '../utils/errors.js';
import { appendNote, serializeCorrectiveAction } from '../services/correctiveActions.js';

const router = Router();

router.use(requireAuth);

const listQuery = z.object({ campId: z.coerce.number().int().positive() });

function assertCampAccess(user, campId) {
  if (user.role === 'CAMP_SUPERVISOR' && user.campId !== campId) throw forbidden('You can only view your assigned camp');
}

router.get(
  '/',
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    assertCampAccess(req.user, req.query.campId);
    const actions = await prisma.correctiveAction.findMany({
      where: { room: { campId: req.query.campId } },
      include: { room: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ correctiveActions: actions.map(serializeCorrectiveAction) });
  })
);

const createSchema = z.object({
  roomId: z.number().int().positive(),
  checklistItemId: z.number().int().positive(),
  optionId: z.number().int().positive(),
  note: z.string().min(1),
  dueDate: z.string().nullable().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
});

router.post(
  '/',
  requireRole('CAMP_SUPERVISOR'),
  validateBody(createSchema),
  asyncHandler(async (req, res) => {
    const { roomId, checklistItemId, optionId, note, dueDate, status } = req.body;
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw notFound('Room not found');
    if (room.campId !== req.user.campId) throw forbidden('You can only act on rooms in your assigned camp');

    const existing = await prisma.correctiveAction.findUnique({
      where: { roomId_checklistItemId_optionId: { roomId, checklistItemId, optionId } },
    });

    const data = {
      description: appendNote(existing?.description ?? null, req.user, note),
      status: status ?? existing?.status ?? 'OPEN',
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : existing?.dueDate ?? null,
      resolvedAt: (status ?? existing?.status) === 'RESOLVED' ? new Date() : null,
    };

    const saved = existing
      ? await prisma.correctiveAction.update({ where: { id: existing.id }, data, include: { room: true } })
      : await prisma.correctiveAction.create({
          data: { roomId, checklistItemId, optionId, ...data },
          include: { room: true },
        });

    res.status(existing ? 200 : 201).json({ correctiveAction: serializeCorrectiveAction(saved) });
  })
);

const patchSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  note: z.string().min(1),
});

router.patch(
  '/:id',
  requireRole('CAMP_SUPERVISOR'),
  validateParams(idParam),
  validateBody(patchSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.correctiveAction.findUnique({ where: { id: req.params.id }, include: { room: true } });
    if (!existing) throw notFound('Corrective action not found');
    if (existing.room.campId !== req.user.campId) throw forbidden('You can only act on rooms in your assigned camp');

    const saved = await prisma.correctiveAction.update({
      where: { id: existing.id },
      data: {
        description: appendNote(existing.description, req.user, req.body.note),
        status: req.body.status,
        resolvedAt: req.body.status === 'RESOLVED' ? new Date() : null,
      },
      include: { room: true },
    });

    res.json({ correctiveAction: serializeCorrectiveAction(saved) });
  })
);

export default router;
