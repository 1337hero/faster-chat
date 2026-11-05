# 2026-11-04 — task: image-gen Tier-1 roadmap specs

**Origin:** Direct user task — review image gen in FasterChat against three DSH image-gen
plugins (shanliuling/dsh-image-gen, GooDAnDReaDY/dsh-image-gen, dickpy/dsh-imagegen),
identify high-value features, and write full implementation plans for the four Tier-1 items.
(shape: feature planning / docs; no code shipped)

**Delivery:** not opened (specs only, uncommitted on `fix/last-active` for Mike's review).
Key files: `specs/image-gallery.md`, `specs/batch-image-generation.md`,
`specs/image-to-image.md`, `specs/reverse-prompt-and-enhancement.md`.

**Intent changes:** none.

**Requirements satisfied:**
- Four Tier-1 features scoped with user stories, reference behavior sourced from the three
  plugins, and per-feature acceptance criteria.
- Each spec carries a TDD red-green cycle table (one behavior per cycle), a verification &
  validation plan with mutation checks, and relevant-files inventory matched to the actual
  codebase (db utils, migrations pattern, `fileIds` junction, existing fetch-mock test pattern).
- Cross-spec stacking resolved: gallery (independent) → batch (fixes `/generate` response
  shape to `images[]`/`failures[]`) → image-to-image (extends that shape) → prompt tools
  (independent).

**Remaining scope:** implementation of all four specs; GitHub issues not yet opened (Mike
asked for plans, offered issues earlier and declined to confirm).

**Verification ledger:** image-gen surface re-read against current tree (factory, routes, db
utils, frontend composer/gallery-adjacent components); specs checked against real files named
(migrations dir, `runWithConcurrency` absent, `fileIds` junction exists, fuzzysort already a
frontend dep). No tests run — docs only.

**Proof:** the specs' own TDD tables are the executable-proof plan; nothing to run yet.

**Open / next:** Mike reviews specs; then open issues + branch per spec in stacking order.
Flagged in review: batch makes the blocking-request latency up to N× longer (accepted at
MAX 4 / concurrency 3; async job queue is the named follow-up).

**Derived decisions (ratify in PR?):**
- Batch response shape is a breaking change to `POST /api/images/generate` (single object →
  `{ images, failures }`) — accepted because single-user deployment; frontend updated in
  same PR.
- Favorites for gallery live as an `is_favorite` column on `files` (migration 008), while
  inspiration-prompt favorites stay client-side uiState — files are server-shared data, the
  inspiration catalog is static UI data.
- Image-to-image capability defaults per provider (`google/openai/openrouter: true`,
  `replicate/local: false`) with a per-model metadata override; admin Models tab gets the
  toggle rather than auto-detecting Replicate input schemas.
- Enhancement is a visible two-step (expanded text lands in the composer for confirmation),
  not a hidden rewrite.
