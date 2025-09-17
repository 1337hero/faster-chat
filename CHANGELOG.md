# Changelog

## 0.2.0 — Preact/Hono refactor, lighter footprint
- Migrated from Next.js to a Preact SPA (Vite, TanStack Router/Query) with Hono API at `/api/chat`.
- Dropped TypeScript to keep iteration loops fast and avoid compiler friction; favor runtime schemas where needed.
- Aligned package versions across the monorepo to `0.2.0`.
- Kept local-first persistence via Dexie with AI SDK streaming transport; preserved `_backup/` for historical Next.js code.
- Added `server/.env.example` to standardize provider/env configuration.

## 0.1.x — Next.js era
- Initial Next.js implementation with server-rendered pages and the early chat UI. Kept only for reference in `_backup/`.
