// Shared admin-credential logic for prisma/seed-prod.js (first-boot bootstrap)
// and prisma/reset-admin-password.js (on-demand recovery). Three-layer safety
// net for "how does anyone actually get the first admin password":
//   1. Best: ADMIN_PASSWORD env var — deployer picks it, stores it wherever
//      they already store JWT_SECRET/DATABASE_URL. No log-scraping, no race
//      against log rotation.
//   2. Fallback: no ADMIN_PASSWORD set — generate one, print it ONCE, force
//      it to be changed on first login.
//   3. Recovery: if a human misses that one-time line, reset-admin-password.js
//      can be run anytime (via the platform's shell/exec) to regenerate
//      credentials without touching any other data.
import bcrypt from 'bcryptjs';
import { generateTempPassword } from '../backend/src/services/users.js';

const SALT_ROUNDS = 10;
const MIN_ADMIN_PASSWORD_LENGTH = 8;

function resolveCredentials() {
  const email = process.env.ADMIN_EMAIL || 'admin@checker.local';
  const explicitPassword = process.env.ADMIN_PASSWORD;

  if (explicitPassword && explicitPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD is set but too short (${explicitPassword.length} chars, need at least ${MIN_ADMIN_PASSWORD_LENGTH}). Refusing to boot with a weak admin password.`
    );
  }

  return { email, password: explicitPassword || generateTempPassword(), isExplicit: Boolean(explicitPassword) };
}

function logResult(label, email, password, isExplicit) {
  if (isExplicit) {
    console.log(`[${label}] Admin account ready — email: ${email} (password set from ADMIN_PASSWORD, not shown here).`);
    return;
  }
  console.log('\n=================================================================');
  console.log(`[${label}] Admin credentials:`);
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log('This password is shown ONLY here, ONLY once. Log in immediately —');
  console.log('the app will force a real password to be set before anything else');
  console.log('is usable. Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL) as env');
  console.log('vars before boot to skip this entirely and choose your own password.');
  console.log('=================================================================\n');
}

// mode: 'create' — always inserts a new user (caller must ensure none exist yet).
// mode: 'reset' — updates the named admin's credentials if they exist, else creates one.
export async function createOrResetAdmin(prisma, { label, mode }) {
  const { email, password, isExplicit } = resolveCredentials();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const data = {
    passwordHash,
    hasCredentials: true,
    mustChangePassword: !isExplicit, // an explicitly-chosen password doesn't need a forced change
    isActive: true,
  };

  if (mode === 'reset') {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data });
      const roles = await prisma.userRoleAssignment.findMany({ where: { userId: existing.id } });
      if (!roles.some((r) => r.role === 'ADMIN')) {
        await prisma.userRoleAssignment.create({ data: { userId: existing.id, role: 'ADMIN' } });
      }
      logResult(label, email, password, isExplicit);
      return;
    }
  }

  await prisma.user.create({
    data: { name: 'Admin', email, ...data, roleAssignments: { create: [{ role: 'ADMIN' }] } },
  });
  logResult(label, email, password, isExplicit);
}
