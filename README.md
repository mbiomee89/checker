# Checker — IKK Group Room Housekeeping Inspections

Checker is an internal inspection app for IKK Group labor camps. Inspectors fill out a
per-room checklist (mirrors the original paper form), camp supervisors track findings and
corrective actions, admins manage camps/rooms/users/the checklist template, and HSE gets
read-only cross-camp dashboards.

**The app lives entirely in [`room-check-app/`](room-check-app/).** Everything else at the
repo root (`*.docx`, `*.xlsx`, `my-project-design/`) is original planning material and a
design-mockup tool used to build the app — not part of the running product, and not
something a deploy needs.

## Stack

- Backend: Express 5 + Prisma 6 ORM
- Database: SQLite in local dev, PostgreSQL in production
- Frontend: React 19 + Vite + Tailwind CSS v4
- Auth: JWT, multi-role (a user can hold more than one of INSPECTOR / CAMP_SUPERVISOR /
  ADMIN / HSE_VIEWER, switchable at login)

## Local development

```bash
cd room-check-app
npm install
cp .env.example .env                                     # fill in JWT_SECRET, etc.
npx prisma migrate dev --schema=prisma/schema.prisma      # first time only
node prisma/seed.js                                       # demo data — idempotent, safe to rerun
npm run backend:dev                                        # Express on :3001
npm run frontend                                            # Vite on :5173 (proxies /api, /uploads to :3001)
```

Demo accounts (password `Password123!` for all): `admin@checker.local`,
`inspector@checker.local`, `supervisor@checker.local`, `hse@checker.local`,
`fatima@checker.local` (holds both ADMIN and HSE_VIEWER, demonstrates the role switcher).

## Production build & deploy

No hosting platform has been chosen yet — the app is written to be host-agnostic (plain
Node process + a Postgres database), not tied to any specific PaaS. Whoever deploys it
needs:

1. A **PostgreSQL database** — any provider works. Get its connection string.
2. A **Node 20+ runtime** that can run a persistent process (not serverless functions —
   this is a long-running Express server) and reach that Postgres database.
3. Environment variables set on that runtime:
   - `DATABASE_URL` — the Postgres connection string (`postgresql://user:pass@host/db`)
   - `JWT_SECRET` — a long random string
   - `JWT_EXPIRES_IN` — e.g. `8h`
   - `NODE_ENV=production`
   - `UPLOAD_DIR` — e.g. `./backend/uploads` (see the storage note below)
   - `CORS_ORIGIN` — optional, comma-separated allowlist; only needed if the frontend is
     served from a different origin than the API (this app serves both from the same
     process by default, so usually leave unset)
4. **Build command**: `scripts/build.sh` (run from `room-check-app/`) — installs
   dependencies, switches the Prisma schema to the `postgresql` provider for the build,
   generates the Prisma client, and builds the frontend.
5. **Start command**: `node scripts/start.js` (run from `room-check-app/`) — validates
   `DATABASE_URL`, applies the schema with `prisma db push` (deliberately not
   `--accept-data-loss`, so it refuses to silently drop data on a schema conflict), seeds
   demo data **only if the database is empty**, then boots the API. The Express server
   also serves the built frontend and falls back to `index.html` for client-side routes,
   so one process is all that's needed — no separate static host.
6. **Health check**: `GET /health` returns `{"ok": true}` — wire this up if the host
   supports a health-check path.

**Known limitation to plan around**: uploaded inspection photos are written to
`UPLOAD_DIR` on local disk. If the hosting platform's filesystem isn't persistent across
restarts/redeploys (common on several PaaS free tiers), uploaded photos will be lost when
that happens. If that matters for the deploy target, use a platform with a persistent disk
or add object storage (e.g. S3-compatible) before going live — this isn't wired up yet.

## More context

[`CHECKPOINT.md`](CHECKPOINT.md) has the full build history, every locked product
decision, what's deliberately left unfinished (and why), and things to watch out for when
extending the app. Worth reading before making non-trivial changes.
