# 2026-11-05 — task: PR #57 reverse-prompt warning flash + vacuous no-vision test

**Origin:** Direct user task — validate the prior agent's race-condition claim on
`feat/prompt-tools`, then "FIX IT" for the two gaps found. Shape: fix.

**Delivery:** working tree on `feat/prompt-tools` (uncommitted; user commits). Key files:
`frontend/src/hooks/usePromptTools.js`, `frontend/src/components/imagegen/PromptToolsModal.jsx`,
`frontend/src/components/imagegen/PromptToolsModal.test.jsx`.

**Validation result (read-only pass):** prior race claim confirmed against TanStack
query-core 5.90.10 — `getOptimisticResult` reports `fetchStatus: 'fetching'` on the mount
render, queryFn runs in the subscribe effect after commit; `enabled: false` leaves
`isPending` true forever. `isFetching` + `waitFor(fetch called)` were the right fixes.
Three reverse-prompt test files ran 3x, 15/15 each, no flake.

**Requirements satisfied:**
- Warning flash: `usePromptModel` now returns `modelsLoaded`; the "No vision-capable chat
  model" box renders only after the models query resolves. Before, `modelId` was null on
  the first render whenever `["models","text"]` wasn't cached (gallery route cold), so the
  warning flashed before the spinner.
- Vacuous test: the old no-vision test passed on the initial render regardless of the mock
  (warning shown before models loaded, `not.toHaveBeenCalled` checked before settle). Now
  the warning can only appear after models load, so `findByText(warning)` proves the
  no-vision branch. New test `shows neither the warning nor the spinner while the model
  list is still loading` pins the loading state (never-resolving models promise).

**Remaining scope:** none. Noted, not changed: `isEnhancing` useState in `InputArea.jsx`
duplicates the mutation's `isPending` (house rule "derive, don't duplicate") — out of scope.

**Verification ledger:**
- New test red against pre-fix component (stashed), green with fix.
- Frontend vitest: 109 green (108 + 1). Prettier clean on all three files.
- Server tests not run — no server changes.

**Proof:** `PromptToolsModal.test.jsx` — loading-state test + the now-meaningful no-vision test.

**Open / next:** user commits + pushes to PR #57; human merge; manual script 1–7 on live app.

**Derived decisions (ratify in PR?):**
- Exposed `modelsLoaded: data !== undefined` from `usePromptModel` rather than a separate
  `isLoading` — a resolved-but-empty list is "loaded", and `undefined` is the only
  not-yet-loaded signal TanStack gives.
- Kept the `modelId && isFetching` spinner gate even though a disabled query never fetches —
  redundant but harmless, and removing it is outside the ask.
