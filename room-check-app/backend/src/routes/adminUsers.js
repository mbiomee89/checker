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
import { mangle, unmangle } from '../services/softDelete.js';
import { forbidden } from '../utils/errors.js';

const router = Router();

const SALT_ROUNDS = 10;
const ROLES = ['INSPECTOR', 'CAMP_SUPERVISOR', 'ADMIN', 'HSE_VIEWER'];

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { roleAssignments: true },
    });
    res.json({ users: users.map(serializeAdminUser) });
  })
);

router.get(
  '/deleted',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    res.json({
      users: users.map((u) => ({ id: u.id, name: u.name, email: unmangle(u.email), deletedAt: u.deletedAt })),
    });
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

    const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
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
    if (req.params.id === req.user.id && !req.body.active) {
      throw forbidden('You cannot deactivate your own account — an active admin would have no one left to undo it');
    }
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
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
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
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

const deleteSchema = z.object({ confirmEmail: z.string() });

router.delete(
  '/:id',
  validateParams(idParam),
  validateBody(deleteSchema),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user.id) throw forbidden('You cannot delete your own account');

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('User not found');
    if (existing.isActive) throw badRequest('Deactivate this user before deleting it');
    if (req.body.confirmEmail !== existing.email) throw badRequest('Confirmation text does not match the email');

    await prisma.user.update({
      where: { id: req.params.id },
      data: { email: mangle(existing.email, existing.id), deletedAt: new Date() },
    });
    res.status(204).end();
  })
);

router.post(
  '/:id/restore',
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('User not found');
    if (!existing.deletedAt) throw badRequest('User is not deleted');

    const originalEmail = unmangle(existing.email);
    const collision = await prisma.user.findFirst({ where: { email: originalEmail, deletedAt: null } });
    if (collision) throw conflict('A user with that email already exists — resolve manually');

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { email: originalEmail, deletedAt: null },
      include: { roleAssignments: true },
    });
    res.json({ user: serializeAdminUser(user) });
  })
);

export default router;
