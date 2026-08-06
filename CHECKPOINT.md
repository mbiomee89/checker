# Checker — Agent Checkpoint

**Date:** 2026-08-06
**Product:** Checker (IKK Group room housekeeping inspections)
**Handoff purpose:** `room-check-app` now has Inspector, Camp Supervisor Dashboard, and Admin Configuration all working end-to-end against real data. Continue with HSE Overview next, then push to GitHub when ready.

---

## Where things live

| Path | What |
|------|------|
| `D:\room check\` | Workspace root — git repo (local only, no remote yet) |
| `D:\room check\schema.prisma` | Rev 10 Prisma schema (canonical — kept in sync with `room-check-app/prisma/schema.prisma`) |
| `D:\room check\my-project-design\` | Design OS clone (product planning + screen designs) — source of ported UI components |
| `D:\room check\room-check-app\` | **The real app.** Express 5 + Prisma 6.19 + SQLite backend, React 19 + Vite + Tailwind v4 frontend. |
| `https://github.com/mbiomee89/checker.git` | Target app repo — **not yet connected**; local git only per earlier session's decision |

**Git status:** 2 local commits so far (scaffold, Camp Supervisor Dashboard). This session's Admin Configuration work is **not yet committed** — see "Not done" below, do that next.

---

## Locked product decisions

- **Name:** Checker
- **Audience:** Internal IKK only (inspectors, camp supervisors, admins, HSE)
- **Stack (implemented):** npm workspaces (root/backend/frontend), Express 5, Prisma 6.19/SQLite (dev), React 19 + Vite 8 + Tailwind v4, JWT auth — mirrors `D:\school project` conventions
- **Online-only v1** (no offline/PWA)
- **Default clear option:** label **OK** (`isClearOption`) on TOGGLE-kind condition options; form pre-selects OK server-side at inspection creation
  - Exceptions: Cleanliness = rating scale (UI default **Good**, no OK); Furniture = `kind=COUNT` options with `InspectionResponseOption.count` (no OK, exempt from exclusivity)
- **`requiresAction` matrix:** still deferred — `requiresAction=false` on all seeded options; now editable per-option in Admin Configuration's Checklist Template tab, still nobody has populated real values
- **Roles:** INSPECTOR, CAMP_SUPERVISOR, ADMIN, HSE_VIEWER — **a user may hold more than one role** (new this session, see below); the JWT's `activeRole` claim is whichever one they're currently acting as, switchable via the user menu
- **Inspection lifecycle:** DRAFT → SUBMITTED, enforced server-side (`requireRole('INSPECTOR')` + status checks); PATCH/photo endpoints reject once SUBMITTED

### Schema changes this session (Rev 9 → Rev 10)

Confirmed with the user before building (both diverge from a straight design port):
- **Multi-role users**: `User.role` (singular) replaced with `UserRoleAssignment` (many-to-many join table, `@@unique([userId, role])`). `User.campId` stays a direct single field (one camp regardless of how many roles held).
- **Real temp-password flow**: `User.mustChangePassword` and `User.hasCredentials` added. New users get an unguessable placeholder `passwordHash` (`hasCredentials=false`) until an admin calls `generate-credentials`, which sets a real server-generated temp password and `mustChangePassword=true`; `POST /auth/change-password` clears it. Mirrors `D:\school project`'s pattern — the design's `generateTempPassword()` was explicitly commented as a client-side stand-in for this.
- `Camp.active` / `Room.active` added (soft-delete, same convention as `ChecklistItem`/`ChecklistItemOption.active`) — retired camps/rooms disappear from `GET /camps` and `GET /rooms` (inspector/supervisor-facing) but stay visible with a "Retired" badge in Admin Configuration.

---

## What's built and verified

**Backend** (`room-check-app/backend/src/`):
- Core: `app.js`/`server.js`, `middleware/{auth,upload,validate}.js`, `routes/{auth,camps,rooms,checklistItems,inspections}.js`, `services/inspections.js`.
- Auth (reworked this session): JWT payload is `{sub, activeRole}`. `requireAuth` re-fetches the user **and** their `roleAssignments` every request, validates the JWT's `activeRole` is still among them (a revoked role on a live token is rejected, not silently downgraded). `requireRole` checks `req.user.activeRole`. New: `POST /auth/switch-role` (re-signs a token with a different held role), `POST /auth/change-password`.
- Camp Supervisor Dashboard: `GET /inspections/latest-by-room`, `GET/POST /corrective-actions`, `PATCH /corrective-actions/:id`, `GET /priority-flags` (read-only — toggling is the still-unbuilt inspector "Supervisor Activity Review" screen). `services/correctiveActions.js` implements the append-only log: every note/status-change is server-prefixed `[date, author]: ` and appended, never overwritten.
- **Admin CRUD (new this session)**, all `requireRole('ADMIN')`: `routes/adminCamps.js`, `adminRooms.js` (incl. `POST /range` bulk room creation), `adminUsers.js` (incl. `POST /:id/generate-credentials`), `adminChecklist.js` (items + nested options), all mounted at `/admin/*`. `services/users.js` has the server-side temp-password generator (`crypto.randomInt`-backed, not `Math.random`).

**Frontend** (`room-check-app/frontend/src/`):
- Shell, Inspector Checklist, and Camp Supervisor Dashboard components **ported verbatim** from `my-project-design/product-plan/` (only change across all of them: local `string` id type annotations → `number` — no behavior change).
- **Admin Configuration (new this session)**: `AdminConfiguration.tsx` (1399 lines) ported the same way, plus one real behavior change — `UsersTab`'s `issueCredentials` is now `async` and awaits the real backend-generated password instead of the design's client-side stand-in. `pages/admin/AdminPage.tsx` wires all four tabs (camps/rooms/users/checklist) to the new `/admin/*` endpoints with reload-after-mutation.
- **`components/ForceChangePassword.tsx` (new, hand-written, not ported)**: blocks all navigation and renders inline when `user.mustChangePassword` is true — mirrors the described `D:\school project` `StaffLayout` pattern. Rendered from `AppLayout` before the normal `Outlet`.
- `AppLayout`/`UserMenu` role switcher is now genuinely functional (previously always a no-op single-element array) — calls `switchRole()` then navigates to the new role's home.
- HSE Overview is still the placeholder frame — next up.

**Seed data** (`room-check-app/prisma/seed.js`, idempotent): 13 checklist items, 2 camps, 11 rooms, 5 login accounts (all password `Password123!`): `admin@checker.local`, `inspector@checker.local`, `supervisor@checker.local` (CAMP_SUPERVISOR/Arabian Gulf), `hse@checker.local`, **`fatima@checker.local` (ADMIN + HSE_VIEWER — proves the role switcher works)**.

**Verified end-to-end in the browser this session:**
- Multi-role login → role switcher in user menu → switching roles navigates correctly, `activeRole` changes, access to role-gated routes flips accordingly.
- Admin Configuration all 4 tabs render real data (camps with room/user counts, rooms with camp filter, users with multi-role badges, checklist items with expandable options).
- Full user lifecycle through the real UI: create a user with 2 roles → shows "No login yet" → "Set up login" → real temp password shown once in the modal → that password actually works for login → forced password-change screen blocks all navigation → completing it clears the block and lands on the role home.
- Regression-checked: Inspector and Camp Supervisor flows from prior sessions still work after the auth refactor; retiring a camp correctly removes it from the inspector's camp picker.
- No console errors anywhere in the above.

---

## Not done / next steps

1. **Commit this session's work** — Admin Configuration + multi-role auth changes are verified but not yet `git commit`'d. Do this first.
2. **HSE Overview** — still an empty-state frame. Needs cross-camp aggregation (Combined-scope charts, camp comparison panel, frequency-over-time drill-down). `HSEOverview.tsx` is 591 lines and reuses the same chart/filter patterns as the Camp Supervisor Dashboard — the `latest-by-room`/corrective-actions/priority-flags backend logic should mostly generalize to "all camps" rather than needing a rebuild.
3. **Dedicated printable report component** — inspector's and supervisor's "Report" buttons still just open the read-only `InspectionForm` view instead of the designed letterhead/sign-off report (`InspectionReport.tsx`/`SupervisorInspectionReport.tsx`, not yet ported).
4. **Inspector's "Supervisor Activity Review" screen** — where priority flags get toggled by inspectors (`POST`/`DELETE /priority-flags` don't exist yet, only `GET`). Not built.
5. **`requiresAction` matrix** — schema/UI now support it per-option (Admin Configuration's option editor has the toggle), but no real values have been filled in — still needs stakeholder input on which findings should auto-open a `CorrectiveAction`.
6. **GitHub** — push to `https://github.com/mbiomee89/checker.git` explicitly deferred; do it as a separate, explicitly-confirmed step.
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

Or via Claude Code's Browser preview tool: `.claude/launch.json` has a `checker-app-frontend` config (port 5173) — the backend still needs to be started separately.

---

## Do not regress

- Do not reintroduce offline/PWA for v1
- Do not invent real `requiresAction` values without stakeholder input (the toggle exists in Admin Configuration now, but leave it false until told otherwise)
- Keep OK as canonical clear option; preserve Cleanliness/Furniture exceptions (schema-backed via `kind`/`count`)
- `Inspection.campId` is server-set from `room.campId` only — never accept it from the client
- `requireAuth` re-fetches the user (and now `roleAssignments`) from DB every request, and validates the JWT's `activeRole` is still held — don't switch to trusting the JWT payload alone
- New users get an unguessable placeholder password at creation (`hasCredentials=false`) — never let the admin type/choose a user's initial password directly; credentials only come from `generate-credentials`
- Retired camps/rooms (`active=false`) must stay excluded from `GET /camps` / `GET /rooms` (inspector/supervisor-facing) even as new endpoints are added
