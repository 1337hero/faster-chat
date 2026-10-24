# Closeout — issue #35 token stats (2026-08-24)

- **Origin:** GitHub Issue #35 — token stats display (tok/s, TTFT), feature, frontend-leaning.
- **Delivery:** branch `feat/token-stats`, PR opened against #35. Key files:
  `server/src/routes/chats.js` (messageMetadata on finish), `frontend/src/hooks/useChatStream.js`
  (timing + stats into message metadata), `frontend/src/lib/tokenStats.js`, `MessageItem.jsx`
  (footer stat line), `useThemeStore.js` + `Settings.jsx` (toggle), `lib/messageShape.js`
  (carry `metadata` through `toCanonicalMessage` — without this, stats would not survive reload).
- **Intent changes:** none (no review decisions at closeout time).
- **Requirements satisfied:**
  - Usage captured from stream result: server attaches `{usage}` as message metadata on the
    `finish` part via `toUIMessageStreamResponse({ messageMetadata })`.
  - TTFT measured client-side (send → first assistant text delta) in `useChatStream`.
  - Stats persisted in message `metadata.stats` (existing metadata persistence path reused).
  - Footer stat line gated on `showTokenStats` setting, default off; disabled = nothing renders,
    so zero layout shift.
  - Stats survive reload (metadata carried through canonical message shape + DB roundtrip).
- **Remaining scope:** none. Non-goals (cost tracking, historical charts) untouched.
- **Verification ledger:** `bun run test` frontend (52 pass, incl. 7 new tokenStats tests);
  `bun test` server (420 pass); `bun run format`; `bun run build`. No e2e run — UI is a
  conditional text line, unit tests cover the risky logic (stats math/formatting).
- **Proof:** `frontend/src/lib/tokenStats.test.js` covers buildTokenStats (null guards,
  tok/s excluding TTFT, zero-generation guard) and formatTokenStats.
- **Open / next:** PR review. Verify against a live Ollama vs cloud provider for the issue's
  acceptance check.
- **Derived decisions (ratify in PR?):**
  - Toggle lives in `useThemeStore` (localStorage, per-browser) matching the
    `showCodeLineNumbers` pattern, not server-side app settings (which are appName/logoIcon only).
  - tok/s = outputTokens / (duration − TTFT) — generation rate, excluding TTFT.
  - Server sends raw usage; client composes `stats` (usage + timing) so timing stays honest
    (measured where it happens).
