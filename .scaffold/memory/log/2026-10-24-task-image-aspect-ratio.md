# 2026-10-24 — image aspect ratio across providers

**Origin:** Direct user task (spec `specs/image-aspect-ratio-and-google-image-gen.md`, PR B).
The server validated `aspectRatio` but the chat never sent one, the default was `9:16`, and
only Replicate honored it. (shape: feat)

**Delivery:** branch `feat/image-aspect-ratio`, stacked on `feat/google-image-generation`
(rebase onto `main` after PR A merges). Key files: `packages/shared/src/constants/imageGeneration.js`,
`server/src/lib/imageProviderFactory.js`, `server/src/routes/images.js`,
`frontend/src/components/chat/{ChatInterface,InputArea}.jsx`, `frontend/src/state/useUiState.js`.

**Intent changes:** none.

**Requirements satisfied:**
- Image mode shows aspect-ratio chips; 3 for OpenAI (per gpt-image / dall-e size table), 7
  otherwise. Derived in render from the image model list; stale stored ratio falls back to the
  first supported one. Selection persisted in `ui-state`.
- Chosen ratio sent with every generation; default `1:1`.
- OpenAI: `size` from table, model from DB, `response_format` only for `dall-e-*`, unsupported
  ratio throws before any request.
- OpenRouter: `POST /api/v1/images` with `aspect_ratio`; old chat-completions parser
  (`parseDataUrl`, `imageUrlToBuffer`, candidate shapes) deleted.
- Unknown provider with a `base_url` → OpenAI-compatible `/images/generations` with SDXL bucket
  `size`; route allows a missing key when a base URL exists.

**Remaining scope:** none.

**Verification ledger:**
- `bun run test` → 445 pass / 0 fail (new: `aspectRatios.test.js`, factory openai/openrouter/
  local/replicate cases, 4 route tests).
- `cd frontend && bunx vitest run` → 55 pass (3 new chip tests).
- `bun run build` ✓, `bun run format` clean.
- `bun run lint` fails on `main` too (68 pre-existing errors); none on lines this branch adds.
- Skipped: browser check of the chip row, live calls to any provider (no keys here).

**Proof:** `server/src/test/imageProviderFactory.test.js` (outgoing bodies per provider),
`server/src/test/images.test.js` (forwarding/default/400/local), `InputArea.test.jsx`.

**Open / next:** push + open PRs A and B; one real generation per provider before merge.

**Derived decisions:**
- Shared table test lives in `server/src/test/` — root `bun run test` only scans there.
- Chip fallback mirrors ModelSelector's model fallback (preferred → default → first).
- Local provider without key sends `Bearer local`.
