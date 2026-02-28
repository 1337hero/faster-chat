# Plan: Update Notification Banner

## Task Description
Implement an in-app update notification system for FasterChat. The server exposes its running version via `/api/version`, the frontend periodically checks GitHub Releases for a newer version, and a dismissible banner prompts users (admin-only) to upgrade. Follows the draft plan in `docs/upgrade-path.md`.

## Objective
When a newer FasterChat release exists on GitHub, admin users see a dismissible banner with the new version number and a link to release notes. Regular users are unaffected.

## Problem Statement
Self-hosted users have no visibility into whether they're running the latest version. They must manually check GitHub for releases. This is a common pain point for self-hosted software and a friction point for security/feature updates.

## Solution Approach
Three-layer approach matching `docs/upgrade-path.md`:

1. **Backend** — `/api/version` endpoint returns running version from `package.json`
2. **Frontend** — TanStack Query hook polls GitHub Releases API (every 6 hours, cached), compares to running version via semver string comparison
3. **UI** — Dismissible banner at top of MainLayout, admin-only, with "What's New" link to release notes. Dismissal persisted in `localStorage` per version so it reappears for the next release

No new dependencies required. Native `fetch` to GitHub API. Simple string semver comparison (split on `.`, compare segments) — no need for a semver library given we control the tag format.

## Relevant Files
Use these files to complete the task:

- `package.json` — source of `version` field (currently `0.2.0`)
- `server/src/index.js` — mount point for new version route
- `server/src/routes/settings.js` — pattern to follow for simple GET route
- `frontend/src/lib/api.js` — `apiFetch` utility for internal API calls
- `frontend/src/state/useAppSettings.js` — pattern for TanStack Query hook + query keys
- `frontend/src/components/layout/MainLayout.jsx` — banner mount point (above `{children}`)
- `frontend/src/state/useAuthState.js` — `useAuthState` provides `user.role` for admin check
- `docs/upgrade-path.md` — draft spec to follow

### New Files
- `server/src/routes/version.js` — `/api/version` GET endpoint
- `frontend/src/hooks/useUpdateCheck.js` — TanStack Query hook for version comparison
- `frontend/src/components/layout/UpdateBanner.jsx` — dismissible banner component

## Implementation Phases

### Phase 1: Foundation — Backend `/api/version`
- Create `server/src/routes/version.js` with a single GET route
- Read version from root `package.json` (use `createRequire` or read+parse at startup)
- Return `{ version: "0.2.0" }`
- Mount in `server/src/index.js` at `/api/version` (public, no auth needed)

### Phase 2: Core Implementation — Frontend Version Check
- Create `frontend/src/hooks/useUpdateCheck.js`:
  - Query 1: fetch `/api/version` to get running version (staleTime: Infinity, fetched once)
  - Query 2: fetch `https://api.github.com/repos/1337hero/faster-chat/releases/latest` (staleTime: 6 hours)
  - Compare `tag_name` (strip leading `v`) against running version using simple semver compare
  - Return `{ hasUpdate, latestVersion, currentVersion, releaseUrl, dismiss, isDismissed }`
  - Dismissal state: `localStorage` key `fc-update-dismissed-{version}` — dismissed per version
- No useEffect for state sync — derive `hasUpdate` as expression from both queries' data

### Phase 3: Integration & Polish — Banner UI
- Create `frontend/src/components/layout/UpdateBanner.jsx`:
  - Only renders for admin users (check `useAuthState` `user.role === 'admin'`)
  - Shows: "FasterChat v{latestVersion} is available" + "What's New" link + dismiss X button
  - Themed with existing Tailwind classes (`bg-theme-primary/10`, `text-theme-primary`, etc.)
  - Positioned at top of main content area in MainLayout
  - Transition: slide down on appear, `ease-snappy` timing
- Mount `<UpdateBanner />` in `MainLayout.jsx` above `{children}` inside `<main>`

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to the building, validating, testing, deploying, and other tasks.

### Team Members

- Builder
  - Name: backend-version
  - Role: Create the `/api/version` endpoint and mount it
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: frontend-update-check
  - Role: Create the useUpdateCheck hook and UpdateBanner component, integrate into MainLayout
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: validator
  - Role: Validate all files, test the endpoint, verify the banner renders correctly
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Create `/api/version` endpoint
- **Task ID**: create-version-endpoint
- **Depends On**: none
- **Assigned To**: backend-version
- **Agent Type**: general-purpose
- **Parallel**: true
- Create `server/src/routes/version.js`:
  - Import `Hono`, read version from `../../package.json` (use `import` with assert or `readFileSync` at module load)
  - Actually read from the **root** `package.json` — resolve path relative to server: `../../package.json`
  - Single GET `/` route returning `{ version }`
  - No auth required (public endpoint)
- Mount in `server/src/index.js`:
  - Import `versionRouter` from `./routes/version.js`
  - Add `app.route("/api/version", versionRouter)` alongside other public routes (near `settingsRouter`)

### 2. Create `useUpdateCheck` hook
- **Task ID**: create-update-check-hook
- **Depends On**: none
- **Assigned To**: frontend-update-check
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside task 1)
- Create `frontend/src/hooks/useUpdateCheck.js`:
  - `useCurrentVersion()` — TanStack Query fetching `/api/version`, staleTime Infinity
  - `useLatestRelease()` — TanStack Query fetching GitHub Releases API, staleTime 6 hours
    - URL: `https://api.github.com/repos/1337hero/faster-chat/releases/latest`
    - Use native `fetch` (not `apiFetch` — external URL, no credentials)
    - Extract `tag_name` and `html_url` from response
  - `useUpdateCheck()` — combines both queries:
    - Derive `hasUpdate` by comparing versions (strip `v` prefix, split on `.`, compare numeric segments)
    - Read/write localStorage for dismissal state keyed by version
    - Return `{ hasUpdate, latestVersion, currentVersion, releaseUrl, dismiss, isDismissed, isLoading }`
  - Simple semver compare function (no library): compare major, minor, patch as integers
  - Follow existing patterns: no useEffect, no useCallback, derive state as expressions

### 3. Create `UpdateBanner` component
- **Task ID**: create-update-banner
- **Depends On**: create-update-check-hook
- **Assigned To**: frontend-update-check
- **Agent Type**: general-purpose
- **Parallel**: false (depends on hook being created first)
- Create `frontend/src/components/layout/UpdateBanner.jsx`:
  - Import `useUpdateCheck` and `useAuthState`
  - Early return null if: not admin, no update, dismissed, or loading
  - Render a slim banner bar:
    - Background: `bg-theme-primary/10 border-b border-theme-primary/20`
    - Text: `text-theme-primary text-sm`
    - Content: "v{latestVersion} available" + anchor "Release Notes" → `releaseUrl` (target _blank)
    - Dismiss button: X icon, calls `dismiss()` from hook
    - Animate in: use CSS transition with `ease-snappy`
  - Keep it minimal — single div, no complex layout

### 4. Integrate banner into MainLayout
- **Task ID**: integrate-banner
- **Depends On**: create-update-banner
- **Assigned To**: frontend-update-check
- **Agent Type**: general-purpose
- **Parallel**: false
- Edit `frontend/src/components/layout/MainLayout.jsx`:
  - Import `UpdateBanner`
  - Place `<UpdateBanner />` as first child inside `<main>`, before `{children}`
  - No other changes needed — banner handles its own visibility logic

### 5. Final Validation
- **Task ID**: validate-all
- **Depends On**: create-version-endpoint, integrate-banner
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Verify `server/src/routes/version.js` exists and exports a Hono router
- Verify `server/src/index.js` mounts `/api/version`
- Verify `frontend/src/hooks/useUpdateCheck.js` uses TanStack Query (no useEffect for state sync)
- Verify `frontend/src/components/layout/UpdateBanner.jsx` checks admin role
- Verify `MainLayout.jsx` renders `<UpdateBanner />`
- Verify no useCallback, no useEffect for state derivation
- Verify localStorage key pattern for dismissal
- Run `bun run build` to confirm no build errors

## Acceptance Criteria
- `/api/version` returns `{ "version": "0.2.0" }` (matches root package.json)
- Frontend fetches GitHub Releases API with 6-hour cache (staleTime)
- Banner only appears for admin users when a newer version exists
- Banner is dismissible; dismissal persists per-version in localStorage
- Banner includes link to release notes (GitHub release URL)
- No new npm dependencies added
- No useEffect for state synchronization
- No useCallback
- Build passes (`bun run build`)

## Validation Commands
Execute these commands to validate the task is complete:

- `cd /home/mikekey/Builds/FasterChat/app && bun run build` — Verify project builds without errors
- `cd /home/mikekey/Builds/FasterChat/app && grep -r "useEffect" frontend/src/hooks/useUpdateCheck.js` — Should return nothing (no useEffect in the hook)
- `cd /home/mikekey/Builds/FasterChat/app && grep -r "useCallback" frontend/src/hooks/useUpdateCheck.js frontend/src/components/layout/UpdateBanner.jsx` — Should return nothing
- `cd /home/mikekey/Builds/FasterChat/app && grep "versionRouter" server/src/index.js` — Verify route is mounted
- `cd /home/mikekey/Builds/FasterChat/app && grep "role.*admin\|user\.role" frontend/src/components/layout/UpdateBanner.jsx` — Verify admin check exists

## Notes
- The GitHub Releases API is public and rate-limited to 60 req/hour for unauthenticated requests. With a 6-hour staleTime, this is well within limits even with many browser tabs.
- The repo slug is `1337hero/faster-chat` (confirmed from git remote).
- The existing `release.yml` CI workflow already creates GitHub Releases on version tags (`v*`), so releases will be available as soon as tags are pushed.
- No CHANGELOG.md syncing is in scope for this task — that's a separate CI concern.
- The version comparison is simple: we control the semver format, so a naive split-and-compare is sufficient.
