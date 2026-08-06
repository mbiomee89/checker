import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { forbidden, notFound } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

const listQuery = z.object({ campId: z.coerce.number().int().positive() });

router.get(
  '/',
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    if (req.user.activeRole === 'CAMP_SUPERVISOR' && req.user.campId !== req.query.campId) {
      throw forbidden('You can only view your assigned camp');
    }
    const flags = await prisma.priorityFlag.findMany({ where: { campId: req.query.campId } });
    res.json({
      priorityFlags: flags.map((f) => ({ checklistItemId: f.checklistItemId, optionId: f.optionId })),
    });
  })
);

const flagBody = z.object({
  campId: z.number().int().positive(),
  checklistItemId: z.number().int().positive(),
  optionId: z.number().int().positive(),
});

router.post(
  '/',
  requireRole('INSPECTOR'),
  validateBody(flagBody),
  asyncHandler(async (req, res) => {
    const { campId, checklistItemId, optionId } = req.body;
    const camp = await prisma.camp.findUnique({ where: { id: campId } });
    if (!camp) throw notFound('Camp not found');

    const existing = await prisma.priorityFlag.findUnique({
      where: { campId_checklistItemId_optionId: { campId, checklistItemId, optionId } },
    });
    if (!existing) {
      await prisma.priorityFlag.create({
        data: { campId, checklistItemId, optionId, flaggedById: req.user.id },
      });
    }
    res.status(201).json({ checklistItemId, optionId, campId });
  })
);

router.delete(
  '/',
  requireRole('INSPECTOR'),
  validateBody(flagBody),
  asyncHandler(async (req, res) => {
    const { campId, checklistItemId, optionId } = req.body;
    await prisma.priorityFlag.deleteMany({ where: { campId, checklistItemId, optionId } });
    res.status(204).end();
  })
);

export default router;
