#!/usr/bin/env bash
# Production build for any Node + Postgres host (no DB access during build — see
# scripts/start.js, which runs at boot). Run this from room-check-app/ as the
# platform's build command, then use `node scripts/start.js` as the start command.
set -euo pipefail

echo "==> Switching Prisma provider to PostgreSQL for this build"
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "==> Installing dependencies (include devDependencies for frontend build)"
npm install --include=dev

echo "==> Generating Prisma client"
npx prisma generate --schema=prisma/schema.prisma

echo "==> Building frontend"
npm run build -w frontend

echo "==> Build complete"
