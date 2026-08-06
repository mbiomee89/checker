# Checker — Agent Checkpoint

**Date:** 2026-08-06
**Product:** Checker (IKK Group room housekeeping inspections)
**Handoff purpose:** `room-check-app` is now a working full-stack app (backend + frontend, real DB). Continue with Manager/Admin/HSE CRUD, then push to GitHub when ready.

---

## Where things live

| Path | What |
|------|------|
| `D:\room check\` | Workspace root — now a git repo (local only, no remote yet) |
| `D:\room check\schema.prisma` | Rev 9 Prisma schema (canonical — kept in sync with `room-check-app/prisma/schema.prisma`) |
| `D:\room check\my-project-design\` | Design OS clone (product planning + screen designs) — source of ported UI components |
| `D:\room check\room-check-app\` | **The real app.** Express 5 + Prisma 6.19 + SQLite backend, React 19 + Vite + Tailwind v4 frontend. Fully working: login, rooms, inspection DRAFT→SUBMIT lifecycle, photo upload. |
| `https://github.com/mbiomee89/checker.git` | Target app repo — **not yet connected**; local git only per this session's decision |

**Git status:** `D:\room check` was `git init`'d this session, one local commit made, no `origin` remote configured.

---

## Locked product decisions

- **Name:** Checker
- **Audience:** Internal IKK only (inspectors, camp supervisors, admins, HSE)
- **Stack (implemented):** npm workspaces (root/backend/frontend), Express 5, Prisma 6.19/SQLite (dev), React 19 + Vite 8 + Tailwind v4, JWT auth — mirrors `D:\school project` conventions
- **Online-only v1** (no offline/PWA)
- **Default clear option:** label **OK** (`isClearOption`) on TOGGLE-kind condition options; form pre-selects OK server-side at inspection creation
  - Exceptions: Cleanliness = rating scale (UI default **Good**, no OK); Furniture = `kind=COUNT` options with `InspectionResponseOption.count` (no OK, exempt from exclusivity) — **new in Rev 9**, added this session with user approval
- **`requiresAction` matrix:** still deferred — `requiresAction=false` on all seeded options
- **Roles:** INSPECTOR, CAMP_SUPERVISOR, ADMIN, HSE_VIEWER (schema uses `CAMP_SUPERVISOR`, not `MANAGER` — earlier checkpoints were stale on this)
- **Inspection lifecycle:** DRAFT → SUBMITTED, enforced server-side (`requireRole('INSPECTOR')` + status checks); PATCH/photo endpoints reject once SUBMITTED

### Schema changes made this session (Rev 8 → Rev 9)

- Added `ChecklistItemOptionKind` enum (`TOGGLE`/`COUNT`, default `TOGGLE`) on `ChecklistItemOption`
- Added `InspectionResponseOption.count` (nullable Int) for Furniture-style inventory quantities
- Added `InspectionResponse.textValue` for TEXT-type items (e.g. "Additional Notes"), separate from `commentText`
- **Changed `Photo` to belong directly to `Inspection`** (not `InspectionResponse`) — the design's whole-visit photo model (max 4 per inspection, not per checklist item) didn't fit the old per-response relation

---

## What's built and verified (this session)

**Backend** (`room-check-app/backend/src/`): `app.js`/`server.js` (Express factory mirroring school-project conventions, dual route mounting for dev Vite proxy), `middleware/{auth,upload,validate}.js` (JWT + DB re-fetch + `isActive` check every request, multer + magic-byte photo sniffing), `routes/{auth,camps,rooms,checklistItems,inspections}.js`, `services/inspections.js` (default-response seeding, serialization). Verified via curl: login, role gating (ADMIN correctly blocked from creating inspections), camps/rooms/checklist-items listing, full inspection lifecycle (create → PATCH headcount/residents/furniture-counts/comments → photo upload with real magic-byte validation → submit → PATCH-after-submit correctly 409s), static photo serving.

**Frontend** (`room-check-app/frontend/src/`): Vite + Tailwind v4 (`@tailwindcss/vite`, no config file), Manrope/Inter/IBM Plex Mono fonts. Shell (`AppShell`/`MainNav`/`UserMenu`/`LoginPage`) and Inspector Checklist (`RoomTable`/`InspectionForm`) components **ported verbatim** from `my-project-design/product-plan/` (only change: local `string` id type annotations → `number` to match real API ids — no behavior change). `lib/auth.tsx`+`AuthProvider.tsx`, `api/client.ts` (401 → clear token + redirect), `shared/accessControl.ts` (role→home + nav filtering + route gating), `layouts/AppLayout.tsx` (RequireAuth + role-gated shell). Manager/Admin/HSE are **intentionally simple placeholder frames** (not the full 600–1400 line designed dashboards, which expect a different mock data shape) — see "Not done" below.

**Verified end-to-end in the browser** (Vite dev server on :5173 proxying to Express on :3001): login as INSPECTOR → rooms table (camp picker, search, status pills) → resume DRAFT → headcount/overcrowding banner → OK-exclusivity (selecting an issue clears OK) → save draft (PATCH round-trip confirmed) → submit → read-only view confirmed → room list shows "Submitted". Role gating verified: HSE_VIEWER sees only "HSE Overview" nav, direct `/rooms` navigation redirects them home. No console errors.

**Seed data** (`room-check-app/prisma/seed.js`, idempotent): all 13 real checklist items + options (ported from `my-project-design` data.json, including Furniture's 3 COUNT-kind options), 2 camps (Arabian Gulf/Jeddah, Red Sea Coastal/Yanbu), 11 rooms, 4 login accounts (all password `Password123!`): `admin@checker.local`, `inspector@checker.local`, `supervisor@checker.local` (CAMP_SUPERVISOR, scoped to Arabian Gulf), `hse@checker.local`.

---

## Not done / next steps

1. **Manager/Admin/HSE real functionality** — currently empty-state frames only. The Design OS versions (`CampSupervisorDashboard.tsx` 635 lines, `AdminConfiguration.tsx` 1399 lines, `HSEOverview.tsx` 591 lines) are full designs but assume a different mock data shape than the real API returns — porting them needs new backend endpoints (submitted-inspections list, corrective actions CRUD, checklist/user/room admin CRUD, cross-camp HSE aggregates) plus adapting each component's data contract, not a straight copy like the shell/inspector pieces were.
2. **Corrective actions & priority flags** — schema models exist (`CorrectiveAction`, `PriorityFlag`) but no routes/UI yet. Needed before the report's ACTION column or the HSE/Manager dashboards can be real.
3. **`requiresAction` matrix** — still deferred, needs stakeholder input.
4. **GitHub** — `git init` + first commit done locally only. Push to `https://github.com/mbiomee89/checker.git` was explicitly deferred this session; do it as an separate, explicitly-confirmed step.
5. **Production config** — still SQLite/dev only; Postgres + Render deploy (`render.yaml` pattern from `D:\school project`) not started.

---

## How to run

```bash
cd "D:\room check\room-check-app"
npm install                          # first time only
npx prisma migrate dev --schema=prisma/schema.prisma   # first time only
node prisma/seed.js                  # first time only (idempotent, safe to rerun)
npm run backend:dev                  # Express on :3001
npm run frontend                     # Vite on :5173 (proxies /api and /uploads to :3001)
```
Copy `.env.example` to `.env` first if `.env` doesn't exist (JWT_SECRET etc.).

Or via Claude Code's Browser preview tool: `.claude/launch.json` has a `checker-app-frontend` config (port 5173) — the backend still needs to be started separately (not wired into a launch config yet since it has no `url` for preview_start to attach to a non-browser process).

---

## Do not regress

- Do not reintroduce offline/PWA for v1
- Do not invent full `requiresAction` matrix without stakeholder input
- Keep OK as canonical clear option; preserve Cleanliness/Furniture exceptions (now schema-backed via `kind`/`count`)
- `Inspection.campId` is server-set from `room.campId` only — never accept it from the client (enforced in `routes/inspections.js` POST handler)
- `requireAuth` re-fetches the user from DB every request and rejects `isActive=false` — don't switch to trusting the JWT payload alone
