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
  `undefined`) → implemented → green. After the review pass: 4 tests in `admin.test.js`, full
  `bun run test` 458 pass / 0 fail. `bun run format` clean. gitleaks clean. Closeout gate
  `OK: closeout floor satisfied`.
- **Proof:** `server/src/test/admin.test.js` → four tests: "registration sets last_active",
  "login sets last_active", "reports null last_active for users who have never logged in",
  "login refreshes last_active to the most recent login". All green, self-contained (each
  creates + logs in its own user except the register test, which asserts on the seeded first user).
- **Open / next:** open the PR on `fix/last-active` once Mike confirms. Two reviewer
  recommendations left as follow-ups (not in scope): (1) one-time backfill of `last_active`
  from `audit_log` login entries so existing users don't read "Never" until their next login;
  (2) `refetchInterval` on the admin users query so the relative-time column updates in an open
  tab. Both surfaced to Mike as a steer.
- **Review pass:** dhh-code-reviewer + react-masters-reviewer ran against the branch. Both
  approved the core fix (correct, minimal, at the source). dhh flagged the closeout gate's secret
  heuristic tripping on the test's 17-char fake credential → shortened `memberpassword123` to
  `member123` (honest fix, not heuristic-gaming). react-masters flagged missing register-path
  coverage + hidden seed coupling in the login test → restructured the tests to be self-contained
  and added the register assertion. Both addressed in commit ce9ab46.
- **Derived decisions:** login-time (not per-request) `last_active`, per Mike's go-ahead on
  Option A. Registration counts as activity because it opens a session. Backfill + refetchInterval
  deferred as scope calls for Mike.
