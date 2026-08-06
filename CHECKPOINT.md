# Checker — Agent Checkpoint

**Date:** 2026-08-06
**Product:** Checker (IKK Group room housekeeping inspections)
**Handoff purpose:** `room-check-app` is now a working full-stack app with Inspector + Camp Supervisor Dashboard flows real end-to-end. Continue with Admin Configuration and HSE Overview, then push to GitHub when ready.

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

**Frontend** (`room-check-app/frontend/src/`): Vite + Tailwind v4 (`@tailwindcss/vite`, no config file), Manrope/Inter/IBM Plex Mono fonts. Shell (`AppShell`/`MainNav`/`UserMenu`/`LoginPage`), Inspector Checklist (`RoomTable`/`InspectionForm`), and Camp Supervisor Dashboard (`CampSupervisorDashboard`/`SupervisorRoomList`) components **ported verbatim** from `my-project-design/product-plan/` (only change: local `string` id type annotations → `number` to match real API ids — no behavior change). `lib/auth.tsx`+`AuthProvider.tsx`, `api/client.ts` (401 → clear token + redirect), `shared/accessControl.ts` (role→home + nav filtering + route gating), `layouts/AppLayout.tsx` (RequireAuth + role-gated shell). Admin/HSE are still **intentionally simple placeholder frames** (not the full 1399/591-line designed dashboards) — see "Not done" below.

**Camp Supervisor Dashboard** (new this session): `GET /inspections/latest-by-room?campId=`, `GET/POST /corrective-actions`, `PATCH /corrective-actions/:id`, `GET /priority-flags` — all camp-scoped (`CAMP_SUPERVISOR` limited to `req.user.campId`, `ADMIN` unrestricted). `services/correctiveActions.js` implements the append-only log: every note or status change is prefixed `[date, author]: ` server-side (never trusts a client-supplied prefix) and appended, never overwritten — upsert on the `@@unique([roomId, checklistItemId, optionId])` finding key. No schema changes needed (Rev 9's `CorrectiveAction`/`PriorityFlag` already fit). Priority flags are read-only this round (toggling them is the inspector's "Supervisor Activity Review" screen, not built yet). `/dashboard` (charts + filter + corrective actions) and `/dashboard/rooms` (camp-locked room list) are both `CAMP_SUPERVISOR`-gated routes; "Report" buttons reuse the existing read-only `InspectionForm` view rather than a dedicated letterhead component (same simplification as the inspector's own "Report" button).

**Verified end-to-end in the browser** (Vite dev server on :5173 proxying to Express on :3001):
- INSPECTOR: login → rooms table (camp picker, search, status pills) → resume DRAFT → headcount/overcrowding banner → OK-exclusivity (selecting an issue clears OK) → save draft (PATCH round-trip confirmed) → submit → read-only view confirmed → room list shows "Submitted".
- CAMP_SUPERVISOR: dashboard renders real aggregated bar charts from both rooms' submitted inspections (including Furniture counts) → clicked a bar to filter → drill-down table showed the matching room → opened "Add note" on an existing finding, submitted through the real modal → append-only log grew correctly across repeated submissions (never overwrote prior entries) → room list screen works, camp-locked, no camp picker.
- Role gating verified both directions: HSE_VIEWER sees only "HSE Overview" nav and gets redirected off `/rooms`; CAMP_SUPERVISOR gets redirected off `/rooms` back to `/dashboard`.
- No console errors in any of the above.

**Seed data** (`room-check-app/prisma/seed.js`, idempotent): all 13 real checklist items + options (ported from `my-project-design` data.json, including Furniture's 3 COUNT-kind options), 2 camps (Arabian Gulf/Jeddah, Red Sea Coastal/Yanbu), 11 rooms, 4 login accounts (all password `Password123!`): `admin@checker.local`, `inspector@checker.local`, `supervisor@checker.local` (CAMP_SUPERVISOR, scoped to Arabian Gulf), `hse@checker.local`. Note: the dev DB now also has test data from manual verification (a submitted inspection each on rooms 401/404, one corrective action) — harmless, `dev.db` is gitignored.

---

## Not done / next steps

1. **Admin Configuration** — still an empty-state frame. The Design OS version (`AdminConfiguration.tsx`, 1399 lines) is a full CRUD screen (camps/rooms/users/checklist template tabs) — needs new backend CRUD endpoints for all four resources plus adapting its data contract, not a straight port.
2. **HSE Overview** — still an empty-state frame. Needs cross-camp aggregation endpoints (the Combined-scope charts, camp comparison panel, frequency-over-time drill-down) — `HSEOverview.tsx` is 591 lines and reuses the same chart/filter patterns as the Camp Supervisor Dashboard, so the backend aggregation logic from this session (`latest-by-room`, corrective actions, priority flags) should mostly generalize to "all camps" rather than needing to be rebuilt.
3. **Dedicated printable report component** — both the inspector's and the supervisor's "Report" buttons currently just open the existing read-only `InspectionForm` view instead of the designed letterhead/sign-off report (`InspectionReport.tsx`/`SupervisorInspectionReport.tsx`, not yet ported).
4. **Inspector's "Supervisor Activity Review" screen** — where priority flags get toggled by inspectors. Not built; priority flags are currently read-only everywhere.
5. **`requiresAction` matrix** — still deferred, needs stakeholder input.
6. **GitHub** — `git init` + commits done locally only. Push to `https://github.com/mbiomee89/checker.git` was explicitly deferred; do it as a separate, explicitly-confirmed step.
7. **Production config** — still SQLite/dev only; Postgres + Render deploy (`render.yaml` pattern from `D:\school project`) not started.

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
