# 2026-11-05 — feat: generated-image gallery (specs/image-gallery.md)

**Origin:** Mike's direct task + `specs/image-gallery.md` (Tier-1 spec from 2026-11-04).
Shipped on branch `feat/image-gallery`, PR pending review.

**Delivery:** 2 commits — `feat(images): generated-image gallery with search, favorites, and
metadata` + `refactor(images): apply react-masters and dhh review feedback`.
Key files: `server/src/routes/images.js` (GET /api/images/gallery, POST
/gallery/:fileId/favorite), `server/src/lib/db/files.js` (getGeneratedFiles,
toggleFileFavorite), migration `008_add_file_favorites.js`,
`frontend/src/components/gallery/GalleryView.jsx`, `frontend/src/hooks/useImageGallery.js`,
`/gallery` route + UserMenu entry, tests in `server/src/test/imagesGallery.test.js` and
`frontend/src/components/gallery/GalleryView.test.jsx`.

**Intent changes:**
- Spec said migration `008`; I initially built `007` because the migrations dir appeared to
  stop at 006 — a stale `ls`. `007_add_last_active.js` already existed (PR #53). Renamed to
  008; the spec was right.
- Sub-coder review dispatch (react-masters + dhh) looped and returned nothing; reviews were
  run inline by the main agent instead.

**Requirements satisfied:** all 7 server TDD cycles + 4 frontend cycles green, strictly
vertical (cycle 2 merged into 1's describe as a second test; cycle 3 passed pre-existing via
`ensureSession` — locked anyway). Both spec mutation checks verified (json_extract filter,
ownership clause). US-1..US-7 covered; out-of-scope items (tags, batch, FTS, image-to-image)
untouched.

**Verification ledger:** `bun run test` 470/470 server; `cd frontend && bun run test` 60/60
(incl. 1 new rollback test); `bun run build` clean; live smoke against temp file DB
(gallery 200 w/ generated-only rows, favorite toggle both ways, 401 unauth, migration 008
applied); standards checks (no lockfile change, no new deps, no TS, no useCallback, no
transition-all, no barrel files, component 182 lines).

**Review feedback applied (2nd commit):** single-statement `UPDATE ... RETURNING` toggle;
GalleryCard made fully presentational (navigate lifted); shared ACTION_BUTTON class; dropped
unused `isToggling`; dropped redundant `overflow-auto` on the page; single timestamp in
seedFile; added failed-toggle rollback test.

**Open / next:** PR review + merge. Known v1 limitation noted for PR: `download` attribute is
ignored cross-origin in dev mode (frontend :5173 → API :3001), works in prod same-origin.
Next specs in stacking order: batch-image-generation, image-to-image, reverse-prompt.
