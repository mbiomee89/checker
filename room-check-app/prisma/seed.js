import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const CHECKLIST_ITEMS = [
  {
    sequenceNo: 1,
    name: 'Room cleanliness',
    inputType: 'SINGLE_SELECT',
    options: [
      { label: 'Excellent – Clean and well organized.', isClearOption: false, sortOrder: 1 },
      { label: 'Good – Clean with minor observations', isClearOption: false, sortOrder: 2 },
      { label: 'Fair – Slightly untidy, needs improvement', isClearOption: false, sortOrder: 3 },
      { label: 'Poor – Messy, poorly organized, unnecessary items present', isClearOption: false, sortOrder: 4 },
      { label: 'Unsatisfactory – Dirty, cluttered, overcrowded, unpleasant odor', isClearOption: false, sortOrder: 5 },
    ],
  },
  {
    sequenceNo: 2,
    name: 'Occupancy & Capacity',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'label not updated', isClearOption: false, sortOrder: 1 },
      { label: 'holder not fixed or damaged', isClearOption: false, sortOrder: 2 },
    ],
  },
  {
    sequenceNo: 3,
    name: 'Door',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'paint damaged', isClearOption: false, sortOrder: 1 },
      { label: 'damaged lock', isClearOption: false, sortOrder: 2 },
      { label: 'handle loose or damaged', isClearOption: false, sortOrder: 3 },
      { label: 'hinges loose', isClearOption: false, sortOrder: 4 },
      { label: 'The door frame has visible gaps', isClearOption: false, sortOrder: 5 },
    ],
  },
  {
    sequenceNo: 4,
    name: 'Windows & Screens',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'damaged screen net', isClearOption: false, sortOrder: 1 },
      { label: 'obstructed', isClearOption: false, sortOrder: 2 },
      { label: 'The window wheel is rusted and stuck', isClearOption: false, sortOrder: 3 },
      { label: 'window safety not available', isClearOption: false, sortOrder: 4 },
      { label: 'window track is dirty', isClearOption: false, sortOrder: 5 },
    ],
  },
  {
    sequenceNo: 5,
    name: 'Electrical Sockets',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'not working', isClearOption: false, sortOrder: 1 },
    ],
  },
  {
    sequenceNo: 6,
    name: 'Air Conditioner',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'W/leakage', isClearOption: false, sortOrder: 1 },
      { label: 'remote not working', isClearOption: false, sortOrder: 2 },
      { label: 'remote not functioning', isClearOption: false, sortOrder: 3 },
      { label: 'not cooling', isClearOption: false, sortOrder: 4 },
      { label: 'swing blades missed or loose', isClearOption: false, sortOrder: 5 },
    ],
  },
  {
    sequenceNo: 7,
    name: 'Wall & Ceiling Paint',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'wall touch up', isClearOption: false, sortOrder: 1 },
      { label: 'paint mould noticed', isClearOption: false, sortOrder: 2 },
      { label: 'ceiling touch up', isClearOption: false, sortOrder: 3 },
      { label: 'full paint', isClearOption: false, sortOrder: 4 },
    ],
  },
  {
    sequenceNo: 8,
    name: 'Lighting & Switch',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: '1 light not working', isClearOption: false, sortOrder: 1 },
      { label: '2 light not working', isClearOption: false, sortOrder: 2 },
      { label: '3 light not working', isClearOption: false, sortOrder: 3 },
      { label: 'light switch damaged', isClearOption: false, sortOrder: 4 },
    ],
  },
  {
    sequenceNo: 9,
    name: 'Smoke Detector & Sprinkler',
    inputType: 'SINGLE_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'Not Working', isClearOption: false, sortOrder: 1 },
      { label: 'Not Installed', isClearOption: false, sortOrder: 2 },
    ],
  },
  {
    sequenceNo: 10,
    name: 'Insects & Pest Control',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'german cockroach', isClearOption: false, sortOrder: 1 },
      { label: 'bed bugs', isClearOption: false, sortOrder: 2 },
    ],
  },
  {
    sequenceNo: 11,
    name: 'Furniture',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'Single bed', isClearOption: false, sortOrder: 1, kind: 'COUNT' },
      { label: 'Bunk bed', isClearOption: false, sortOrder: 2, kind: 'COUNT' },
      { label: 'Cupboard', isClearOption: false, sortOrder: 3, kind: 'COUNT' },
      { label: 'need bed barrier', isClearOption: false, sortOrder: 4 },
      { label: 'need bed ladder', isClearOption: false, sortOrder: 5 },
      { label: 'cupboard need repair', isClearOption: false, sortOrder: 6 },
    ],
  },
  {
    sequenceNo: 12,
    name: 'Violations',
    inputType: 'MULTI_SELECT',
    options: [
      { label: 'OK', isClearOption: true, sortOrder: 0 },
      { label: 'Room Crowded', isClearOption: false, sortOrder: 1 },
      { label: 'Lack of cleanliness inside room', isClearOption: false, sortOrder: 2 },
      { label: 'Smoking inside rooms', isClearOption: false, sortOrder: 3 },
      { label: 'Using Carpets in room', isClearOption: false, sortOrder: 4 },
      { label: 'Storing Food inside room', isClearOption: false, sortOrder: 5 },
      { label: 'Using Electricity cord attached to bed and keeping above mattress', isClearOption: false, sortOrder: 6 },
      { label: 'Using of microwaves, hotplates & ovens inside room', isClearOption: false, sortOrder: 7 },
      { label: 'Keep A/C working without person inside', isClearOption: false, sortOrder: 8 },
      { label: 'using kettle', isClearOption: false, sortOrder: 9 },
      { label: 'using bin inside the room', isClearOption: false, sortOrder: 10 },
      { label: 'using Incense sticks', isClearOption: false, sortOrder: 11 },
      { label: 'using unsafe extension cords (joined and without plug)', isClearOption: false, sortOrder: 12 },
      { label: 'nailing hangers on door and walls', isClearOption: false, sortOrder: 13 },
      { label: 'using sticky hangers on door and walls', isClearOption: false, sortOrder: 14 },
      { label: 'Hanging posters on the wall, windows and doors, and using adhesive tapes', isClearOption: false, sortOrder: 15 },
      { label: 'Storing cooking utensils', isClearOption: false, sortOrder: 16 },
      { label: 'gathering waste behind the door', isClearOption: false, sortOrder: 17 },
      { label: 'using additional/wooden furniture', isClearOption: false, sortOrder: 18 },
      { label: 'using extension cords during day hours', isClearOption: false, sortOrder: 19 },
    ],
  },
  {
    sequenceNo: 13,
    name: 'Additional Notes',
    inputType: 'TEXT',
    options: [],
  },
];

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
  // Checklist items + options — idempotent via sequenceNo / (checklistItemId, label) uniques
  for (const item of CHECKLIST_ITEMS) {
    const checklistItem = await prisma.checklistItem.upsert({
      where: { sequenceNo: item.sequenceNo },
      update: { name: item.name, inputType: item.inputType },
      create: { sequenceNo: item.sequenceNo, name: item.name, inputType: item.inputType },
    });
    for (const option of item.options) {
      await prisma.checklistItemOption.upsert({
        where: { checklistItemId_label: { checklistItemId: checklistItem.id, label: option.label } },
        update: {
          sortOrder: option.sortOrder,
          isClearOption: option.isClearOption,
          kind: option.kind ?? 'TOGGLE',
        },
        create: {
          checklistItemId: checklistItem.id,
          label: option.label,
          sortOrder: option.sortOrder,
          isClearOption: option.isClearOption,
          kind: option.kind ?? 'TOGGLE',
        },
      });
    }
  }

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
