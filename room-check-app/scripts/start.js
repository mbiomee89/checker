/**
 * Production start (any Node + Postgres host): validate DATABASE_URL, push
 * schema, seed, then boot API. Avoids a cryptic Prisma P1001 when DATABASE_URL
 * is missing/malformed. Run `scripts/build.sh` first as the platform's build
 * step, then run this as the start command.
 *
 * Schema apply: prefer `prisma migrate deploy` once a baseline migration exists
 * for both sqlite (local) and postgres (schema.prisma's provider is switched to
 * postgresql at build time by scripts/build.sh). Until then, `db push` WITHOUT
 * `--accept-data-loss` to avoid silent drops.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg) {
  console.error(`\n[start] ${msg}\n`);
  process.exit(1);
}

function describeDatabaseUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    fail(
      'DATABASE_URL is missing. Set it in your hosting platform\'s environment variables to your Postgres connection string.'
    );
  }

  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(
      `DATABASE_URL is not a valid URL (got: ${JSON.stringify(raw.slice(0, 40))}…). Paste the full Postgres connection string (starts with postgresql://).`
    );
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    fail(`DATABASE_URL must start with postgresql:// (got protocol ${url.protocol})`);
  }

  const host = url.hostname;
  if (!host || host === 'postgresql' || host === 'postgres' || host === 'localhost') {
    fail(
      `DATABASE_URL hostname looks wrong: "${host}". Use the real Postgres host your provider gives you, e.g. postgresql://USER:PASS@your-db-host.example.com/DBNAME`
    );
  }

  console.log(`[start] Database host: ${host}:${url.port || '5432'}`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Only bootstrap with prisma/seed.js on a genuinely empty database. seed.js's upserts
// are idempotent for *creation* but their `update:` blocks overwrite ChecklistItem/
// ChecklistItemOption fields back to hardcoded seed values — running it on every boot
// would silently revert any admin edits made through Admin Configuration after a redeploy.
async function hasExistingData() {
  const prisma = new PrismaClient();
  try {
    return (await prisma.checklistItem.count()) > 0;
  } finally {
    await prisma.$disconnect();
  }
}

describeDatabaseUrl(process.env.DATABASE_URL);

// No --accept-data-loss: refuse destructive schema drift rather than wipe data.
console.log('[start] prisma db push…');
run('npx', ['prisma', 'db', 'push', '--schema=prisma/schema.prisma']);

if (await hasExistingData()) {
  console.log('[start] Data already present — skipping seed (would overwrite admin edits).');
} else {
  console.log('[start] Empty database — seeding…');
  run('node', ['prisma/seed.js']);
}

console.log('[start] API…');
run('node', ['backend/src/server.js']);
