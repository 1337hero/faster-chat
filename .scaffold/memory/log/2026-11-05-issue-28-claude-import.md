# 2026-11-05 — issue #28: import from Claude exports

**Origin:** GitHub issue #28 (PRD: Import from Claude exports), handed to the workshop rig by Mike
via the OpenRig operator. Shape: feature.

**Delivery:** branch `feat/claude-import` (PR not opened at time of writing; blocked on GPG
passphrase for the signed commit). Key files: `server/src/lib/claudeImporter.js` (new parser),
`server/src/routes/import.js` (format table, shared `importHandler`, `POST /api/import/claude`,
`/validate` returns `format`, `/formats` lists both), `server/src/lib/db/chats.js`
(`createMessage` takes optional `createdAt`), `packages/shared/src/constants/import.js`
(CLAUDE source + endpoint), `frontend/src/utils/importConversation.js` and
`frontend/src/pages/authenticated/Import.jsx` (endpoint chosen by detected format; copy covers
Claude), `server/src/test/claudeImport.test.js` + `server/src/test/fixtures/claude-export.json`.

**Intent changes:** none yet (no PR review).

**Requirements satisfied (from #28 acceptance):**
- Multi-conversation Claude export imports with correct titles, order, and roles (fixture with
  two conversations + one empty; roles human→user, assistant→assistant; array order kept, no re-sort).
- Unsupported blocks (`tool_use`, `tool_result`) become `[Unsupported content: <type>]`
  placeholders and the message still imports; attachments become
  `[Attachment not imported: <name>]`.
- Malformed file → 400 `Invalid Claude export format` with zero rows written.
- Same validate → preview → atomic import pipeline and UX as ChatGPT; format auto-detected.

**Remaining scope:** none in-issue.

**Verification ledger (worktree `wt-feat-claude-import`, Bun on Arch Linux, staged state):**
- `cd server && bun test` → 538 pass, 0 fail (12 new in `claudeImport.test.js`).
- `cd frontend && bun run test` → 109 pass, 12 files.
- `bun run build` → OK.
- Prettier: touched files clean; `packages/shared/src/constants/import.js` was already
  non-conforming on `main` (single quotes), left untouched beyond the two added lines.
- Not run: real-app drag-and-drop of the fixture through the Import page (QA seat covers it).

**Proof:** `server/src/test/claudeImport.test.js` (parser unit tests + route tests incl.
timestamp order and no-write-on-malformed).

**Open / next:** sign commit, review + QA reports, open PR.

**Derived decisions (ratify in PR?):**
- Imported messages keep their source timestamps (strictly increasing fallback) instead of all
  getting `Date.now()`. Also changes ChatGPT imports; before this, order relied on SQLite
  tie-breaking of identical `created_at` values. Ratify in PR.
- Format detection is structural (`chat_messages` array → Claude, else ChatGPT) rather than a
  user-facing picker; `/api/import/chatgpt` is unchanged for existing callers.
