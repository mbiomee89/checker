import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { unauthorized, forbidden } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export function signToken(userId, activeRole) {
  return jwt.sign({ sub: userId, activeRole }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  // Re-fetch on every request — never trust the JWT payload for isActive or roles.
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { roleAssignments: true },
  });
  if (!user || !user.isActive) throw unauthorized('Invalid or expired token');

  const roles = user.roleAssignments.map((r) => r.role);
  // A role revoked after the token was issued must not still grant access.
  if (!roles.includes(payload.activeRole)) throw unauthorized('Invalid or expired token');

  const { roleAssignments, passwordHash, ...rest } = user;
  req.user = { ...rest, roles, activeRole: payload.activeRole };
  next();
});

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.activeRole)) return next(forbidden());
    next();
  };
}
