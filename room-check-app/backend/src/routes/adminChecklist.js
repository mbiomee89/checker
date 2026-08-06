import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, idParam } from '../middleware/validate.js';
import { notFound } from '../utils/errors.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

function serializeItem(item) {
  return {
    id: item.id,
    sequenceNo: item.sequenceNo,
    name: item.name,
    inputType: item.inputType,
    active: item.active,
    options: item.options.map((o) => ({
      id: o.id,
      label: o.label,
      isClearOption: o.isClearOption,
      kind: o.kind === 'COUNT' ? 'count' : 'toggle',
      requiresAction: o.requiresAction,
      active: o.active,
      sortOrder: o.sortOrder,
    })),
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await prisma.checklistItem.findMany({
      orderBy: { sequenceNo: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ checklistItems: items.map(serializeItem) });
  })
);

const itemSchema = z.object({
  name: z.string().min(1),
  inputType: z.enum(['SINGLE_SELECT', 'MULTI_SELECT', 'TEXT']),
});

router.post(
  '/',
  validateBody(itemSchema),
  asyncHandler(async (req, res) => {
    const maxItem = await prisma.checklistItem.findFirst({ orderBy: { sequenceNo: 'desc' } });
    const item = await prisma.checklistItem.create({
      data: { ...req.body, sequenceNo: (maxItem?.sequenceNo ?? 0) + 1 },
      include: { options: true },
    });
    res.status(201).json({ checklistItem: serializeItem(item) });
  })
);

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(itemSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.checklistItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Checklist item not found');
    const item = await prisma.checklistItem.update({
      where: { id: req.params.id },
      data: req.body,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ checklistItem: serializeItem(item) });
  })
);

const activeSchema = z.object({ active: z.boolean() });

router.patch(
  '/:id/active',
  validateParams(idParam),
  validateBody(activeSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.checklistItem.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Checklist item not found');
    const item = await prisma.checklistItem.update({
      where: { id: req.params.id },
      data: { active: req.body.active },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ checklistItem: serializeItem(item) });
  })
);

const optionSchema = z.object({
  label: z.string().min(1),
  isClearOption: z.boolean(),
  kind: z.enum(['toggle', 'count']),
  requiresAction: z.boolean(),
});

router.post(
  '/:id/options',
  validateParams(idParam),
  validateBody(optionSchema),
  asyncHandler(async (req, res) => {
    const item = await prisma.checklistItem.findUnique({ where: { id: req.params.id } });
    if (!item) throw notFound('Checklist item not found');
    const maxOption = await prisma.checklistItemOption.findFirst({
      where: { checklistItemId: req.params.id },
      orderBy: { sortOrder: 'desc' },
    });
    await prisma.checklistItemOption.create({
      data: {
        checklistItemId: req.params.id,
        label: req.body.label,
        isClearOption: req.body.isClearOption,
        kind: req.body.kind === 'count' ? 'COUNT' : 'TOGGLE',
        requiresAction: req.body.requiresAction,
        sortOrder: (maxOption?.sortOrder ?? -1) + 1,
      },
    });
    const updated = await prisma.checklistItem.findUnique({
      where: { id: req.params.id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    res.status(201).json({ checklistItem: serializeItem(updated) });
  })
);

const optionParams = idParam.extend({ optionId: z.coerce.number().int().positive() });

router.patch(
  '/:id/options/:optionId',
  validateParams(optionParams),
  validateBody(optionSchema),
  asyncHandler(async (req, res) => {
    const option = await prisma.checklistItemOption.findUnique({ where: { id: req.params.optionId } });
    if (!option || option.checklistItemId !== req.params.id) throw notFound('Option not found');
    await prisma.checklistItemOption.update({
      where: { id: req.params.optionId },
      data: {
        label: req.body.label,
        isClearOption: req.body.isClearOption,
        kind: req.body.kind === 'count' ? 'COUNT' : 'TOGGLE',
        requiresAction: req.body.requiresAction,
      },
    });
    const updated = await prisma.checklistItem.findUnique({
      where: { id: req.params.id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ checklistItem: serializeItem(updated) });
  })
);

router.patch(
  '/:id/options/:optionId/active',
  validateParams(optionParams),
  validateBody(activeSchema),
  asyncHandler(async (req, res) => {
    const option = await prisma.checklistItemOption.findUnique({ where: { id: req.params.optionId } });
    if (!option || option.checklistItemId !== req.params.id) throw notFound('Option not found');
    await prisma.checklistItemOption.update({
      where: { id: req.params.optionId },
      data: { active: req.body.active },
    });
    const updated = await prisma.checklistItem.findUnique({
      where: { id: req.params.id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ checklistItem: serializeItem(updated) });
  })
);

export default router;
