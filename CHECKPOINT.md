# Checker — Agent Checkpoint

**Date:** 2026-08-06
**Product:** Checker (IKK Group room housekeeping inspections)
**Handoff purpose:** All four roadmap sections plus every previously-deferred secondary screen are now built and verified — the app is feature-complete for v1 scope except two items that were explicitly left for a human (see "Not done"). Production deploy config is prepared but no live deploy has happened.

---

## Where things live

| Path | What |
|------|------|
| `D:\room check\` | Workspace root — git repo, pushed to GitHub |
| `D:\room check\schema.prisma` | Rev 10 Prisma schema (canonical — kept in sync with `room-check-app/prisma/schema.prisma`) |
| `D:\room check\my-project-design\` | Design OS clone (product planning + screen designs) — source of ported UI components |
| `D:\room check\room-check-app\` | **The real app.** Express 5 + Prisma 6.19 + SQLite (dev) / Postgres (prod, config-ready) backend, React 19 + Vite + Tailwind v4 frontend. |
| `https://github.com/mbiomee89/checker.git` | App repo — **connected**, `main` is the default branch |

**Git status:** commits pushed to `origin/main` through HSE Overview; this session's printable report / Supervisor Activity Review / production-config work is verified but **not yet committed** — do that next (see "Not done").

---

## Locked product decisions

- **Name:** Checker
- **Audience:** Internal IKK only (inspectors, camp supervisors, admins, HSE)
- **Stack (implemented):** npm workspaces (root/backend/frontend), Express 5, Prisma 6.19, SQLite in dev / Postgres in prod, React 19 + Vite 8 + Tailwind v4, JWT auth — mirrors `D:\school project` conventions
- **Online-only v1** (no offline/PWA)
- **Default clear option:** label **OK** (`isClearOption`) on TOGGLE-kind condition options; form pre-selects OK server-side at inspection creation
  - Exceptions: Cleanliness = rating scale (UI default **Good**, no OK); Furniture = `kind=COUNT` options with `InspectionResponseOption.count` (no OK, exempt from exclusivity)
- **`requiresAction` matrix:** still deferred — `requiresAction=false` on all seeded options; editable per-option in Admin Configuration's Checklist Template tab, but **intentionally left unfilled** — see "Not done", this needs a human with domain knowledge, not invented values
- **Roles:** INSPECTOR, CAMP_SUPERVISOR, ADMIN, HSE_VIEWER — a user may hold more than one role; the JWT's `activeRole` claim is whichever one they're currently acting as, switchable via the user menu
- **Inspection lifecycle:** DRAFT → SUBMITTED, enforced server-side (`requireRole('INSPECTOR')` + status checks); PATCH/photo endpoints reject once SUBMITTED
- **Priority flags:** INSPECTOR-only write (`POST`/`DELETE /priority-flags`), camp-wide (no per-room granularity), toggling off deletes the row (no history) — matches the schema header invariant

### Schema: Rev 10 (unchanged this session — Rev 9→10 details below for context)

- **Multi-role users**: `User.role` (singular) replaced with `UserRoleAssignment` (many-to-many join table). `User.campId` stays a direct single field.
- **Real temp-password flow**: `User.mustChangePassword`/`hasCredentials`. New users get an unguessable placeholder password until `generate-credentials` issues a real one; `POST /auth/change-password` clears the forced-change flag.
- `Camp.active` / `Room.active` (soft-delete) — retired camps/rooms disappear from inspector/supervisor-facing endpoints, stay visible (badged) in Admin Configuration.

---

## What's built and verified — all four sections + all secondary screens

**Inspector Checklist**: rooms table, DRAFT→SUBMIT lifecycle (OK-exclusivity, overcrowding warning, furniture counts, photos), **printable letterhead report** (see below), **Supervisor Activity Review** (see below).

**Camp Supervisor Dashboard**: findings charts, bar-click drill-down, corrective actions (append-only log, server-authored `[date, author]:` prefix), camp-locked room list.

**Admin Configuration**: full CRUD for camps/rooms (+ bulk range)/users/checklist template, multi-role assignment, temp-credential issuance.

**HSE Overview**: cross-camp read-only charts, Combined-vs-single-camp scope, frequency-over-time trend (`GET /hse/inspection-cycles`, buckets submitted inspections by camp+calendar-month).

**New this session — the last two "Not done" items from the previous checkpoint, now built:**

- **Printable inspection report** (`sections/inspector-checklist/components/InspectionReport.tsx`, ported from the design — the inspector's and supervisor's versions were near-identical duplicates in the design's per-section export convention, so **one shared component** is used from both roles' "Report" buttons instead of two copies). Route `/inspections/:id/report` (`pages/inspections/ReportPage.tsx`), reachable from both `pages/inspector/RoomsPage.tsx` and `pages/manager/RoomsPage.tsx`. Letterhead uses the original paper-form wording (`ORIGINAL_DESCRIPTIONS`, distinct from the shorter in-app labels) and `frontend/public/company-logo.jpg` (copied from the design). "Include corrective actions" checkbox populates the ACTION column from `GET /corrective-actions?campId=` (already role-agnostic for reads). Verified: logo loads, table renders correctly, `window.print()` button present.
- **Inspector's Supervisor Activity Review** (`sections/inspector-checklist/components/SupervisorActivityReview.tsx`), route `/rooms/activity` (`pages/inspector/ActivityReviewPage.tsx`, linked from `RoomsPage`) — any INSPECTOR can review any camp's findings/corrective-actions read-only via its own camp switcher, with one write capability: the flag-icon priority toggle. Backend: `POST`/`DELETE /priority-flags` added to `routes/priorityFlags.js`, `requireRole('INSPECTOR')`, upsert-or-noop on the existing `@@unique([campId, checklistItemId, optionId])`. Verified end-to-end: toggle flag on/off through the real UI, persists across reload, and **shows up on the Camp Supervisor Dashboard's flag marker for the same camp/finding** (cross-screen round-trip confirmed).
- **Production config, prepared but not deployed**: `room-check-app/render.yaml`, `scripts/render-build.sh` (sed's the schema to `postgresql` for the build only, local dev stays sqlite), `scripts/start.js` (validates `DATABASE_URL` shape with the same tested error messages as `D:\school project`, `prisma db push` without `--accept-data-loss`, seeds, boots). `backend/src/app.js` now serves `frontend/dist` as a SPA fallback when `NODE_ENV=production` (mirrors the reference project's exact pattern — hashed `/assets` cached forever, `index.html` no-cache, GET/HEAD-only fallback that skips `/api`, `/uploads`, `/health`). **No Render account was touched** — deploying is a separate, explicitly-confirmed step for whoever has account access.

**Seed data** (idempotent): 13 checklist items, 2 camps, 11 rooms, 5 accounts (password `Password123!`): `admin@checker.local`, `inspector@checker.local`, `supervisor@checker.local` (CAMP_SUPERVISOR/Arabian Gulf), `hse@checker.local`, `fatima@checker.local` (ADMIN + HSE_VIEWER, role-switcher demo).

---

## Not done — both require a human, not more building

1. **Commit + push this session's work** (report, activity review, production config) — verified but not yet committed. Do this first.
2. **Real `requiresAction` values** — the toggle exists in Admin Configuration's checklist option editor; no findings have been marked yet. Needs someone with IKK's operational knowledge to decide which findings should auto-open a `CorrectiveAction`. Do not invent values.
3. **Actually deploying to Render** — needs a Render account and someone to click through the Blueprint flow / paste the External Database URL. Config is ready (`render.yaml` + scripts), but this session has no account access and deploying is explicitly a separate confirmed action, not something to do proactively.

Everything else from earlier "Not done" lists is now built.

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

Or via Claude Code's Browser preview tool: `.claude/launch.json` has a `checker-app-frontend` config (port 5173) — the backend still needs to be started separately.

**To actually deploy** (not done yet): push to GitHub (already done), connect a Render account to the repo, apply `render.yaml` as a Blueprint, and follow the comments in that file (region-matching the web service and Postgres instance, pasting the External Database URL if the internal host is unreachable).

---

## Do not regress

- Do not reintroduce offline/PWA for v1
- Do not invent real `requiresAction` values without stakeholder input
- Keep OK as canonical clear option; preserve Cleanliness/Furniture exceptions
- `Inspection.campId` is server-set from `room.campId` only — never accept it from the client
- `requireAuth` re-fetches the user + `roleAssignments` from DB every request, validates the JWT's `activeRole` is still held
- New users get an unguessable placeholder password at creation — credentials only come from `generate-credentials`
- Retired camps/rooms (`active=false`) must stay excluded from inspector/supervisor-facing endpoints
- Priority flags are INSPECTOR-only to write, camp-wide, no history on removal — don't add per-room granularity or an edit history without a spec change
- The printable report is one shared component reused by both roles — don't fork it into two copies like the original design's per-section export did
- Don't deploy to Render without the user's explicit go-ahead — the config is prepared, not applied
