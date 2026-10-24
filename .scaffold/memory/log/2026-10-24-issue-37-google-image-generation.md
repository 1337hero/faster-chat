# 2026-10-24 — Google Gemini image generation (#37)

**Origin:** Issue #37 — add Google as an image-generation provider. (shape: feat)
Spec: `specs/image-aspect-ratio-and-google-image-gen.md` (PR A).

**Delivery:** branch `feat/google-image-generation`. Key files:
`server/src/lib/imageProviderFactory.js`, `server/src/test/imageProviderFactory.test.js`,
`frontend/src/components/chat/ModelSelector.jsx`.

**Intent changes:** none.

**Requirements satisfied:**
- `google` case in `generateImageForProvider` → `generateContent` with
  `generationConfig.imageConfig.aspectRatio` + `responseModalities: ["IMAGE"]`.
- Thought parts skipped; first real `inlineData` part returned with its mime type.
- Google invalid key → message contains `authentication` → route's existing 401 mapping;
  429 / `RESOURCE_EXHAUSTED` → `rate limit` → existing 429 mapping. Route untouched.
- Image-model empty state names all four providers.

**Remaining scope:** aspect-ratio UI + per-provider mapping is PR B (same spec).

**Verification ledger:**
- `imageProviderFactory.test.js` (new, 5 tests). Mutation check: moving `aspectRatio` to
  top level and changing the rate-limit string each failed a test.
- `bun run test` → 432 pass / 0 fail. Prettier clean on touched files.
- Skipped: live `curl` against Google (no Google key on this machine). Field names follow the
  spec's research notes — verify with a real key before relying on it.

**Proof:** `server/src/test/imageProviderFactory.test.js` + existing 401/429 route tests in
`images.test.js`.

**Open / next:** Mike reviews/merges PR; PR B (`feat/image-aspect-ratio`) builds on it.

**Derived decisions:** invalid-key detection checks `API_KEY_INVALID` anywhere in the error
object (Google puts it in `details[].reason`), plus 401/403.
