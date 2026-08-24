# 2026-08-24 — port repo-guard workflow from SRWP

**Origin:** Direct user task — port `.github/workflows/repo-guard.yml` from SRWP onto the
`chore/scaffold-rails` branch. (shape: chore)

**Delivery:** PR #43 (https://github.com/1337hero/faster-chat/pull/43). Commits on `chore/scaffold-rails` (878863b).
Key files: `.github/workflows/repo-guard.yml`.

**Intent changes:** none.

**Requirements satisfied:**
- Four guard checks run on PRs: foreign lockfiles, unreviewed dependency changes
  (unlocked by `deps-approved` label), quiet edits to rule files — AGENTS.md, CLAUDE.md,
  `.scaffold/rails/`, CODEOWNERS, repo-guard.yml itself (unlocked by `governance-approved`),
  and package-manager command drift.

**Remaining scope:** none.

**Verification ledger:**
- `bunx yaml-lint` → passes.
- deps loop run locally with BASE_SHA=HEAD → "no false positives" across all 4 tracked
  package.json files.
- drift regex negative test catches `+ npm install`.
- branch diff vs main checked for drift lines → none.

**Proof:** The workflow is CI itself; it fails green on any future PR that breaks a rule.

**Open / next:** Open the PR for this branch. Note: the PR adding repo-guard.yml trips its own
rule-files check — add the `governance-approved` label to let it pass. Labels `deps-approved`
and `governance-approved` must exist in the repo (create on first use or via labeler config).

**Derived decisions (ratify in PR?):**
- Adapted the deps step to loop over every tracked package.json: this is a Bun workspace
  monorepo (frontend/, server/, packages/shared/); SRWP's root-only check would only have
  guarded devDependencies. Ratify in PR.
- Dropped the "AGENTS.md requires..." phrasing from the deps error message — this repo's
  AGENTS.md doesn't state that rule; the workflow defines it. Ratify in PR.
