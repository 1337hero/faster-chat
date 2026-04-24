# Faster Chat — Agent Guide

Privacy-first, offline-capable AI chat. **Preact + Hono + SQLite + Bun**, TanStack Router/Query, Tailwind 4, Vercel AI SDK.

Full docs: [README.md](./README.md). Contributor process: [CONTRIBUTING.md](./CONTRIBUTING.md).
`AGENTS.md` is `@CLAUDE.md`. This file is canonical for Claude Code, Codex, and any agent that respects either name.

## Repo layout

```
frontend/   Preact SPA — TanStack Router/Query, Tailwind 4, Vite
server/     Hono API — SQLite, AI SDK providers, Bun runtime
packages/   Shared internal packages (workspace)
scripts/    Build/deploy helpers
specs/      Feature specs (output of /plan_w_team)
.claude/    Project skills and sub-agents (see bottom)
```

## Commands

Runtime is **Bun**. Never npm/pnpm/yarn in this repo.

```bash
bun install              # install all workspaces
bun run dev              # frontend + server concurrently
bun run dev:frontend     # Vite dev server only
bun run dev:server       # Hono/Bun server only
bun run build            # build both
bun run test             # server tests (bun test)
bun run format           # prettier
```

## Working style

Emit tool calls directly. No preamble like "I'll now read the file."

**Execution.** Interleave reads with edits. Don't map the whole repo first. Turn tasks into verifiable goals — "fix bug" → reproducing test → pass. Multi-step work: use `/plan_w_team` to state the plan with verify steps, loop until verified. Stop when done, blocked, or need clarification.

**Surgical changes.** Every changed line traces to the request. Don't improve adjacent code, don't refactor the un-broken, match existing style. Orphan imports/vars from your changes: remove. Pre-existing dead code: mention, don't delete.

**Code philosophy.** Minimum code that solves the stated problem. No speculative abstractions, no configurability nobody asked for, no error handling for impossible cases. Boring over clever. Readable over terse. Comments are a code smell — omit unless asked. If 200 lines could be 50, rewrite.

**When unsure.** Ambiguous request → ask. Multiple valid approaches → present options, don't pick silently. Uncertain → say so.

**Response style.** Telegraphic. Noun phrases fine. Don't narrate the diff — the user reads it.

## Frontend code rules (hard constraints)

Full spec: [`.claude/skill/frontend-philosophy/SKILL.md`](./.claude/skill/frontend-philosophy/SKILL.md). Claude Code auto-loads it on React/Preact work. Rules below are the non-negotiable subset every agent must follow.

- **No TypeScript.** `.jsx` components, `.js` utilities. Runtime validation at boundaries only.
- **Server state → TanStack Query.** Never duplicate API data in `useState` or Zustand.
- **Client state → Zustand or Preact Signals.** UI-only (modals, theme, filters).
- **Derive, don't duplicate.** Value computable from existing state: compute in render. No `useState` for derived values.
- **No `useCallback`.** Event handlers don't need it. Reaching for it means your `useEffect`/`useMemo` deps are wrong.
- **`useEffect` is a last resort.** Valid: DOM sync, external subscriptions, cleanup, analytics. Not: syncing state between variables, reacting to props.
- **No barrel files.** No `index.ts/js` re-exports.
- **Feature-based folders.** `components/billing/`, not `components/forms/`.
- **8-section component structure.** Server state → client state → derived → handlers → effects (rare) → early returns → render helpers → JSX. See skill reference.
- **Composition over configuration.** Pass `children`, not dozens of boolean props. No prop drilling past 2 levels.
- **Data flows down, events flow up.** Fetch once at the highest component that needs it.

Before adding state or an effect: can this be an expression? Derivable from props, query data, or existing state?

## CSS / animation (project-specific)

- **`ease-snappy`** = `cubic-bezier(.2, .4, .1, .95)` (defined in `frontend/vite.config.js`). Use for UI micro-interactions.
- **Specific transitions**: `transition-colors`, `transition-transform`. Never `transition-all`.
- **Durations**: 75ms hover, 150ms max for most UI.
- **GPU acceleration**: `transform-gpu` on `animate-*`, `transition-transform`, and transform classes (`translate-*`, `rotate-*`, `scale-*`).
- **Scroll containers**: `overflow-y-scroll` + `scrollbar-gutter: stable both-edges`. Keep fixed overlays outside the scroll container.
- **Slide animations**: `translate-x/y` transforms, not `left/top/opacity`.

## Available sub-agents (`.claude/agents/`)

- `code-reviewers/` — review diffs against repo standards
- `data-flow-reviewer` — auth/ownership/data-integrity sweep across SQLite → Hono → Preact
- `testers/` — write tests for changes

## Available skills (`.claude/skill/`)

- `frontend-philosophy` — auto-triggers on React/Preact work; full spec
- `systematic-debugging` — use on bugs/test failures before proposing fixes
- `test-driven-development` — red-green-refactor
- `insecure-defaults` — audit config/secrets/permissive defaults
