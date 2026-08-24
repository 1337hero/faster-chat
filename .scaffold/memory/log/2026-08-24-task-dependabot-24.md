# 2026-08-24 — fix dependabot alert #24: adm-zip zip-bomb OOM

**Origin:** Direct user task — tackle dependabot alert
https://github.com/1337hero/faster-chat/security/dependabot/24. (shape: fix)

**Delivery:** PR #43 (https://github.com/1337hero/faster-chat/pull/43). Commits on `chore/scaffold-rails` (9cb6b5d).
Key files: `server/package.json`, `bun.lock`.

**Intent changes:** none.

**Requirements satisfied:**
- `adm-zip` bumped 0.5.17 → 0.6.0 in server workspace. Alert (GHSA-xcpc-8h2w-3j85,
  CVE-2026-39244, CVSS 7.5 high): crafted ZIP declaring a huge uncompressed size forced an
  unbounded Buffer.alloc → OOM. 0.6.0 bounds allocation by data actually present.
- Pre-upgrade review of 0.6.0 breaking changes: only `extractEntryTo` behavior and Node>=14
  engines — neither touches this repo's usage (`AdmZip` ctor, `getEntries`, `entry.header`,
  `getData`).

**Remaining scope:** none. Dependabot alert auto-closes when this lands on main.

**Verification ledger:**
- `bun run test` → 420 pass, 0 fail.
- `bun test src/test/officeExtraction.test.js` → 32 pass incl. decompression-bomb guard.

**Proof:** Existing office-extraction test suite (32 tests) exercises the exact code paths
using adm-zip; all green on 0.6.0.

**Open / next:** PR needs the `deps-approved` label to pass repo-guard's dependency check.

**Derived decisions:** none.
