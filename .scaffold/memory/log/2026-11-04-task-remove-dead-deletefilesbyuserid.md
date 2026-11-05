# Remove dead deleteFilesByUserId

- **Origin:** direct user task — clean up dead code surfaced during the content-addressed
  uploads session (PR #50). Shape: chore.
- **Delivery:** PR (opened after this entry) on `chore/remove-dead-deletefilesbyuserid`;
  key file `server/src/lib/db/files.js`.
- **Intent changes:** none.
- **Requirements satisfied:** `dbUtils.deleteFilesByUserId` deleted. Verified dead first:
  full-repo sweep (all file types incl. scripts/CI/docs, excluding node_modules) found only
  the definition and the log entry mentioning it; no reflective `dbUtils[...]` access anywhere.
- **Remaining scope:** none.
- **Verification ledger:** `bun run test` 448/448 on branch off `main` (the 6
  content-addressing tests live only on `feat/content-addressed-files` — 454 there);
  `bun run format` clean; gitleaks clean.
- **Proof:** suite green with the function removed.
- **Open / next:** merge both PRs; ordering irrelevant (delete + feature touch the same file
  region, git merges trivially).
- **Derived decisions:** none. Removal rationale beyond cleanliness: the function was a
  rows-only bulk delete that never touched disk — a trap next to the new refcounted deletion
  if ever wired up assuming it was maintained.
