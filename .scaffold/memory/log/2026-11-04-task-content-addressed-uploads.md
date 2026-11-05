# Content-addressed uploads

- **Origin:** direct user task — adopt DeepSeek harness's content-addressed attachment storage
  into FasterChat's upload path; agreed scope = dedup + sha-addressed storage + refcounted
  deletion, no receipts/fsync/streaming/normalization. Shape: feature (TDD, red→green per
  `.claude/skill/test-driven-development`).
- **Delivery:** not opened — committed on `feat/content-addressed-files`; key files
  `server/src/routes/files.js`, `server/src/lib/db/files.js`,
  `server/src/test/content-addressing.test.js`.
- **Intent changes:** user ratified that same-user re-upload returns the *existing* row id
  (not a fresh row) — the one observable API behavior change.
- **Requirements satisfied:** identical bytes per user dedupe to one row (re-upload returns
  existing id); cross-user uploads share one disk object at `uploads/<hash[0:2]>/<sha256>`;
  DELETE unlinks bytes only when the by-path row refcount hits zero (error path guarded too);
  legacy uuid-layout rows keep serving unchanged (no migration); upload response `hash` is the
  actual sha256 of stored bytes.
- **Remaining scope:** none for this intent. Deliberately out: image normalization, request
  streaming, receipts, `images.js` (server-generated images still use uuid filenames).
- **Verification ledger:** new suite `bun test server/src/test/content-addressing.test.js`
  (6 tests, each seen red for the right reason before its green, except the two designed-green
  regression confirmations); full `bun run test` 454/454 after every cycle; `bun run format`
  clean; fresh-context subagent review — one material finding fixed (insert-failure path
  unlinked shared bytes unconditionally; now refcount-guarded).
- **Proof:** `server/src/test/content-addressing.test.js` — dedup id reuse, cross-user single
  object, refcounted delete, last-row delete, legacy-row serve, hash/path integrity.
- **Open / next:** push branch + PR; PR review ratifies the id-reuse behavior change and the
  legacy-orphan edge (pre-change duplicate uploads can leave one orphan when both rows die —
  self-limiting, noted in session).
- **Derived decisions:** refcount keyed on `path` not `hash` — path is the disk resource and
  keeps mixed legacy/content layouts correct; `deleteFilesByUserId` is pre-existing dead code,
  left untouched; `createStoredFilename` still used by `images.js`, kept.
