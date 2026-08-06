import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateParams, idParam } from '../middleware/validate.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { generateTempPassword, serializeAdminUser } from '../services/users.js';

const router = Router();

const SALT_ROUNDS = 10;
const ROLES = ['INSPECTOR', 'CAMP_SUPERVISOR', 'ADMIN', 'HSE_VIEWER'];

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: { roleAssignments: true },
    });
    res.json({ users: users.map(serializeAdminUser) });
  })
);

const userSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    roles: z.array(z.enum(ROLES)).min(1, 'At least one role is required'),
    campId: z.number().int().positive().nullable().optional(),
  })
  .transform((v) => ({
    ...v,
    // Server-authoritative, same pattern as Inspection.campId: only CAMP_SUPERVISOR
    // ever carries a campId, regardless of what the client sends.
    campId: v.roles.includes('CAMP_SUPERVISOR') ? (v.campId ?? null) : null,
  }));

router.post(
  '/',
  validateBody(userSchema),
  asyncHandler(async (req, res) => {
    const { name, email, roles, campId } = req.body;
    if (roles.includes('CAMP_SUPERVISOR') && !campId) throw badRequest('Camp Supervisor requires a camp assignment');

    // Unguessable placeholder — login fails for this user until an admin generates
    // real credentials. No special-casing needed in the login route.
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), SALT_ROUNDS);

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          campId,
          hasCredentials: false,
          roleAssignments: { create: roles.map((role) => ({ role })) },
        },
        include: { roleAssignments: true },
      });
      res.status(201).json({ user: serializeAdminUser(user) });
    } catch (err) {
      if (err.code === 'P2002') throw conflict('A user with that email already exists');
      throw err;
    }
  })
);

router.patch(
  '/:id',
  validateParams(idParam),
  validateBody(userSchema),
  asyncHandler(async (req, res) => {
    const { name, email, roles, campId } = req.body;
    if (roles.includes('CAMP_SUPERVISOR') && !campId) throw badRequest('Camp Supervisor requires a camp assignment');

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('User not found');

    try {
      const user = await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: req.params.id }, data: { name, email, campId } });
        await tx.userRoleAssignment.deleteMany({ where: { userId: req.params.id } });
        await tx.userRoleAssignment.createMany({ data: roles.map((role) => ({ userId: req.params.id, role })) });
        return tx.user.findUnique({ where: { id: req.params.id }, include: { roleAssignments: true } });
      });
      res.json({ user: serializeAdminUser(user) });
    } catch (err) {
      if (err.code === 'P2002') throw conflict('A user with that email already exists');
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
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('User not found');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: req.body.active },
      include: { roleAssignments: true },
    });
    res.json({ user: serializeAdminUser(user) });
  })
);

router.post(
  '/:id/generate-credentials',
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('User not found');

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash, hasCredentials: true, mustChangePassword: true },
    });

    // Returned once, never stored in plaintext, never retrievable again.
    res.json({ tempPassword });
  })
);

export default router;
