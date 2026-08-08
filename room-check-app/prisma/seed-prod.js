// Production bootstrap — run by scripts/start.js on first boot of an empty
// database, instead of prisma/seed.js. Creates ONLY the real checklist template
// and a single admin account with a randomly generated password — no demo
// camps/rooms/other users, and never the shared 'Password123!' that prisma/seed.js
// uses for local dev (that password is printed in this repo's own docs, so it
// must never end up in a real deployment).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedChecklistItems } from './checklistData.js';
import { generateTempPassword } from '../backend/src/services/users.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function main() {
  await seedChecklistItems(prisma);

  const existingAdminCount = await prisma.user.count();
  if (existingAdminCount > 0) {
    console.log('[seed-prod] Users already exist — skipping admin bootstrap.');
    return;
  }

  const email = process.env.ADMIN_EMAIL || 'admin@checker.local';
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  await prisma.user.create({
    data: {
      name: 'Admin',
      email,
      passwordHash,
      hasCredentials: true,
      mustChangePassword: true, // forced to set a real password on first login
      roleAssignments: { create: [{ role: 'ADMIN' }] },
    },
  });

  console.log('\n=================================================================');
  console.log('[seed-prod] First-boot admin account created:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${tempPassword}`);
  console.log('This password is shown ONLY here, ONLY once. Log in immediately —');
  console.log('the app will force a real password to be set before anything else');
  console.log('is usable. Set ADMIN_EMAIL to override the email next time you');
  console.log('bootstrap a fresh database.');
  console.log('=================================================================\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
