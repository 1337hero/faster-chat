# 2026-11-05 — PR #55: batch image generation

- **Origin:** Mike's direct task (2026-11-04), specced in `specs/batch-image-generation.md`. Shape: feature.
- **Delivery:** PR #55 (`feat/batch-image-generation`). Key files: `server/src/routes/images.js`,
  `server/src/lib/concurrency.js` (new), `server/src/lib/httpStatus.js` (502),
  `frontend/src/components/chat/InputArea.jsx`, `frontend/src/components/chat/ChatInterface.jsx`,
  `frontend/src/state/useUiState.js`, `frontend/src/hooks/useImageGeneration.js`.
- **Intent changes:** none.
- **Requirements satisfied:**
  - US-1: count chips 1–4 in image mode, persisted in `useUiState.imageCount`.
  - US-2: N images attach to one assistant message, in order (fileIds array).
  - US-3: per-image failure isolation; partial success posts successes + "X of N images generated"
    warning toast; total failure → 502 with normalized per-image reasons, no file rows.
  - US-4: batch shares prompt/model/aspect (single request, per-image concurrency only).
  - US-5: each image is its own file row with shared metadata → gallery picks them up individually.
  - `numImages` validation: default 1, 400 on 0/negative/non-integer/> MAX_IMAGES.
  - Concurrency cap 3 via `runWithConcurrency` (unit-tested: in-flight ≤ limit, ordered results).
- **Remaining scope:** per-image prompts, async job queue, seeds — all explicitly out of scope in the spec.
- **Verification ledger:**
  - `bun run test` (server): 483 pass, 0 fail.
  - `cd frontend && bun run test`: 66 pass, 0 fail.
  - `bun run build` + `bun run format`: clean.
  - TDD: 10 red→green cycles per spec plan; mutation checks built in (cycle 4 fails without per-image
    catch, cycle 7 fails without the cap, cycle 2 fails without validation).
  - Skipped: manual provider runs (step 1–4 of the spec's manual script) — need a live API key;
    left to Mike at review.
- **Proof:** `server/src/test/concurrency.test.js` (cap + ordering),
  `server/src/test/images.test.js` "batch generation" describe (cycles 1–6) + updated failure
  contract tests, `frontend/src/components/chat/InputArea.test.jsx` "image count chips"
  (cycle 8), `frontend/src/components/chat/ChatInterface.test.jsx` (cycles 9–10).
- **Open / next:** review + merge; then the image-to-image spec builds on this response shape.
- **Derived decisions:**
  - Total failure (including single-image) is 502 with a `failures` array, replacing the old
    401/429/500 single-image contract — per the spec's breaking-change note. The 502 body carries a
    top-level `error` ("All image generations failed") so the existing `apiFetch` toast path keeps
    working. Ratify in PR.
  - `MAX_CONCURRENT_GENERATIONS = 3` is a local constant in the route file, not a shared constant —
    it's a provider-load tuning knob, not a user-facing limit.
  - File persistence runs sequentially after all generations finish (not inside the worker pool),
    so a slow disk write never holds a provider slot.
  - `ChatInterface` keeps the `if (images.length === 0) return;` guard in `onSuccess` as a
    boundary check, though the server now 502s on total failure.
