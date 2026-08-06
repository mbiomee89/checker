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
    const { campId } = req.query;
    if (req.user.role === 'CAMP_SUPERVISOR' && req.user.campId !== campId) {
      throw forbidden('You can only view rooms in your assigned camp');
    }

    const rooms = await prisma.room.findMany({
      where: { campId },
      orderBy: { roomNumber: 'asc' },
      include: {
        inspections: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { inspectedAt: 'desc' },
          take: 10,
          select: { id: true, status: true, inspectedAt: true },
        },
      },
    });

    const roomRows = rooms.map((room) => {
      const { inspections, ...rest } = room;
      const openDraft = inspections.find((i) => i.status === 'DRAFT');
      const lastSubmitted = inspections.find((i) => i.status === 'SUBMITTED');
      const latest = inspections[0];
      return {
        ...rest,
        lastInspectionAt: latest?.inspectedAt ?? null,
        status: openDraft ? 'draft' : lastSubmitted ? 'submitted' : 'never',
        openDraftInspectionId: openDraft?.id ?? null,
        lastSubmittedInspectionId: lastSubmitted?.id ?? null,
      };
    });

    res.json({ roomRows });
  })
);

export default router;
