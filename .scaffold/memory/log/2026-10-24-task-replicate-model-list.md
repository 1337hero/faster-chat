# 2026-10-24 — Replicate: live model list + honor the selected model

**Origin:** Direct user task — Replicate image generation ignored the picked model (always
Flux 1.1 Pro) and the admin panel only ever saw 8 hardcoded models. Make Replicate behave like
OpenRouter/Anthropic: add connection → fetch models → enable in admin. (shape: fix)

**Delivery:** PR #49 (https://github.com/1337hero/faster-chat/pull/49), branch `fix/replicate-model-list`.
Key files: `server/src/lib/imageGeneration.js`, `server/src/routes/providers.js`,
`server/src/lib/modelsdev.js` (hardcoded list removed), `server/src/test/imageGeneration.test.js`.

**Intent changes:** none.

**Requirements satisfied:**
- `generateImage` runs `options.model` (not the DEFAULT constant) and sends only inputs shared
  across the collection: `prompt`, `aspect_ratio`, `output_format`. Flux-Pro-only
  `safety_tolerance` / `prompt_upsampling` dropped.
- Replicate model list comes from `GET /v1/collections/text-to-image` via the SDK
  (`client.collections.get`), using the provider's stored key. Live check: 89 models.
- Create and refresh-models routes pass the API key into the fetcher; refresh decrypts the
  stored key.
- Replicate models default to disabled (same as OpenRouter) so 89 models don't flood the picker.
- Admin Models tab: Replicate models show a "Pricing on Replicate" link to
  `https://replicate.com/<model_id>` instead of "Free/Free per 1M" (Replicate's API exposes no
  pricing; image models aren't billed per token). `frontend/src/components/admin/ModelsTab.jsx`.

**Remaining scope:** none. Out of scope, noted for later: `/api/images/status` still only
checks `REPLICATE_API_KEY` env, not a DB-configured provider; `IMAGE_MODELS.DEFAULT` constant
still used as the env-only fallback in `routes/images.js`. Models without `aspect_ratio`
(e.g. stability-ai/sdxl) ignore it and use their own default size.

**Verification ledger:**
- `server/src/test/imageGeneration.test.js` (new, 3 tests): selected model + lean payload reach
  `client.run`; array/FileOutput output shapes; collection → model rows mapping (fetch stubbed).
- `bun run test` → 430 pass / 0 fail. `bun run format` → clean.
- Live `fetchReplicateImageModels` against Replicate with local key → 89 models.
- User verified adding a Replicate provider pulls the live list in the admin UI.
- `cd frontend && bun run build` → ok; `bunx vitest run` → 52 pass.

**Proof:** `server/src/test/imageGeneration.test.js`.

**Open / next:** PR #49 awaiting review/merge. Consider a schema-aware input mapping if
users pick width/height-only models.

**Derived decisions:**
- Replicate models disabled by default on fetch (ratify in PR?). Previously the 8 hardcoded
  ones were enabled.
- `fetchModelsForProvider` takes an options object `{ providerType, displayName, apiKey }`;
  create route still passes no `providerType` to keep its existing (no live fetch for
  openai-compatible on create) behavior.
