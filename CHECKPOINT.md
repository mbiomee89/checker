# Checker — Agent Checkpoint

**Date:** 2026-08-06
**Product:** Checker (IKK Group room housekeeping inspections)
**Handoff purpose:** All four roadmap sections plus every previously-deferred secondary screen are now built and verified — the app is feature-complete for v1 scope except two items that were explicitly left for a human (see "Not done"). Production deploy config is prepared but no live deploy has happened. This session also added an Admin **Recycle Bin** (soft-delete for camps/rooms/users) on top of that.

---

## Where things live

| Path | What |
|------|------|
| `D:\room check\` | Workspace root — git repo, pushed to GitHub |
| `D:\room check\schema.prisma` | Rev 11 Prisma schema (canonical — kept in sync with `room-check-app/prisma/schema.prisma`) |
| `D:\room check\my-project-design\` | Design OS clone (product planning + screen designs) — source of ported UI components |
| `D:\room check\room-check-app\` | **The real app.** Express 5 + Prisma 6.19 + SQLite (dev) / Postgres (prod, config-ready) backend, React 19 + Vite + Tailwind v4 frontend. |
| `https://github.com/mbiomee89/checker.git` | App repo — **connected**, `main` is the default branch |

**Git status:** commits pushed to `origin/main` through the printable report / Supervisor Activity Review / production-config / nav-restructuring work. This session's Recycle Bin feature is verified and is being committed now.

---

## Locked product decisions

- **Name:** Checker
- **Audience:** Internal IKK only (inspectors, camp supervisors, admins, HSE)
- **Stack (implemented):** npm workspaces (root/backend/frontend), Express 5, Prisma 6.19, SQLite in dev / Postgres in prod, React 19 + Vite 8 + Tailwind v4, JWT auth — mirrors `D:\school project` conventions
- **Online-only v1** (no offline/PWA)
- **No default selection on a new inspection** (changed this session — was: pre-select OK): every checklist item starts with an empty `selectedOptionIds`/no rating, including Room Cleanliness (no more default "Good"). The inspector must actively choose every finding. `isClearOption`/"OK" still exists as a selectable option and still governs toggle exclusivity (selecting OK clears other findings on that item and vice versa) — only the *pre-selection at creation* was removed. See `backend/src/services/inspections.js`'s `seedDefaultResponses`.
  - Exceptions (unchanged): Furniture = `kind=COUNT` options with `InspectionResponseOption.count`, exempt from OK exclusivity, always started blank anyway.
- **`requiresAction` matrix:** still deferred — `requiresAction=false` on all seeded options; editable per-option in Admin Configuration's Checklist Template tab, but **intentionally left unfilled** — see "Not done", this needs a human with domain knowledge, not invented values
- **Roles:** INSPECTOR, CAMP_SUPERVISOR, ADMIN, HSE_VIEWER — a user may hold more than one role; the JWT's `activeRole` claim is whichever one they're currently acting as, switchable via the user menu
- **Inspection lifecycle:** DRAFT → SUBMITTED, enforced server-side (`requireRole('INSPECTOR')` + status checks); PATCH/photo endpoints reject once SUBMITTED
- **Priority flags:** INSPECTOR-only write (`POST`/`DELETE /priority-flags`), camp-wide (no per-room granularity), toggling off deletes the row (no history) — matches the schema header invariant

### Schema: Rev 11 (Rev 9→10→11 details below for context)

- **Multi-role users**: `User.role` (singular) replaced with `UserRoleAssignment` (many-to-many join table). `User.campId` stays a direct single field.
- **Real temp-password flow**: `User.mustChangePassword`/`hasCredentials`. New users get an unguessable placeholder password until `generate-credentials` issues a real one; `POST /auth/change-password` clears the forced-change flag.
- `Camp.active` / `Room.active` (soft-delete/retire) — retired camps/rooms disappear from inspector/supervisor-facing endpoints, stay visible (badged) in Admin Configuration.
- **Rev 11 — Recycle Bin**: `Camp.deletedAt` / `Room.deletedAt` / `User.deletedAt` (all `DateTime?`, default null). Deleting through the admin UI never removes a row — it sets `deletedAt` and (for `Room.roomNumber` / `User.email`) mangles the unique identifying field via `backend/src/services/softDelete.js` (`mangle(value, id) => "${value} ${id}"`, reversible with `unmangle`) so the original value is immediately free for a brand-new entity to reuse, while every FK with `onDelete: Restrict` (`Inspection.room`, `Inspection.inspector`, etc.) stays satisfied since the row still exists. Restoring un-mangles the field and clears `deletedAt`.

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

**New this session — Admin Recycle Bin** (delete camp/room/user from the admin panel, without losing history):

- User's own design, confirmed via AskUserQuestion: delete moves the row to a "Recycle Bin" (`deletedAt` set) rather than actually removing it, and the identifying field (`Room.roomNumber` / `User.email`) is mangled so the value is immediately reusable by a new entity. Nothing is ever hard-deleted, so `Inspection.room`/`Inspection.inspector`'s `onDelete: Restrict` never comes into play and all historical inspections/reports keep resolving correctly.
- **Two-step safety rail (my addition, flagged to the user via the plan, not silent)**: Delete is only enabled once an entity is already **Retired** (`active=false`) — enforced as a disabled+tooltipped button client-side and a 400 server-side. Retire and Delete are deliberately separate actions.
- **Type-to-confirm** required before any delete executes (per the user's confirmed preference) — the admin must type the camp's name / room number / user's email exactly into `DeleteConfirmModal` before the button enables.
- Backend, one symmetric set of additions per resource (`routes/adminCamps.js`, `adminRooms.js`, `adminUsers.js`, all still behind `requireAuth` + `requireRole('ADMIN')`): `GET /` now filters `deletedAt: null`; new `GET /deleted`; new `DELETE /:id` (400 if still active, 400 on confirm-text mismatch, mangles + sets `deletedAt`); new `POST /:id/restore` (un-mangles, 409 on collision with a newer active row using the same value). Camps additionally 409 if they still have non-deleted rooms/users under them (no orphan-looking children under a hidden camp). Users additionally: 403 on self-delete, and a **new self-deactivation guard** on the pre-existing `PATCH /admin/users/:id/active` (403 if an admin tries to deactivate their own account) — added reactively after a real self-lockout was hit and fixed during testing (see below).
- Frontend: `sections/admin-configuration/types.ts` gained `DeletedCamp`/`DeletedRoom`/`DeletedUser` + a `'recycle-bin'` `AdminTab`; `AdminConfiguration.tsx` gained a red "Delete" button per row (Camps/Rooms/Users tabs), the `DeleteConfirmModal`, and a new `RecycleBinTab` with grouped Restore lists; `api/adminCamps.ts` / `adminRooms.ts` / `adminUsers.ts` gained `listDeleted*`/`delete*`/`restore*`; `pages/admin/AdminPage.tsx` fetches the three deleted-lists alongside the existing four and wires the six new callbacks with the same `await mutate(); await reload();` pattern used everywhere else in that file.
- **Verified end-to-end** (curl + browser): active-entity delete blocked (400); wrong confirm text blocked (400); correct delete moves the row to `/deleted` and off the main list; a brand-new room/user created with the *same* room number / email as a just-deleted one succeeds (proves the mangling freed it up); restore brings the original value back; restoring into a numbering collision returns 409 and leaves the item safely still in the Recycle Bin; camp delete blocked while it still has rooms/users (409); self-delete blocked (403); self-deactivation blocked (403).

**Seed data** (`prisma/seed.js`, idempotent, unchanged): 13 checklist items, 2 camps, 11 rooms, 5 accounts (password `Password123!`): `admin@checker.local`, `inspector@checker.local`, `supervisor@checker.local` (CAMP_SUPERVISOR/Arabian Gulf), `hse@checker.local`, `fatima@checker.local` (ADMIN + HSE_VIEWER, role-switcher demo). Running `node prisma/seed.js` still recreates all of this from scratch.

**Local dev DB was wiped this session** via new `scripts/reset-data.js` (run with `node scripts/reset-data.js` from `room-check-app/`) — the user asked to clear all demo/seed content and start the admin panel from a clean slate before entering real data. It deletes every Camp/Room/Inspection/CorrectiveAction/PriorityFlag and every User except `admin@checker.local`, but **deliberately keeps the checklist template** (`ChecklistItem`/`ChecklistItemOption`) since those are the real inspection questions, not demo content — confirmed via AskUserQuestion before running. Right now the dev DB has only the checklist template + one admin login; no camps/rooms/other users exist until re-added through Admin Configuration (or by rerunning `prisma/seed.js`, which is unaffected by this script and will recreate the demo data on top of whatever's there).

---

## Not done — both require a human, not more building

1. **Real `requiresAction` values** — the toggle exists in Admin Configuration's checklist option editor; no findings have been marked yet. Needs someone with IKK's operational knowledge to decide which findings should auto-open a `CorrectiveAction`. Do not invent values.
2. **Actually deploying to Render** — needs a Render account and someone to click through the Blueprint flow / paste the External Database URL. Config is ready (`render.yaml` + scripts), but this session has no account access and deploying is explicitly a separate confirmed action, not something to do proactively.

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
