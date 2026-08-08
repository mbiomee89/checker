// Production bootstrap — run by scripts/start.js on first boot of an empty
// database, instead of prisma/seed.js. Creates ONLY the real checklist template
// and a single admin account — no demo camps/rooms/other users, and never the
// shared 'Password123!' that prisma/seed.js uses for local dev (that password
// is printed in this repo's own docs, so it must never end up in a real
// deployment). Shares its admin-credential logic with reset-admin-password.js
// (the "I missed the one-time log line" recovery path) via createOrResetAdmin
// below — keep them in sync.
import { PrismaClient } from '@prisma/client';
import { seedChecklistItems } from './checklistData.js';
import { createOrResetAdmin } from './adminBootstrap.js';

const prisma = new PrismaClient();

async function main() {
  await seedChecklistItems(prisma);

  const existingAdminCount = await prisma.user.count();
  if (existingAdminCount > 0) {
    console.log('[seed-prod] Users already exist — skipping admin bootstrap.');
    return;
  }

  await createOrResetAdmin(prisma, { label: 'seed-prod', mode: 'create' });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
