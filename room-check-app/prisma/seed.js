import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedChecklistItems } from './checklistData.js';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const CAMPS = [
  {
    name: 'Arabian Gulf',
    location: 'Jeddah',
    rooms: [
      { roomNumber: '401', approvedCapacity: 4 },
      { roomNumber: '404', approvedCapacity: 4 },
      { roomNumber: '412', approvedCapacity: 6 },
      { roomNumber: '422', approvedCapacity: 4 },
      { roomNumber: '443', approvedCapacity: 4 },
      { roomNumber: '456', approvedCapacity: 4 },
      { roomNumber: '461', approvedCapacity: 4 },
      { roomNumber: '418', approvedCapacity: 2 },
    ],
  },
  {
    name: 'Red Sea Coastal',
    location: 'Yanbu',
    rooms: [
      { roomNumber: '501', approvedCapacity: 4 },
      { roomNumber: '502', approvedCapacity: 4 },
      { roomNumber: '503', approvedCapacity: 6 },
    ],
  },
];

async function main() {
  await seedChecklistItems(prisma);

  // Camps + rooms — camp has no unique key besides id, so look up by name first
  const campsByName = {};
  for (const camp of CAMPS) {
    const created =
      (await prisma.camp.findFirst({ where: { name: camp.name } })) ??
      (await prisma.camp.create({ data: { name: camp.name, location: camp.location } }));
    campsByName[camp.name] = created;
    for (const room of camp.rooms) {
      await prisma.room.upsert({
        where: { campId_roomNumber: { campId: created.id, roomNumber: room.roomNumber } },
        update: { approvedCapacity: room.approvedCapacity },
        create: { campId: created.id, roomNumber: room.roomNumber, approvedCapacity: room.approvedCapacity },
      });
    }
  }

  // Users — idempotent via email unique; never overwrite an existing password.
  // Seeded demo accounts get real credentials immediately (hasCredentials/no forced
  // change) — that flow is only for admin-created users via generate-credentials.
  const passwordHash = await bcrypt.hash('Password123!', SALT_ROUNDS);
  const arabianGulf = campsByName['Arabian Gulf'];

  async function seedUser({ name, email, roles, campId }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing;
    return prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        campId: campId ?? null,
        hasCredentials: true,
        roleAssignments: { create: roles.map((role) => ({ role })) },
      },
    });
  }

  await seedUser({ name: 'Admin User', email: 'admin@checker.local', roles: ['ADMIN'] });
  await seedUser({ name: 'Mahmoud Atiya', email: 'inspector@checker.local', roles: ['INSPECTOR'] });
  await seedUser({
    name: 'Omar Al-Harbi',
    email: 'supervisor@checker.local',
    roles: ['CAMP_SUPERVISOR'],
    campId: arabianGulf.id,
  });
  await seedUser({ name: 'Layla Nasser', email: 'hse@checker.local', roles: ['HSE_VIEWER'] });
  // Multi-role demo account, proves the role switcher (UserMenu "Switch role") works end to end.
  await seedUser({ name: 'Fatima Noor', email: 'fatima@checker.local', roles: ['ADMIN', 'HSE_VIEWER'] });

  console.log('Seed complete.');
  console.log('Login with any of (password: Password123!):');
  console.log('  admin@checker.local (ADMIN)');
  console.log('  inspector@checker.local (INSPECTOR)');
  console.log('  supervisor@checker.local (CAMP_SUPERVISOR)');
  console.log('  hse@checker.local (HSE_VIEWER)');
  console.log('  fatima@checker.local (ADMIN + HSE_VIEWER, role switcher demo)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
