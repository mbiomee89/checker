import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { forbidden } from '../utils/errors.js';

const router = Router();

router.use(requireAuth);

const listQuery = z.object({ campId: z.coerce.number().int().positive() });

router.get(
  '/',
  validateQuery(listQuery),
  asyncHandler(async (req, res) => {
    if (req.user.role === 'CAMP_SUPERVISOR' && req.user.campId !== req.query.campId) {
      throw forbidden('You can only view your assigned camp');
    }
    const flags = await prisma.priorityFlag.findMany({ where: { campId: req.query.campId } });
    res.json({
      priorityFlags: flags.map((f) => ({ checklistItemId: f.checklistItemId, optionId: f.optionId })),
    });
  })
);

export default router;
