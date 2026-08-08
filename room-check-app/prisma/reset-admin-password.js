// On-demand recovery: regenerates (or creates, if somehow missing) the admin
// account's credentials WITHOUT touching any other data. Run this anytime via
// your hosting platform's shell/exec feature (e.g. Render Shell, `railway run`,
// `fly ssh console`, a VPS's own shell) if the one-time first-boot password
// from prisma/seed-prod.js was missed:
//
//   node prisma/reset-admin-password.js
//
// Set ADMIN_EMAIL to target a specific account (default admin@checker.local)
// and/or ADMIN_PASSWORD to choose the new password yourself instead of getting
// a randomly generated one printed to the console.
import { PrismaClient } from '@prisma/client';
import { createOrResetAdmin } from './adminBootstrap.js';

const prisma = new PrismaClient();

createOrResetAdmin(prisma, { label: 'reset-admin-password', mode: 'reset' })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
