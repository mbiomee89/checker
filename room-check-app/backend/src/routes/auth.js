import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { unauthorized, badRequest, forbidden } from '../utils/errors.js';

const router = Router();

const SALT_ROUNDS = 10;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || ''}`,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function serializeUser(user, roles, activeRole) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    campId: user.campId,
    roles,
    activeRole,
    mustChangePassword: user.mustChangePassword,
  };
}

router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { roleAssignments: true } });
    if (!user || !user.isActive) throw unauthorized('Invalid email or password');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw unauthorized('Invalid email or password');

    const roles = user.roleAssignments.map((r) => r.role);
    const activeRole = roles[0];
    const token = signToken(user.id, activeRole);
    res.json({ token, user: serializeUser(user, roles, activeRole) });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: serializeUser(req.user, req.user.roles, req.user.activeRole) });
  })
);

const switchRoleSchema = z.object({ role: z.enum(['INSPECTOR', 'CAMP_SUPERVISOR', 'ADMIN', 'HSE_VIEWER']) });

router.post(
  '/switch-role',
  requireAuth,
  validateBody(switchRoleSchema),
  asyncHandler(async (req, res) => {
    if (!req.user.roles.includes(req.body.role)) throw forbidden('You do not hold that role');
    const token = signToken(req.user.id, req.body.role);
    res.json({ token, user: serializeUser(req.user, req.user.roles, req.body.role) });
  })
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
    if (!valid) throw badRequest('Current password is incorrect');

    const passwordHash = await bcrypt.hash(req.body.newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    res.status(204).end();
  })
);

export default router;
