# 2026-11-05 — chat export (JSON + Markdown, single or all chats)

**Origin:** GitHub issue #27 (PRD: chat export), briefed by the rig lead on 2026-11-05. Shape: feature.

**Delivery:** PR #59 (`feat/chat-export` → `main`). Key files: `server/src/routes/chats.js`
(`GET /:chatId/export`), `server/src/routes/export.js` (new, `GET /api/export`),
`server/src/lib/export.js` (new: JSON builder, Markdown transcript, filenames),
`server/src/lib/db/chats.js` (`getAllChatsByUserId`, `getAllMessagesByChatAndUser`),
`packages/shared/src/constants/export.js` (new, `EXPORT_CONSTANTS`),
`frontend/src/lib/download.js` (new), `frontend/src/components/layout/ChatContextMenu.jsx`
(Export as JSON / Markdown), `frontend/src/pages/authenticated/Settings.jsx` (Data section),
`server/src/test/export.test.js` (new).

**Intent changes:** none to the issue's scope. Review/QA-driven refinements the lead ratified:
- RFC 5987 `filename*` added so non-latin titles survive in the download name (review).
- Blank line before each Markdown `---` so message text is not parsed as a setext heading (QA).
- Chats with zero messages are excluded from every export; a single-chat export of an empty
  chat is a 404 "Chat has no messages" in both formats (QA note, lead decision).

**Requirements satisfied (issue #27 scope + acceptance):**
- Export all chats to a versioned native JSON (`version: 1`, `source: "faster-chat"`): folders,
  chat pin/archive/folder/memory state, messages with metadata, attachment manifest by reference
  (no blobs). Archived and foldered chats included; soft-deleted excluded.
- Export a single chat as JSON (same shape, one chat, its folder if any) or Markdown (H1 title,
  model/created/updated header, `## User` / `## Assistant` / `## System` turns with timestamps,
  content verbatim so fences and LaTeX pass through).
- Endpoints sit behind `ensureSession` and the existing `loadChat` ownership middleware; no role
  gate, so a readonly user exports their own chats and nobody exports another user's (404).
- Frontend: export actions in the chat context menu; "Data" section in Settings with "Export all
  chats". Downloads are cookie-authenticated GETs via an anchor click.
- Tests: ownership (member and readonly, 404 and 401), JSON shape, Markdown fence intact,
  single + all, format validation, filename encoding, empty-chat handling.
- Non-goals honoured: no CSV, no zip bundling, no scheduled backups, no all-chats Markdown.

**Remaining scope:** round-trip re-import waits on a native importer (format designed for it, not
built). Export body is built in memory, not streamed, as the brief allowed for v1.

**Verification ledger (Bun 1.4.4, Linux, in the builder worktree):**
- d9e4602 feat(export): initial feature. `cd server && bun test src/test/` 539/0;
  `cd frontend && bun run test` 109/0; `bun run build` ok; oxlint on new files 0/0.
- 45867d9 fix(export): Markdown blank line before `---` (+2 assertions). Server 539/0.
- cb7f390 fix(export): all-export skips empty chats. Server 539/0.
- 9cfc105 fix(export): single export skips empty chats too. Server 540/0.
- this commit: route guard, empty chat → 404 both formats (+1 test). Server 540/0,
  export.test.js 14/0, oxlint on touched files 0/0.
- Repo-wide `bun run lint` fails on `main` already (pre-existing); no delta from this branch.
- dev-review stamped d9e4602 → 9cfc105 (own worktree, 540/0, prettier clean, signatures good).
  dev-qa PASS at cb7f390 and 9cfc105: live API over admin/member/readonly users, browser check of
  both entry points (right-click menu and Settings), downloads parsed, Markdown rendered with
  micromark.
- Not run: round-trip import (no importer), large-account export timing.

**Proof:** red-first assertions in `export.test.js` — `another user's chat is 404`,
`readonly user gets 404 for another user's chat`, `renders title, header, turns, and keeps code
fences intact` (incl. no line directly followed by `---`), `truncates the filename* title by code
point, not UTF-16 unit`, `a chat with no messages is 404 in both formats`.

**Open / next:** review + merge of PR #59. Known tidy, deliberately left: the empty-chat filter in
`buildExport` runs one COUNT per chat; an EXISTS clause in `getAllChatsByUserId` would make it a
single query.

**Derived decisions (ratified by the lead):**
- Single-chat export lives in the existing right-click context menu beside Rename/Archive/Move,
  not as new hover icons; no touch path, same as those actions.
- Unknown `format` → 400; all-chats `format=markdown` → 400.
- Filenames: ASCII slug of the title (edge dashes trimmed after the 60-char cut) plus
  `filename*` with the code-point-sliced original; all-export is `faster-chat-export-YYYY-MM-DD.json`.
- Markdown header is a bullet list (Model, Created, Updated) with ISO timestamps.
- Two unpaginated DB helpers rather than paging through the existing paginated ones.
