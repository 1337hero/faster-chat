# 2026-11-04 — task: PR #57 review findings fixed

**Origin:** Direct user task — fix all findings from the DHH + React-masters review of PR #57
(`feat/prompt-tools`), no follow-ups deferred. Shape: fix.

**Delivery:** pushed to PR #57 branch as `00691e7` (plus `e50c7d2`, the prettier quote fix from
the same review). Key files: `InputArea.jsx`, `PromptToolsModal.jsx`, `usePromptTools.js`,
`ui/Chip.jsx` (new), `ui/Modal.jsx`, `GalleryView.jsx`, `MessageAttachment.jsx`,
`state/useUiState.test.js` (new), `server/routes/images.js` (comment only).

**Intent changes:** none. Review decisions ratified the existing spec; one finding (enhance
gate on `supports_vision`) is spec-mandated (cycle 5) — documented in code instead of changed.

**Requirements satisfied:**
- Enter-key race: `handleKeyDown` now guards `isEnhancing` — no concurrent double-enhance.
- Files-only submit with enhance on skips enhancement and generates directly.
- Gallery reverse-prompt insert enters image mode (mirrors use-as-reference).
- Reverse-prompt converted mutation → cached `useQuery` keyed `[fileId, length, modelId]`,
  `staleTime` 5min; spinner keyed to `isFetching` (query is pending-but-idle while disabled
  or before dispatch — `isPending` painted a false loading state).
- `Chip` component replaces 6 duplicated chip variants (ratios, counts, enhance, lengths,
  categories).
- Attachment overlay buttons grouped (no double `ml-auto`); `Modal` defaults `isOpen = true`
  so conditionally-rendered parents don't pass dead props; shared vision-gate rationale
  documented on `resolveVisionModel`.
- Kent gap closed: new `useUiState.test.js` exercises the real store — enhance toggle,
  favorite add/remove, pendingPrompt set/clear, and partialize (durable keys persist,
  `pendingPrompt`/`pendingReference`/`imageMode` never do).
- Inspiration test counts now derive from `INSPIRATION_PROMPTS`, not the literal 100.

**Remaining scope:** none. Deferred-by-design: nothing — user explicitly rejected follow-ups;
the only finding not code-changed (vision gate on enhance) is spec behavior, documented.

**Verification ledger:**
- Frontend vitest: 108 green (102 + 6 new). Server `bun test`: 526 green. Build clean.
  Prettier clean across all changed files (incl. `packages/shared`).
- Race found and fixed during work: TanStack sets `fetchStatus: 'fetching'` on dispatch
  before the queryFn runs — tests that resolved a captured promise right after the spinner
  appeared raced it; fixed with `waitFor(fetch called)` at the three call sites.
- Skipped: live-model manual script (unchanged from PR #57 — needs a running app with a
  vision chat model + image provider).

**Proof:** new regression tests — `a second Enter while an enhancement is in flight does not
fire another`, `reference files with no text skip enhancement and generate directly`,
PromptToolsModal cache assertion (`fetchMock` stays at 2 calls toggling back to standard),
GalleryView `setImageMode(true)` assertion, `useUiState` persistence test.

**Open / next:** human merge of PR #57; manual script 1–7 on the live app.

**Derived decisions (ratify in PR?):**
- Spinner semantics switched from `isPending` to `isFetching` in PromptToolsModal — pending
  includes the disabled-query and pre-dispatch idle states, which painted a permanent
  loading spinner for no-vision-model users and a false flash on mount.
- `Modal` `isOpen` now defaults true rather than dropping the prop from its API — all other
  callers pass it explicitly and are unaffected.
- Real-store test added rather than a shared mock-store factory: the vi.mock hoisting makes
  a factory mostly object-literal relocation, while the actual Kent concern (untested
  toggle/persist semantics) is only answerable against the real zustand store.
