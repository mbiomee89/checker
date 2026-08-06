import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, idParam } from '../middleware/validate.js';
import { notFound } from '../utils/errors.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

function serializeCamp(camp) {
  return {
    id: camp.id,
    name: camp.name,
    location: camp.location,
    active: camp.active,
    roomCount: camp._count.rooms,
    userCount: camp._count.users,
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const camps = await prisma.camp.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { rooms: true, users: true } } },
    });
    res.json({ camps: camps.map(serializeCamp) });
  })
);

const campSchema = z.object({ name: z.string().min(1), location: z.string().nullable().optional() });

router.post(
  '/',
  validateBody(campSchema),
  asyncHandler(async (req, res) => {
    const camp = await prisma.camp.create({
      data: { name: req.body.name, location: req.body.location ?? null },
      include: { _count: { select: { rooms: true, users: true } } },
    });
    res.status(201).json({ camp: serializeCamp(camp) });
  })
);

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(campSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.camp.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Camp not found');
    const camp = await prisma.camp.update({
      where: { id: req.params.id },
      data: { name: req.body.name, location: req.body.location ?? null },
      include: { _count: { select: { rooms: true, users: true } } },
    });
    res.json({ camp: serializeCamp(camp) });
  })
);

const activeSchema = z.object({ active: z.boolean() });

router.patch(
  '/:id/active',
  validateParams(idParam),
  validateBody(activeSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.camp.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Camp not found');
    const camp = await prisma.camp.update({
      where: { id: req.params.id },
      data: { active: req.body.active },
      include: { _count: { select: { rooms: true, users: true } } },
    });
    res.json({ camp: serializeCamp(camp) });
  })
);

export default router;
