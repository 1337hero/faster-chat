# 2026-11-05 — PR #56: image-to-image reference-guided generation & editing

- **Origin:** Mike's direct task (2026-11-04), specced in `specs/image-to-image.md`. Shape: feature.
- **Delivery:** PR #56 (`feat/image-to-image`), opened 2026-11-05, not yet merged. Key files:
  `packages/shared/src/constants/imageGeneration.js` (capability fn + cap),
  `server/src/lib/db/migrations/009_add_model_image_to_image.js` (new), `server/src/lib/db/models.js`,
  `server/src/routes/images.js` (reference validation + meta), `server/src/routes/models.js`
  (capability toggle), `server/src/lib/imageProviderFactory.js` (edit branches),
  `server/src/lib/imageGeneration.js` (replicate extraInput), `frontend/src/components/chat/InputArea.jsx`,
  `frontend/src/components/chat/ChatInterface.jsx`, `frontend/src/hooks/useImageGeneration.js`,
  `frontend/src/state/useUiState.js` (pendingReference), `frontend/src/components/gallery/GalleryView.jsx`,
  `frontend/src/components/admin/ModelsTab.jsx`.
- **Intent changes:** none yet (PR freshly opened, no review comments).
- **Requirements satisfied:**
  - US-1: 1–3 reference images attachable in image mode (attach control re-shown, `image/*` only, cap 3).
  - US-2: capability derived from model metadata with per-provider defaults; composer hides the attach
    control when the selected model can't take references.
  - US-3: references validated server-side — ownership (404), image mime (400), cap (400); non-images
    also filtered client-side.
  - US-4: gallery "Use as reference" hands a previous generation back to the composer (pendingReference
    store → InputArea consumes + focuses).
  - US-5: `[Image Edit]` user message when references exist; generated file meta records `references`
    (ids) + prompt.
  - US-6: references on a non-capable model → 400 naming the model id; never silently dropped.
- **Remaining scope:** inpainting masks, `reference_strength` tuning, >3 references — all explicitly
  out of scope in the spec.
- **Verification ledger:**
  - `bun run test` (server): 502 pass, 0 fail.
  - `cd frontend && bun run test`: 76 pass, 0 fail.
  - `bun run build` + `bun run format`: clean.
  - TDD: vertical red→green cycles per the spec's 14-cycle plan (shared capability, route validation
    1–4, factory branches 5–9, meta 10, frontend 11–14).
  - Standards mechanical checks on the diff: no `useCallback`, no `transition-all`, no lockfile/TS/
    barrel changes.
  - Skipped: manual provider runs (steps 1–6 of the spec's manual script) — need live provider keys;
    left to Mike at review.
- **Proof:** `server/src/test/imageToImage.test.js` (capability fn), `server/src/test/images.test.js`
  "reference image validation" (cycles 1–4, 10), `server/src/test/imageProviderFactory.test.js`
  "image-to-image edit branches" (cycles 5–9), `server/src/test/models.test.js` (capability toggle),
  `frontend/src/components/chat/InputArea.test.jsx` "image-to-image reference attach" (11, 13),
  `frontend/src/components/chat/ChatInterface.test.jsx` (12), `frontend/src/components/gallery/
  GalleryView.test.jsx` (14).
- **Open / next:** PR #56 open for review. On merge, the gallery→composer loop (US-4) is fully live;
  no follow-up branch needed.
- **Derived decisions:**
  - OpenRouter's reference param is `input_references: [{ type: "image_url", image_url: { url } }]`
    per the live OpenAPI spec, not the `image: [dataURL]` array the spec draft assumed. The spec
    explicitly said to verify against live docs; implemented against the live shape.
  - Model capability is a typed `model_metadata.supports_image_to_image` column (NULL = use provider
    default, 0/1 = explicit override), following the existing `supports_*` pattern — not a JSON blob,
    which the spec's "metadata JSON" premise assumed. `supportsImageToImage` treats `null` as unset.
  - `supportsImageToImage(provider, metadata, modelId)` takes the model id to hard-exclude `dall-e`
    (cannot edit) regardless of the per-provider default.
  - Validation order in the route is ownership → mime → capability, so each rejection is testable in
    isolation and the security check runs before the provider call.
  - Gallery handoff navigates to `/` (index guard → last chat or new chat) rather than a specific chat,
    since the gallery is global; `pendingReference` is not persisted (one-shot handoff).
  - The admin capability toggle is a plain checkbox on image-model rows (not a full metadata editor),
    the minimal surface to enable i2i for replicate/local models.
  - `readFile` on a reference that is missing from disk will 500; acceptable since the row is an owned,
    uploaded file expected to exist. Not guarded to keep the route simple.
