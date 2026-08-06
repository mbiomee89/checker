import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const checklistItems = await prisma.checklistItem.findMany({
      where: { active: true },
      orderBy: { sequenceNo: 'asc' },
      include: {
        options: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    res.json({ checklistItems });
  })
);

export default router;
