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
import { generateTempPassword, SALT_ROUNDS, MIN_PASSWORD_LENGTH } from '../backend/src/services/users.js';

// Validated up front, before any DB write — a bad ADMIN_PASSWORD/ADMIN_EMAIL must fail
// this boot cleanly rather than commit the checklist template and let a later retry see
// "data already present" and silently skip admin creation forever (seed-prod.js calls
// this before seedChecklistItems for exactly that reason).
export function assertAdminCredentialsValid() {
  const email = process.env.ADMIN_EMAIL || 'admin@checker.local';
  const explicitPassword = process.env.ADMIN_PASSWORD;

  if (/\s/.test(email)) {
    throw new Error(
      `ADMIN_EMAIL must not contain whitespace (got: ${JSON.stringify(email)}) — a space breaks the ` +
        `soft-delete email-mangling scheme (backend/src/services/softDelete.js), which uses a space to append the row id.`
    );
  }
  if (explicitPassword && explicitPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `ADMIN_PASSWORD is set but too short (${explicitPassword.length} chars, need at least ${MIN_PASSWORD_LENGTH}). Refusing to boot with a weak admin password.`
    );
  }
}

function resolveCredentials() {
  assertAdminCredentialsValid();
  const email = process.env.ADMIN_EMAIL || 'admin@checker.local';
  const explicitPassword = process.env.ADMIN_PASSWORD;
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

// Finds the admin by their plain email, or — since a soft-deleted row's email is
// mangled to "<email> <id>" (softDelete.js) — by that mangled form, so a previously
// soft-deleted admin is restored in place instead of spawning a duplicate.
async function findExistingAdmin(prisma, email) {
  const active = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (active) return active;
  return prisma.user.findFirst({ where: { email: { startsWith: `${email} ` }, deletedAt: { not: null } } });
}

// mode: 'create' — always inserts a new user (caller must ensure none exist yet).
// mode: 'reset' — resets the named admin's credentials if they exist, else creates one.
export async function createOrResetAdmin(prisma, { label, mode }) {
  const { email, password, isExplicit } = resolveCredentials();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const data = {
    passwordHash,
    hasCredentials: true,
    mustChangePassword: !isExplicit, // an explicitly-chosen password doesn't need a forced change
    isActive: true,
  };

  const existing = mode === 'reset' ? await findExistingAdmin(prisma, email) : null;

  if (existing) {
    // Matching by email alone isn't proof this is the bootstrap admin — only ever
    // reset a row that already holds ADMIN, so this can't silently take over (and
    // promote) an unrelated account that happens to share the email.
    const roles = await prisma.userRoleAssignment.findMany({ where: { userId: existing.id } });
    if (!roles.some((r) => r.role === 'ADMIN')) {
      throw new Error(
        `A user with email ${email} already exists (id ${existing.id}) but does not hold the ADMIN role — ` +
          `refusing to silently grant it. This looks like an unrelated account, not the bootstrap admin. ` +
          `Resolve manually via Admin Configuration, or set ADMIN_EMAIL to the correct address.`
      );
    }
    if (existing.deletedAt) {
      data.email = email; // un-mangle back to the plain address on restore
      data.deletedAt = null;
    }
    await prisma.user.update({ where: { id: existing.id }, data });
  } else {
    await prisma.user.create({
      data: { name: 'Admin', email, ...data, roleAssignments: { create: [{ role: 'ADMIN' }] } },
    });
  }

  logResult(label, email, password, isExplicit);
}
