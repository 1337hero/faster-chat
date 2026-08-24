# Cookbook — CLOSE OUT (session end, run once)

A change is a cause: the next session inherits whatever you leave. Leave it clean.

## 1. Update `STATE.md` only when shared operational truth changed
Do not touch `.scaffold/memory/STATE.md` merely to prove the task happened. Concurrent branches
would all rewrite the same snapshot and create meaningless merge conflicts. Update it only when
the shared operational picture materially changed: what is live, a durable blocker/watch item,
or a project-wide command or architecture pointer. GitHub Issues and PRs own the active queue;
the per-intent log owns this task's outcome.

**Routing rule — where an update lands (get this wrong and STATE rots):**
- *Shared operational status* (what's live, durable blockers, current project focus) →
  **`STATE.md`**, only when materially changed.
- *Historical record* (what happened this session, the proof, derived decisions) → a **log entry**.
- *Durable design* (an invariant, a standard, the architecture) → **`.scaffold/rails/`** or a design doc — never STATE.

## 2. Append a per-intent log entry (additive history — never rewrite a past entry)
Use `.scaffold/memory/log/YYYY-MM-DD-issue-<number>-<slug>.md`, or
`YYYY-MM-DD-pr-<number>-<slug>.md` when no issue exists and a PR number is available. Otherwise,
use `YYYY-MM-DD-task-<slug>.md`. The intent identifier keeps concurrent branches from choosing
the same path.

The entry contains:
- **Origin:** GitHub Issue number/link or direct user task, plus shape (fix / feature / review /
  investigation).
- **Delivery:** PR number/link and key files, or `not opened`.
- **Intent changes:** accepted PR review decisions/comments that changed or clarified the origin;
  link the exact thread when material, or state `none`.
- **Requirements satisfied:** the observable acceptance criteria now proven — name them rather
  than writing `all` so the record survives later issue edits.
- **Remaining scope:** issue work deliberately left open, or `none`.
- **Verification ledger:** the checks you ran, their result, and any check you skipped + why.
- **Proof:** the test that protects it.
- **Open / next:** the natural next step on the issue or PR.
- **Derived decisions:** anything you derived rather than asked — flag "ratify in PR?" when material.

## 3. Run the closeout self-check (mechanical — fails loudly)
Any shell-capable agent runs this before declaring done. It turns the keystone rails (not on
the default branch, log written, no secrets) from read-and-trusted prose into a gate:

```bash
bash .scaffold/cookbook/closeout-check.sh   # works from anywhere in the repo
```

It diffs code against the merge-base with the default branch and includes dirty paths, so both
committed and uncommitted work are covered. It passes untouched when no code changed, so a
read-only session owes no ceremony.

## 4. Re-confirm the hard rails held
Branch+PR (not main), no secrets, in scope, green. (A re-check of REVIEW, not a first look.)

## 5. If something genuinely needs the human
State it as a steer — fork + recommendation + reason — not a vague question.

> The memory **is** the project's continuity across sessions, agents, and runtimes. Never end
> with code shipped and no per-intent closeout record.
