import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // CAMP_SUPERVISOR only sees their own camp; everyone else sees all active camps.
    const where =
      req.user.activeRole === 'CAMP_SUPERVISOR' && req.user.campId
        ? { id: req.user.campId, active: true }
        : { active: true };
    const camps = await prisma.camp.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ camps });
  })
);

export default router;
