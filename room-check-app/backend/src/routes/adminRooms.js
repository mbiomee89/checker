import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, idParam } from '../middleware/validate.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { mangle, unmangle } from '../services/softDelete.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

function serializeRoom(room) {
  return {
    id: room.id,
    roomNumber: room.roomNumber,
    campId: room.campId,
    approvedCapacity: room.approvedCapacity,
    active: room.active,
  };
}

function serializeDeletedRoom(room) {
  return { id: room.id, roomNumber: unmangle(room.roomNumber), campId: room.campId, deletedAt: room.deletedAt };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rooms = await prisma.room.findMany({
      where: { deletedAt: null },
      orderBy: [{ campId: 'asc' }, { roomNumber: 'asc' }],
    });
    res.json({ rooms: rooms.map(serializeRoom) });
  })
);

router.get(
  '/deleted',
  asyncHandler(async (_req, res) => {
    const rooms = await prisma.room.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    res.json({ rooms: rooms.map(serializeDeletedRoom) });
  })
);

const roomSchema = z.object({
  roomNumber: z.string().min(1),
  campId: z.number().int().positive(),
  approvedCapacity: z.number().int().min(0).nullable().optional(),
});

router.post(
  '/',
  validateBody(roomSchema),
  asyncHandler(async (req, res) => {
    const camp = await prisma.camp.findUnique({ where: { id: req.body.campId } });
    if (!camp) throw notFound('Camp not found');
    try {
      const room = await prisma.room.create({
        data: {
          roomNumber: req.body.roomNumber,
          campId: req.body.campId,
          approvedCapacity: req.body.approvedCapacity ?? null,
        },
      });
      res.status(201).json({ room: serializeRoom(room) });
    } catch (err) {
      if (err.code === 'P2002') throw conflict('That room number already exists in this camp');
      throw err;
    }
  })
);

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(roomSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Room not found');
    try {
      const room = await prisma.room.update({
        where: { id: req.params.id },
        data: {
          roomNumber: req.body.roomNumber,
          campId: req.body.campId,
          approvedCapacity: req.body.approvedCapacity ?? null,
        },
      });
      res.json({ room: serializeRoom(room) });
    } catch (err) {
      if (err.code === 'P2002') throw conflict('That room number already exists in this camp');
      throw err;
    }
  })
);

const activeSchema = z.object({ active: z.boolean() });

router.patch(
  '/:id/active',
  validateParams(idParam),
  validateBody(activeSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Room not found');
    const room = await prisma.room.update({ where: { id: req.params.id }, data: { active: req.body.active } });
    res.json({ room: serializeRoom(room) });
  })
);

const rangeSchema = z
  .object({
    campId: z.number().int().positive(),
    startRoomNumber: z.number().int(),
    endRoomNumber: z.number().int(),
    approvedCapacity: z.number().int().min(0).nullable().optional(),
  })
  .refine((v) => v.endRoomNumber >= v.startRoomNumber, { message: 'End must be >= start' })
  .refine((v) => v.endRoomNumber - v.startRoomNumber < 500, { message: 'Range too large (max 500 rooms)' });

router.post(
  '/range',
  validateBody(rangeSchema),
  asyncHandler(async (req, res) => {
    const { campId, startRoomNumber, endRoomNumber, approvedCapacity } = req.body;
    const camp = await prisma.camp.findUnique({ where: { id: campId } });
    if (!camp) throw notFound('Camp not found');

    const numbers = [];
    for (let n = startRoomNumber; n <= endRoomNumber; n++) numbers.push(String(n));

    const existing = await prisma.room.findMany({
      where: { campId, roomNumber: { in: numbers } },
      select: { roomNumber: true },
    });
    if (existing.length > 0) {
      throw badRequest(`Rooms already exist in this range: ${existing.map((r) => r.roomNumber).join(', ')}`);
    }

    await prisma.room.createMany({
      data: numbers.map((roomNumber) => ({ campId, roomNumber, approvedCapacity: approvedCapacity ?? null })),
    });
    const rooms = await prisma.room.findMany({ where: { campId, roomNumber: { in: numbers } } });
    res.status(201).json({ rooms: rooms.map(serializeRoom) });
  })
);

const deleteSchema = z.object({ confirmRoomNumber: z.string() });

router.delete(
  '/:id',
  validateParams(idParam),
  validateBody(deleteSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Room not found');
    if (existing.active) throw badRequest('Retire this room before deleting it');
    if (req.body.confirmRoomNumber !== existing.roomNumber) {
      throw badRequest('Confirmation text does not match the room number');
    }

    await prisma.room.update({
      where: { id: req.params.id },
      data: { roomNumber: mangle(existing.roomNumber, existing.id), deletedAt: new Date() },
    });
    res.status(204).end();
  })
);

router.post(
  '/:id/restore',
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const existing = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Room not found');
    if (!existing.deletedAt) throw badRequest('Room is not deleted');

    const originalNumber = unmangle(existing.roomNumber);
    const collision = await prisma.room.findFirst({
      where: { campId: existing.campId, roomNumber: originalNumber, deletedAt: null },
    });
    if (collision) throw conflict('A room with that number already exists in this camp — resolve manually');

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: { roomNumber: originalNumber, deletedAt: null },
    });
    res.json({ room: serializeRoom(room) });
  })
);

export default router;
