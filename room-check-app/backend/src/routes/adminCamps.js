import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, idParam } from '../middleware/validate.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

const countInclude = {
  _count: { select: { rooms: { where: { deletedAt: null } }, users: { where: { deletedAt: null } } } },
};

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

function serializeDeletedCamp(camp) {
  return { id: camp.id, name: camp.name, deletedAt: camp.deletedAt };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const camps = await prisma.camp.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: countInclude,
    });
    res.json({ camps: camps.map(serializeCamp) });
  })
);

router.get(
  '/deleted',
  asyncHandler(async (_req, res) => {
    const camps = await prisma.camp.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    res.json({ camps: camps.map(serializeDeletedCamp) });
  })
);

const campSchema = z.object({ name: z.string().min(1), location: z.string().nullable().optional() });

router.post(
  '/',
  validateBody(campSchema),
  asyncHandler(async (req, res) => {
    const camp = await prisma.camp.create({
      data: { name: req.body.name, location: req.body.location ?? null },
      include: countInclude,
    });
    res.status(201).json({ camp: serializeCamp(camp) });
  })
);

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(campSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.camp.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) throw notFound('Camp not found');
    const camp = await prisma.camp.update({
      where: { id: req.params.id },
      data: { name: req.body.name, location: req.body.location ?? null },
      include: countInclude,
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
    const existing = await prisma.camp.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) throw notFound('Camp not found');
    const camp = await prisma.camp.update({
      where: { id: req.params.id },
      data: { active: req.body.active },
      include: countInclude,
    });
    res.json({ camp: serializeCamp(camp) });
  })
);

const deleteSchema = z.object({ confirmName: z.string() });

router.delete(
  '/:id',
  validateParams(idParam),
  validateBody(deleteSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.camp.findUnique({ where: { id: req.params.id }, include: countInclude });
    if (!existing) throw notFound('Camp not found');
    if (existing.active) throw badRequest('Retire this camp before deleting it');
    if (existing._count.rooms > 0 || existing._count.users > 0) {
      throw conflict('Retire or delete this camp’s rooms and users first');
    }
    if (req.body.confirmName !== existing.name) throw badRequest('Confirmation text does not match the camp name');

    await prisma.camp.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.status(204).end();
  })
);

router.post(
  '/:id/restore',
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const existing = await prisma.camp.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Camp not found');
    if (!existing.deletedAt) throw badRequest('Camp is not deleted');

    const camp = await prisma.camp.update({
      where: { id: req.params.id },
      data: { deletedAt: null },
      include: countInclude,
    });
    res.json({ camp: serializeCamp(camp) });
  })
);

export default router;
