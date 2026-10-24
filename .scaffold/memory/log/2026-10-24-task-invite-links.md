# 2026-10-24 — invite links + fix false signup UI

**Origin:** Direct user task — personal deploy showed "Create Account" and "First user becomes
admin" to anonymous visitors; verify no admin-escalation bug and add admin-issued invite links
so users can self-register without the admin picking their password. (shape: feat)

**Delivery:** branch `feat/invite-links`, not yet committed/PR'd (user to say go).
Key files: `server/src/lib/db/migrations/006_invites.js`, `server/src/lib/db/invites.js`,
`server/src/routes/auth.js`, `server/src/routes/admin.js`,
`frontend/src/components/auth/AuthPage.jsx`, `frontend/src/components/admin/InvitesPanel.jsx`,
`frontend/src/router.jsx`.

**Intent changes:** none. Verified first: server already 403'd every registration after the
first user — the bug was UI only.

**Requirements satisfied:**
- AuthPage hides signup toggle and the "first user" notice unless `GET /api/auth/setup`
  says `needsSetup` or a valid invite token is in the URL (`/invite/$token`).
- Admin → Users gets an Invite links panel: create (copies URL), list active, revoke.
- Invite = single-use, 7-day expiry, revocable; invitee always gets role `member`.
- Public `GET /api/auth/invites/:token` validity check is rate-limited per IP.

**Remaining scope:** none.

**Verification ledger:**
- `server/src/test/invites.test.js` (new, 7 tests): no-invite 403, bogus 403, non-admin 401,
  create→validate→register as member→reuse 403→list shows used_by, revoked 403, expired 403.
- `cd server && bun test` → 427 pass / 0 fail.
- `cd frontend && bunx vitest run` → 44 pass. `bun run build` → ok. `bun run format` → clean.
- Not visually verified in a browser.
