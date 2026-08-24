# Project State

_Last updated: 2026-08-24 (repo-guard pointer added on chore/scaffold-rails)_

## What this project is
Faster Chat — privacy-first, offline-capable AI chat you self-host. Preact SPA + Hono API on
Bun with SQLite, talking to model providers through the Vercel AI SDK. Single-user/small-scale
deployments; production instance at app.fasterchat.ai.

## Current focus
Maintain mode: bug fixes, deploy/docker hardening, and structural cleanup — not new features
(see #38 for the roadmap alignment).

## In flight
None — GitHub Issues and PRs own the active queue.

## Last shipped
2026-08 — #41: docker starts without `server/.env` and persists the encryption key.

## Last verified
2026-08-24 — `main` clean at 1c0644b; `bun run test` is the local gate.

## Known issues / watch list
None durable beyond the issue tracker.

## Key files / commands
> A hand-curated prior — verify against the code; reality wins on facts.

| File / command | Why it matters |
|---|---|
| `bun run dev` | frontend + server concurrently (Bun only — never npm/pnpm/yarn) |
| `bun run test` | server tests (`bun test`) |
| `bun run build` / `bun run format` | build both workspaces / prettier |
| `CLAUDE.md` | canonical agent guide; `AGENTS.md` is `@CLAUDE.md` |
| `.claude/skill/frontend-philosophy/SKILL.md` | full frontend rules (no TS, state discipline) |
| `.github/workflows/repo-guard.yml` | PR gate: lockfiles, deps (`deps-approved`), rule edits (`governance-approved`), PM drift |
| `.githooks/pre-commit` | gitleaks scan on commit; enable per clone: `git config core.hooksPath .githooks` |
| `frontend/vite.config.js` | defines `ease-snappy` and build config |
| `specs/` | feature specs from `/plan_w_team` |
