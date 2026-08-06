// One-off maintenance script: wipes all demo/seed content except the checklist
// template (the real inspection questions, not test data) and one admin account,
// so the app can go live with real camps/rooms/users entered through Admin
// Configuration instead of the seeded demo data.
//
// Run with: node prisma/../scripts/reset-data.js  (from room-check-app/)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const KEEP_ADMIN_EMAIL = 'admin@checker.local';

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: KEEP_ADMIN_EMAIL } });
  if (!admin) {
    throw new Error(`No user found with email ${KEEP_ADMIN_EMAIL} — aborting, nothing deleted.`);
  }

  // Children of Inspection first (cascade would handle this, but be explicit).
  await prisma.inspectionResponseOption.deleteMany({});
  await prisma.inspectionResponse.deleteMany({});
  await prisma.inspectionResident.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.inspection.deleteMany({});

  await prisma.correctiveAction.deleteMany({});
  await prisma.priorityFlag.deleteMany({}); // must go before deleting Users (flaggedBy is onDelete: Restrict)

  await prisma.user.deleteMany({ where: { id: { not: admin.id } } });
  await prisma.room.deleteMany({});
  await prisma.camp.deleteMany({});

  console.log('Reset complete. Kept checklist template and this account:');
  console.log(`  ${admin.email} (id ${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
