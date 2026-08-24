# Issue #33 — Line numbers toggle for code blocks

- **Origin:** GitHub Issue #33 (PRD: Line numbers toggle for code blocks). Shape: feature.
- **Delivery:** PR #44 (https://github.com/1337hero/faster-chat/pull/44) on branch `feat/code-line-numbers`. Key files:
  `frontend/src/state/useThemeStore.js`,
  `frontend/src/components/markdown/MarkdownRenderer.jsx`,
  `frontend/src/pages/authenticated/Settings.jsx`,
  `frontend/src/styles/tailwind.css`,
  `frontend/vitest.config.js`,
  `frontend/src/components/markdown/MarkdownRenderer.test.jsx`.
- **Intent changes:** none (no PR review yet).
- **Requirements satisfied:**
  - Toggle in Settings → Appearance, persisted per-user in the existing theme store (off by default).
  - Toggle on → CSS-counter line numbers on all code blocks, including streamed/fallback pre-highlight state.
  - Copy copies raw markdown source only; numbers are generated content, asserted in test.
  - Numbers are `::before` counters with `user-select: none`; wrapped lines keep numbers attached to their line.
  - Gutter color uses `--theme-text-muted`, which follows light/dark mode.
- **Remaining scope:** none from the issue; non-goals (per-block toggle, line linking, diff view) untouched.
- **Verification ledger:**
  - `bun run test` (frontend vitest): 44 pass (5 files) — includes 4 new tests.
  - `bun run test` (root, server bun test): 420 pass.
  - `bun run build:frontend`: builds clean.
  - `bun run format`: no changes to touched files.
  - Visual browser check: skipped — requires authed session; behavior proven at DOM level in unit tests.
- **Proof:** `frontend/src/components/markdown/MarkdownRenderer.test.jsx` — default-off, toggle adds
  `.line-numbers` (highlighted and fallback paths), clipboard receives raw code with no number prefixes.
- **Open / next:** merge PR; visual sanity check in a running instance if desired.
- **Derived decisions:**
  - "Existing user-preferences store" = `useThemeStore` (persisted, per-user; theme/font already live
    there). Server-side per-user settings table would have been a much larger change. Ratify in PR?
  - Pre-existing test-infra bug found and fixed in a separate commit: vitest loaded node_modules
    externally, so react-markdown's `react/jsx-runtime` import resolved to real react@19 (frozen
    elements) instead of @preact/compat — rendered "Cannot add property __, object is not extensible".
    Fix: `test.server.deps.inline: true`.
  - Fallback (pre-highlight) rendering now emits `span.line` per line so counters work during
    streaming/highlight delay; single render path regardless of toggle.
