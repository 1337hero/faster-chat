# 2026-11-05 — prompt tools (reverse-prompt, enhancement, inspiration library)

**Origin:** Mike's direct task (2026-11-05) + `specs/reverse-prompt-and-enhancement.md`. Shape: feature.

**Delivery:** PR #57 (`feat/prompt-tools` → `main`). Key files: `server/src/routes/images.js`
(2 new routes + `resolveVisionModel`), `server/src/lib/promptEngineering.js` (new),
`packages/shared/src/data/inspirationPrompts.js` (new, 100 entries), `REVERSE_PROMPT_LENGTHS`
in `shared/constants/imageGeneration.js`, `frontend/src/hooks/usePromptTools.js` (new),
`frontend/src/components/imagegen/` (PromptToolsModal + InspirationPanel, new),
`MessageAttachment.jsx`, `InputArea.jsx`, `GalleryView.jsx`, `ChatInterface.jsx`,
`state/useUiState.js`.

**Intent changes:** none.

**Requirements satisfied (from spec user stories):**
- US-1/2/3: Reverse-prompt button on chat attachment cards and gallery cards; system prompt
  encodes dickpy's concrete-language rules + verbatim in-image text with position + no-filler
  rule (asserted on outgoing messages); concise/standard/detailed length reaches the API;
  one-click Insert / Copy in the result modal.
- US-4: Enhance toggle in image mode, persisted in uiState, hidden in text mode; submit with
  toggle on expands the prompt into the composer without generating — the user confirms the
  visible expanded text with one more submit (transparent two-step, regression test keeps the
  toggle-off path untouched).
- US-5: vision-model picker in the enhance row; `enhanceModelId` persisted per user;
  resolution falls back to preferred model when vision-capable, else first vision model;
  server 400s naming the model when it isn't vision-capable (both endpoints).
- US-6/7/8: inspiration panel off a lightbulb in image mode; static data imported from the
  shared package (offline, zero tokens); fuzzysort prompt search + category chips; persisted
  favorites with a favorites-only filter; 100 curated entries in the spec's entry shape.
- Manual script items 1–7 from the spec require a live provider + vision model — not run in
  this session (no live models configured here); automated coverage stands in for 2, 4, 5, 7.

**Remaining scope:** none in-spec. US-1's "full-size preview" surface does not exist in the
codebase (no lightbox component) — noted in the PR; a lightbox is a separate spec.

**Verification ledger:**
- 12 TDD cycles red→green per the spec table: server cycles 1–6
  (`server/src/test/imagesPromptTools.test.js`, 23 tests), frontend cycles 7–12
  (MessageAttachment, PromptToolsModal, InputArea, InspirationPanel, GalleryView tests).
- Mutation checks per spec: removed vision gate → gate tests fail; stripped no-filler rule →
  outgoing-message assertion fails; disabled insert wiring → insert test fails. All restored,
  full suite re-run green. (Lesson: `git checkout` during mutation checks of uncommitted work
  reverted `images.js` to HEAD — re-applied and re-verified; use sed-roundtrip for new files.)
- `bun run test`: 526 green. Frontend vitest: 102 green. `bun run build`: clean.
  `bun run format`: clean.
- Standards gate on the diff: no new `.ts` under frontend, no `useCallback`, no
  `transition-all`, no barrel files, no new dependencies.
- Skipped: the spec's live-provider manual script (no vision model configured in this
  environment) — deferred to the human with the running app.

**Proof:** the red-first tests above — e.g. `rejects a non-vision model (400), naming it, and
never calls the model`, `submit with enhance on expands the prompt into the composer without
generating, and the next submit generates`, `favorite stars toggle and persist via uiState`.

**Open / next:** review + merge of PR #57; manual script 1–7 on the live app (needs a
vision-capable chat model + image provider).

**Derived decisions (ratify in PR?):**
- One shared `pendingPrompt` uiState flow for all insert-into-composer paths (chat card,
  gallery, inspiration) — mirrors the existing `pendingReference` pattern; avoids prop
  drilling 3 levels into MessageAttachment.
- `REVERSE_PROMPT_LENGTHS` moved to shared as the canonical contract (keys = API, values =
  UI labels); server keeps the prompt-instruction text in `promptEngineering.js`.
- Inspiration search: fuzzysort on `prompt` only + explicit category chips. Fuzzysort's
  default threshold proved too permissive on a composite prompt+style+category key (71/100
  entries matched "isometric"), so category became an explicit filter — same pattern as
  GalleryView's search.
- Reverse-prompt modal auto-runs on open with `standard` and re-runs on length change
  (mutation fired from an effect — the user-initiated action pattern the spec named).
- `InputArea.jsx` is 487 lines (was 382 pre-change) — over the 200-line convention, but the
  convention was already broken before this change and the additions belong to the same
  composer unit; extraction is a separate cleanup task.
- Enhance two-step `justEnhanced` resets on: successful generation, input cleared, image mode
  exited. Editing the expanded text does not re-arm enhancement (edit = confirmation).
