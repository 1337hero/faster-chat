# 2026-08-24 — port gitleaks pre-commit hook from SRWP

**Origin:** Direct user task — set up a githook like SRWP's `.githooks/pre-commit` on the
`chore/scaffold-rails` branch. (shape: chore)

**Delivery:** Not opened. Committed on `chore/scaffold-rails` (b737c7d).
Key files: `.githooks/pre-commit`, `.gitleaks.toml`, `CONTRIBUTING.md`.

**Intent changes:** none.

**Requirements satisfied:**
- Pre-commit hook runs `gitleaks protect --staged`, skips with a warning when gitleaks is
  not installed (Arch install hint instead of brew).
- `.gitleaks.toml` extends the default ruleset and allowlists `server/src/test/.*` (dummy
  `API_KEY_ENCRYPTION_KEY` and `BSA_test_key_*` fixtures).
- `core.hooksPath` enabled locally; one-line setup added to CONTRIBUTING.md dev setup.

**Remaining scope:** none.

**Verification ledger:**
- Hook on clean staged files → passes.
- Hook on a staged file containing a realistic `ghp_*` token → blocks with exit 1.
- `gitleaks dir server/src/test -c .gitleaks.toml` → 0 bytes scanned (allowlist skips).
- Whole-repo dir scan with config: only remaining findings are gitignored local env files
  (`.env.backup`, `server/.env`) — never staged, invisible to the hook. No real repo leaks.
- Commit b737c7d itself ran through the real hook.
- Side quest resolved: suspected a gitleaks v8.30.1 regression (issue #2170) when test
  tokens weren't caught — false alarm; the test strings contained the `abcdefghijklmnopqrstuvwxyz`
  stopword and AWS-docs example keys, both intentionally allowlisted upstream.

**Proof:** Hook is the proof; it gates every local commit. Full-history scan (8 findings, all
test fixtures) confirms nothing real leaked historically.

**Open / next:** PR for the branch; contributors must run `git config core.hooksPath .githooks`
once per clone (documented in CONTRIBUTING.md).

**Derived decisions (ratify in PR?):**
- Allowlist scoped to `server/src/test/.*` only — narrower than SRWP's generic `__tests__`
  pattern since this repo's fixtures live there. Ratify in PR.
