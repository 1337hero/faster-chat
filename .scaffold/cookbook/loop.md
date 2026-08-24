# Cookbook — the per-task loop (FRAME → WORK → REVIEW)

Pull this when a task is big enough to need structure. For a trivial one-liner the loop
collapses to: reproduce → fix → verify.

## FRAME — before you edit, be able to state
- **Shape:** fix / feature / review / investigation.
- **Intent source:** the originating GitHub Issue number/link or direct user task and, when open,
  the delivery PR.
- **Accepted refinements:** none, or the PR review decisions/comments that change or clarify the
  originating intent.
- **Context loaded:** the STATE facts, rails, log entries, and code loci this depends on.
- **Done means:** the resulting observable acceptance criteria after accepted PR refinements,
  and the test/proof or deliverable that ends it.
- **Out of scope:** the origin's boundary, including adjacent behavior that will not change.
- **Verification:** the cheapest checks that prove it.
- **Branch point:** none, or the steer you need from the human.

For a **fix**, write the failing test first — see it red *for the right reason*, then make it
green; a test that never failed proves nothing. For a **feature**, build to a stated intent;
the proof is a test that proves the new behavior. Scope to one coherent change.

## WORK — implement within the rails
- One canonical place for a behavior; reuse before you write; smallest change that works.
- Test at the cheapest tier that proves it (unit/contract before browser/e2e).
- Batch every unknown before each push (FK/constraint graph, enum/CHECK values, DOM selectors,
  auth targets) — one un-batched unknown is one wasted CI cycle. Keep the branch green.

## REVIEW — a real pass, not an attitude
- Re-read `.scaffold/rails/standards.md` and grep your diff for each rule it names.
- Compare the diff against your FRAME and accepted PR refinements: does it match "done means"
  and the scope boundary?
- For non-trivial changes, hand the diff to a **fresh-context reviewer** (a subagent / new
  session / `/code-review`) — same-context self-review catches typos, not design drift.
