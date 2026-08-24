# Project standards

> Enforceable rules for **this** repo. REVIEW checks the diff against these before closeout.
> Tag each rule **`Check:`** (a tool can verify it — name the tool) or **`Judgment:`** (a
> human/agent call). **Promote `Judgment:` → `Check:` whenever a tool can take it over** — a rule
> a human has to remember is the weakest kind. Keep the list few, specific, and current.

## Principles
1. **Simplicity over cleverness** — code a junior dev understands.
2. **Convention over configuration** — follow existing patterns, don't invent.
3. **Optimize for understanding** — code is read 10x more than written.
4. **Embrace the monolith** — colocate related concerns, don't split prematurely.
5. **Performance through simplicity** — the fastest code is code that doesn't run.

## The Ladder — pick the first rung that holds
A reflex, not a research project. Run it **after** you understand the problem (read the task and
the code it touches, trace the real flow end to end), then climb. Two rungs work → take the higher
one and move on. The first minimal solution that works is the right one — once you actually know what
the change has to touch.

- **L1. Does this need to exist at all?** Speculative need → skip it, say so in one line. (YAGNI)
  **Judgment:** (review).
- **L2. Already in this codebase?** A helper, util, type, or pattern that already lives here →
  reuse it. Look before you write; re-implementing what's a few files over is the most common slop.
  **Check:** `grep` / `rg` for the concept before adding a new symbol.
- **L3. Stdlib does it?** Use it. **Judgment:** (review).
- **L4. Native platform feature covers it?** `<input type="date">` over a picker lib, CSS over JS,
  DB constraint over app code. **Judgment:** (review).
- **L5. Already-installed dependency solves it?** Use it. Never add a new one for what a few lines
  can do. **Check:** `package.json` / lockfile diff — no new dependency unless justified in the PR.
- **L6. Can it be one line?** One line. **Judgment:** (review).
- **L7. Only then:** the minimum code that works.

## Conventions
- **Bun only** — never npm/pnpm/yarn in this repo. **Check:** no `package-lock.json`/`pnpm-lock.yaml`/`yarn.lock` in the diff.
- **No TypeScript** in frontend — `.jsx` components, `.js` utilities; runtime validation at boundaries only. **Check:** no new `.ts`/`.tsx` under `frontend/`.
- Server state → TanStack Query, never duplicated into `useState`/Zustand. Client/UI state → Zustand or Signals. Derived values computed in render, not stored. **Judgment:** (review; full spec in `.claude/skill/frontend-philosophy/SKILL.md`).
- No `useCallback`; `useEffect` only for DOM sync, subscriptions, cleanup, analytics. **Check:** `rg useCallback frontend/` on the diff.
- Components under ~200 lines; extract past that. **Judgment:** (review).
- No barrel files; import from the source file. **Check:** `rg 'index\.(js|jsx)$'` on new files.
- Feature-based folders (`components/billing/`, not `components/forms/`). **Judgment:** (review).
- Transitions: `transition-colors`/`transition-transform`, never `transition-all`; 75ms hover, 150ms max. **Check:** `rg transition-all frontend/` on the diff.
- One canonical place for a behavior; reuse before you write (rule of 3). **Judgment:** (review).

## Bug fixes — root cause, not symptom
A report names a symptom. Before you edit, **grep every caller** of the function you're about to
touch. The minimal fix IS the root-cause fix: one guard in the shared function is a smaller diff than
a guard in every caller — and patching only the path the ticket names leaves every sibling caller
still broken. Fix it once, where all callers route through.
**Check:** `grep`/`rg` the symbol's call sites; the fix must cover every non-dead caller.

## Testing
- Cheapest tier that proves it; browser/e2e only for real user journeys. **Judgment:**.
- Every bug fix lands a regression test that fails before the fix. **Check:** (CI: red-before-green).

## Definition of done
- Required checks green; reviewed by someone other than the author; reversible with a known
  rollback. **Check:** (CI + PR gate).

## Stack notes
- **Stack:** Preact + Hono + SQLite + Bun. TanStack Router/Query, Tailwind 4, Vercel AI SDK.
- **Commands:** `bun install` · `bun run dev` (frontend + server) · `bun run build` · `bun run test` (server, `bun test`) · `bun run format`.
- **Branch model:** work on `feat/`, `fix/`, `chore/` branches mirroring the conventional-commit prefix; PR into `main`.
- **Deploy:** Hetzner bare metal (Alpine/OpenRC) at app.fasterchat.ai; deploy script lives outside this repo.
- `AGENTS.md` is `@CLAUDE.md` — CLAUDE.md is canonical for all agents.
