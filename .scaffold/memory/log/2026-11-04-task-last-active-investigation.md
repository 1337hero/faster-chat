# Admin "Last Active" always shows "Never" — investigation

- **Origin:** direct user task — "the Admin route for Users last seen does not seem to ever
  report a last log in; all users on an active install report 'Never'." Shape: investigation.
- **Delivery:** branch `fix/last-active` (unpushed, no PR). Fix implemented + green. Key files:
  `server/src/lib/db/migrations/007_add_last_active.js`, `server/src/lib/db/users.js`,
  `server/src/routes/auth.js`, `server/src/test/admin.test.js`.
- **Intent changes:** none.
- **Requirements satisfied:** root cause identified and reproduced. `GET /api/admin/users`
  never returns `last_active`; the `users` table has no such column (none of the 6 migrations
  add it). `getAllUsers()` selects only `id, username, role, created_at`. The frontend
  (`frontend/src/components/admin/UsersTab.jsx:157`) renders `formatRelativeTime(user.last_active)`,
  and `formatRelativeTime` (`frontend/src/lib/formatters.js:42`) returns "Never" for any falsy
  arg. So the field is structurally always `undefined` → every row reads "Never". Half-built
  feature: UI only, no backend source.
- **Remaining scope:** none. Shipped Option A: `last_active` column (migration 007),
  `dbUtils.updateLastActive` called on login and register, added to the `getAllUsers` SELECT.
  Rejected: B (derive from `sessions` — `cleanExpiredSessions()` deletes expired sessions, so a
  stale login reads "Never"); C (derive from `chats`/`messages` — conflates chat activity with
  presence).
- **Verification ledger:** TDD red→green. Baseline 25 pass; new test 1 fail (`last_active`
  `undefined`) → implemented → 28 pass / 0 fail in `admin.test.js`. Full `bun run test`
  457 pass / 0 fail. `bun run format` clean. gitleaks clean on commit.
- **Proof:** `server/src/test/admin.test.js` → three tests: "reports last_active for users who
  have logged in", "reports null last_active for users who have never logged in", "refreshes
  last_active to the most recent login". All green.
- **Open / next:** open the PR on `fix/last-active` once Mike confirms; run the two code
  reviewers (dhh, react-masters) for feedback.
- **Derived decisions:** login-time (not per-request) `last_active`, per Mike's go-ahead on
  Option A. Registration counts as activity because it opens a session.
