import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { serializeCorrectiveAction } from '../services/correctiveActions.js';
import { serializeCampRoomInspection, monthRange, monthOf } from '../services/hse.js';

const router = Router();

router.use(requireAuth, requireRole('HSE_VIEWER'));

router.get(
  '/room-inspections',
  asyncHandler(async (_req, res) => {
    const rooms = await prisma.room.findMany({
      where: { active: true, camp: { active: true } },
      include: {
        camp: true,
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
      .map((room) => serializeCampRoomInspection(room, room.inspections[0]));

    res.json({ roomInspections });
  })
);

const cyclesQuery = z.object({ months: z.coerce.number().int().min(1).max(12).default(6) });

router.get(
  '/inspection-cycles',
  validateQuery(cyclesQuery),
  asyncHandler(async (req, res) => {
    const months = monthRange(req.query.months);
    const monthSet = new Set(months);
    const since = new Date(`${months[0]}-01T00:00:00.000Z`);

    const inspections = await prisma.inspection.findMany({
      where: { status: 'SUBMITTED', inspectedAt: { gte: since }, room: { active: true, camp: { active: true } } },
      include: {
        room: { include: { camp: true } },
        inspector: true,
        responses: { include: { selectedOptions: { include: { option: true } } } },
      },
    });

    // Group into {campId, campName, cycleMonth} buckets, one entry per inspection event
    // (not deduplicated per room — this is a frequency count, not a current-state snapshot).
    const buckets = new Map();
    for (const inspection of inspections) {
      const cycleMonth = monthOf(inspection.inspectedAt);
      if (!monthSet.has(cycleMonth)) continue;
      const key = `${inspection.room.campId}:${cycleMonth}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          campId: inspection.room.campId,
          campName: inspection.room.camp.name,
          cycleMonth,
          roomInspections: [],
        });
      }
      buckets.get(key).roomInspections.push(serializeCampRoomInspection(inspection.room, inspection));
    }

    res.json({ inspectionCycles: [...buckets.values()] });
  })
);

router.get(
  '/corrective-actions',
  asyncHandler(async (_req, res) => {
    const actions = await prisma.correctiveAction.findMany({
      where: { room: { active: true, camp: { active: true } } },
      include: { room: { include: { camp: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      correctiveActions: actions.map((a) => ({
        ...serializeCorrectiveAction(a),
        campId: a.room.campId,
        campName: a.room.camp.name,
      })),
    });
  })
);

router.get(
  '/priority-flags',
  asyncHandler(async (_req, res) => {
    const flags = await prisma.priorityFlag.findMany({ where: { camp: { active: true } }, include: { camp: true } });
    res.json({
      priorityFlags: flags.map((f) => ({
        checklistItemId: f.checklistItemId,
        optionId: f.optionId,
        campId: f.campId,
        campName: f.camp.name,
      })),
    });
  })
);

export default router;
