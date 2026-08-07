# Checker — Agent Checkpoint

**Date:** 2026-08-07
**Product:** Checker (IKK Group room housekeeping inspections)
**Handoff purpose:** All four roadmap sections plus every previously-deferred secondary screen are now built and verified — the app is feature-complete for v1 scope except two items that were explicitly left for a human (see "Not done"). Production deploy config is prepared but no live deploy has happened. This session also added an Admin **Recycle Bin** (soft-delete for camps/rooms/users), then fixed a round of findings from the user's team's code review — most notably a real IDOR on draft inspections.

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

**`scripts/reset-data.js`** (added this session, run once via `node scripts/reset-data.js` from `room-check-app/`) — wipes all demo camps/rooms/users/inspections/history but keeps the checklist template and the `admin@checker.local` account, for starting the admin panel from a clean slate before entering real data. Was run once mid-session per explicit request; `node prisma/seed.js` was then rerun afterward (unaffected by this script) to restore demo data for testing the review fixes below — **the dev DB currently has the full seed data back in it**, not the wiped state.

---

## Code-review fix pass (this session)

The user's team reviewed the app and reported findings across Critical/Medium/Minor. Every finding was read and verified against the code (not assumed) before fixing. Two decisions were confirmed with the user first: the submit-completeness rule is **"every checklist item must have a response"** (not just headcount), and the deploy/infra-only findings (`render.yaml` placement, `db push` vs migrations, ephemeral uploads on Render's free tier) are **held for when deployment actually happens**, matching the existing decision that deploying is a separate confirmed step.

**Fixed — Critical:**
- **Draft ownership IDOR** (`routes/inspections.js`) — any inspector could view/edit/submit/photo *any other inspector's* DRAFT, and `POST /inspections` handed over any room's open draft regardless of who created it. Added `assertOwnsDraft` (checked on GET/PATCH/submit/photo-upload/photo-delete); `POST /` now 409s ("already has an inspection in progress by another inspector") if a *different* inspector already holds the room's open draft, instead of resuming it.
- **Blank submit allowed** — `POST /inspections/:id/submit` now 400s listing every unanswered active checklist item by name before allowing `SUBMITTED`; `isItemAnswered`/`unansweredItemNames` (`services/inspections.js` / mirrored in `InspectionForm.tsx`) treat TEXT items as always-optional and everything else as answered once it has at least one selected option or count. The Submit button is now disabled client-side with a live "still needs a response" banner naming the missing items — server is still the enforced boundary.
- **`requiresAction` unused on submit** — now wired: on submit, every selected TOGGLE option with `requiresAction=true` opens (or, if one already exists for that exact room+item+option, appends a note to) a `CorrectiveAction`, reusing the existing `appendNote`/`logPrefix` append-only convention. Still inert in practice since all seeded `requiresAction` flags are `false` (still deliberately deferred — see "Not done" below) but the mechanism is now correct.
- **Create on inactive/deleted rooms** — `POST /inspections` 400s if the room is retired or soft-deleted.
- **Admin room creation under inactive/deleted camps** — `adminRooms.js` `POST /` and `POST /range` 400 if the target camp is retired or deleted.
- **Prod start re-seeding every boot** — `scripts/start.js` now only runs `prisma/seed.js` when `checklistItem.count() === 0`; a populated DB skips seeding so a redeploy can no longer silently revert admin edits to the checklist template.

**Fixed — Medium:**
- `latest-by-room` now excludes retired/deleted rooms.
- `PATCH /inspections/:id` now validates every `optionId` in a `responses[]` payload actually belongs to the stated `checklistItemId` and matches the right `kind` (TOGGLE vs COUNT), and enforces OK-exclusivity and SINGLE_SELECT single-pick **server-side** (`validateResponsePayload` in `services/inspections.js`) — previously only the client enforced this.
- FE `/hse` now allows `ADMIN` (matching the backend, which always did) — `shared/accessControl.ts`.
- Admin `PATCH /:id`, `PATCH /:id/active`, and `generate-credentials` (camps/rooms/users) now all require `deletedAt: null`, so a soft-deleted (Recycle Bin) row can no longer be edited/reactivated/issued credentials directly — must be restored first.
- Login now honors `location.state.from` after a successful login, not just on the already-authenticated redirect — lands back on the originally-requested route.
- `schema.prisma` header updated to describe the current blank-default + submit-completeness behavior (was still describing the old OK/Good pre-selection this session had already removed in code).

**Flagged, deliberately not fixed** (need the user's call, not mine — see the plan file's reasoning for each): `/uploads` isn't access-controlled (mitigated by 128-bit random filenames, but not a real fix); seed label `"label not updated"` reads like real inspection content, not a placeholder; dead `commentText` field (API-only, no UI); duplicate section `types.ts` per role (refactor, not a bug).

**Verified**: `npx tsc -b` clean; two-inspector IDOR test (403 on cross-inspector GET/PATCH/submit, 409 on double-create) via a throwaway test account (created and deleted after); blank submit 400 → full submit 200 with `requiresAction` auto-opening a `CorrectiveAction`; cross-item/cross-kind optionId rejected 400; OK+issue combo and SINGLE_SELECT multi-pick both rejected 400; room creation under a retired camp blocked 400; retired room excluded from `latest-by-room`; PATCH on a soft-deleted room 404s; ADMIN reaches `/hse` with no console errors; login redirect confirmed via `location.state.from` round-trip; Submit button disabled+bannered on a fresh draft, live-updates as items are answered, enables once complete — all confirmed via real browser interaction, not just curl.

---

## Not done — both require a human, not more building

1. **Real `requiresAction` values** — the toggle exists in Admin Configuration's checklist option editor, and submit-time auto-opening of `CorrectiveAction`s is now fully wired (see review-fix pass above); no findings have been marked yet. Needs someone with IKK's operational knowledge to decide which findings should auto-open a `CorrectiveAction`. Do not invent values.
2. **Actually deploying to Render** — needs a Render account and someone to click through the Blueprint flow / paste the External Database URL. Config is ready (`render.yaml` + scripts), but this session has no account access and deploying is explicitly a separate confirmed action, not something to do proactively. `render.yaml`'s placement under `room-check-app/` with no `rootDir` is a known open item for whoever does this — deliberately held, see the review-fix pass.
3. **`/uploads` access control** — photo URLs aren't auth-gated (mitigated by unguessable random filenames, but not a real fix). Flagged during the code-review pass; a real fix needs a signed-URL or authenticated-proxy design decision, not a quick patch.
4. **Dead `commentText` field** — exists in the schema/API, no UI reads or writes it. Either wire it into the form or drop it from the schema — flagged, not decided.

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
- DRAFT inspections are owned by the inspector who created them — every view/mutation route must check `inspectorId === req.user.id` (ADMIN keeps its full-view bypass); don't let `POST /inspections` hand over another inspector's open draft
- A submitted inspection must have a response on every active checklist item — don't relax the `isItemAnswered` completeness check without an explicit product decision
- `scripts/start.js` only seeds an empty database — don't make it reseed unconditionally again, that silently reverts admin edits to the checklist template on every redeploy
- Admin `PATCH`/`generate-credentials` endpoints must keep excluding soft-deleted (Recycle Bin) rows — a deleted row can only be reactivated through `POST /:id/restore`, never edited directly
