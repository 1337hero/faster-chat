# Plan: Comprehensive Test Coverage for FasterChat

## Task Description
FasterChat currently has **zero tests**. This plan introduces comprehensive test coverage across the entire backend API surface and shared utilities, using Bun's built-in test runner (`bun test`) with integration-style tests that exercise real code paths through public interfaces. Tests follow TDD philosophy: verify behavior, not implementation.

## Objective
Establish a test suite that covers all critical paths — auth, chat CRUD, message persistence, file handling, folder organization, admin operations, provider/model management, encryption, and shared utilities — giving confidence to ship changes and accept contributions.

## Problem Statement
- Zero test files exist in the project
- CI only checks formatting and builds — no test step
- Critical paths (auth, encryption, chat streaming, file uploads) have no automated verification
- Contributors have no safety net for regressions
- The README promises "tests for critical paths" but none exist

## Solution Approach
- Use **Bun's built-in test runner** (`bun:test`) — no extra dependencies, fast, already in the runtime
- Focus on **backend integration tests** that hit real Hono route handlers with real SQLite (in-memory)
- Add **unit tests** for pure utility functions (encryption, file validation, formatters)
- Use **test-scoped databases** (fresh in-memory SQLite per test file) to avoid state leaks
- Add a `test` script to `package.json` and a CI job
- Follow TDD vertical slice approach: each test describes one behavior

## Relevant Files

### Existing Files (test targets)
- `server/src/routes/auth.js` — Registration, login, logout, session, password change
- `server/src/routes/chats.js` — Chat CRUD, messages, completion streaming
- `server/src/routes/admin.js` — User management, audit log, chat purge
- `server/src/routes/providers.js` — Provider CRUD, model refresh, SSRF validation
- `server/src/routes/files.js` — File upload, download, delete, access control
- `server/src/routes/folders.js` — Folder CRUD, chat organization, collapse toggle
- `server/src/routes/settings.js` — App settings (key-value store)
- `server/src/routes/models.js` — Model listing, enable/disable, default model
- `server/src/routes/import.js` — ChatGPT conversation import
- `server/src/lib/encryption.js` — AES-256-GCM encrypt/decrypt API keys
- `server/src/lib/security.js` — Argon2 password hashing/verification
- `server/src/lib/fileUtils.js` — File validation, sanitization, hashing
- `server/src/lib/db.js` — Database utilities (all dbUtils methods)
- `server/src/lib/providerFactory.js` — Provider instance creation
- `server/src/lib/requestUtils.js` — IP extraction from proxy headers
- `server/src/middleware/auth.js` — Session middleware, role middleware
- `server/src/middleware/rateLimiter.js` — Per-endpoint rate limiting
- `packages/shared/src/utils/formatters.js` — formatFileSize, formatPrice, formatContextWindow
- `packages/shared/src/utils/providerValidation.js` — Provider validation utilities

### New Files
- `server/src/test/helpers.js` — Test helpers: create test app, seed users, get auth cookies
- `server/src/test/auth.test.js` — Auth route tests
- `server/src/test/chats.test.js` — Chat CRUD + message tests
- `server/src/test/admin.test.js` — Admin route tests
- `server/src/test/providers.test.js` — Provider management tests
- `server/src/test/files.test.js` — File upload/download tests
- `server/src/test/folders.test.js` — Folder organization tests
- `server/src/test/encryption.test.js` — Encryption unit tests
- `server/src/test/fileUtils.test.js` — File utility unit tests
- `server/src/test/formatters.test.js` — Shared formatter unit tests
- `server/src/test/middleware.test.js` — Auth/rate-limit middleware tests

## Implementation Phases

### Phase 1: Foundation
Set up the test infrastructure — test helpers, in-memory database factory, test app factory, CI integration. This is the scaffolding everything else builds on.

**Key design decisions:**
- Each test file gets a fresh in-memory SQLite database (no state leaks between files)
- Test helper creates a real Hono app with all middleware/routes wired up
- Auth helper creates a user and returns a session cookie for authenticated requests
- No external mocks — tests hit real route handlers with real database operations
- Only mock external services (AI SDK streaming, Ollama API, models.dev)

### Phase 2: Core Implementation
Write tests in priority order — auth first (everything depends on it), then chat CRUD (core feature), then admin, providers, files, folders. Each test file follows TDD vertical slices.

**Priority order:**
1. Encryption + security utilities (pure functions, no deps)
2. File utilities + formatters (pure functions)
3. Auth routes (registration, login, session, logout)
4. Chat routes (CRUD, messages)
5. Admin routes (user management, audit log)
6. Provider routes (CRUD, model refresh)
7. File routes (upload, download, access control)
8. Folder routes (CRUD, chat organization)
9. Middleware (auth guards, rate limiting)

### Phase 3: Integration & Polish
Add CI test job, verify all tests pass in clean environment, add test script to package.json.

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to do the building, validating, testing, and other tasks.

### Team Members

- Builder
  - Name: test-foundation-builder
  - Role: Sets up test infrastructure — helpers, test DB factory, package.json scripts, CI config
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: unit-test-builder
  - Role: Writes unit tests for pure utility functions (encryption, fileUtils, formatters, security)
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: integration-test-builder
  - Role: Writes integration tests for all API routes (auth, chats, admin, providers, files, folders)
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: middleware-test-builder
  - Role: Writes tests for middleware (auth guards, rate limiting, security headers)
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: ci-builder
  - Role: Adds test job to CI workflow and verifies all tests pass
  - Agent Type: general-purpose
  - Resume: true

- Validator
  - Name: test-validator
  - Role: Runs full test suite, verifies coverage targets, checks for flaky tests
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Set Up Test Infrastructure
- **Task ID**: setup-test-infra
- **Depends On**: none
- **Assigned To**: test-foundation-builder
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `server/src/test/helpers.js` with:
  - `createTestDb()` — returns fresh in-memory SQLite database with all tables/migrations applied (mirror `db.js` schema creation but use `:memory:`)
  - `createTestApp(db)` — returns Hono app with all routes wired to the test db
  - `createTestUser(db, { username, password, role })` — creates user with hashed password, returns user record
  - `getAuthCookie(app, { username, password })` — logs in and returns session cookie string for use in subsequent requests
  - `seedAdminUser(db)` — convenience: creates admin user, returns { user, cookie }
  - `seedMemberUser(db)` — convenience: creates member user, returns { user, cookie }
- Add `"test": "bun test server/src/test/"` to root `package.json` scripts
- Add `"test": "bun test src/test/"` to `server/package.json` scripts
- Ensure helpers import from `bun:test` and use `bun:sqlite` directly

**Important implementation note on test DB isolation:**
The current `db.js` creates a module-level singleton database. Tests need to work around this. The approach:
- Test helpers create an in-memory `Database` instance and call the same schema creation SQL
- Create a `dbUtils`-compatible object that wraps the test DB (or re-export a factory version of dbUtils)
- Route handlers need to accept the db via dependency injection OR tests can use the Hono `app.request()` pattern with a fresh app per test file

### 2. Write Encryption Unit Tests
- **Task ID**: test-encryption
- **Depends On**: setup-test-infra
- **Assigned To**: unit-test-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with test-fileutils, test-formatters)
- Create `server/src/test/encryption.test.js`
- Test behaviors:
  - Encrypting an API key produces encryptedKey, iv, and authTag (all non-empty strings)
  - Decrypting with correct key/iv/authTag returns original plaintext
  - Encrypt → decrypt roundtrip preserves the original value
  - Decrypting with wrong authTag throws error
  - Encrypting empty/null key throws error
  - Decrypting with missing parameters throws error
  - `maskApiKey` shows first 7 + last 4 chars with "..." in between
  - `maskApiKey` returns "***" for short keys
  - `generateEncryptionKey` returns 64-char hex string (32 bytes)

### 3. Write File Utility Unit Tests
- **Task ID**: test-fileutils
- **Depends On**: setup-test-infra
- **Assigned To**: unit-test-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with test-encryption, test-formatters)
- Create `server/src/test/fileUtils.test.js`
- Test behaviors:
  - `sanitizeFilename` strips path separators (`/`, `\`)
  - `sanitizeFilename` strips null bytes
  - `sanitizeFilename` strips leading dots (prevents hidden files)
  - `sanitizeFilename` returns default filename for empty input
  - `sanitizeFilename` truncates to max length while preserving extension
  - `createStoredFilename` prepends UUID with underscore
  - `validateFileType` accepts allowed MIME types (image/png, application/pdf, etc.)
  - `validateFileType` rejects disallowed types (application/exe, image/svg+xml, etc.)
  - `validateFileSize` accepts files within limit
  - `validateFileSize` rejects files over limit
  - `validateFileSize` rejects zero-byte files
  - `validateFile` returns `{ valid: true }` for good files
  - `validateFile` returns error message for bad type or size
  - `calculateFileHash` returns consistent SHA-256 hex digest
  - `validateFileAccess` allows owner access
  - `validateFileAccess` allows admin access to any file
  - `validateFileAccess` denies non-owner non-admin access
  - `validateFileAccess` returns "File not found" for null file
  - `getMimeTypeFromExtension` maps known extensions correctly
  - `getMimeTypeFromExtension` returns null for unknown extensions

### 4. Write Formatter Unit Tests
- **Task ID**: test-formatters
- **Depends On**: setup-test-infra
- **Assigned To**: unit-test-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with test-encryption, test-fileutils)
- Create `server/src/test/formatters.test.js`
- Test behaviors:
  - `formatFileSize(0)` returns "0 Bytes"
  - `formatFileSize(1024)` returns "1 KB"
  - `formatFileSize(1048576)` returns "1 MB"
  - `formatPrice(null)` returns "Free"
  - `formatPrice(0)` returns "Free"
  - `formatPrice(2.5)` returns "$2.50"
  - `formatContextWindow(null)` returns "Unknown"
  - `formatContextWindow(128000)` returns "128K"
  - `formatContextWindow(1000000)` returns "1.0M"

### 5. Write Auth Route Tests
- **Task ID**: test-auth
- **Depends On**: setup-test-infra
- **Assigned To**: integration-test-builder
- **Agent Type**: general-purpose
- **Parallel**: false (foundation for other integration tests)
- Create `server/src/test/auth.test.js`
- Test behaviors:
  - **Registration:**
    - First user registration succeeds and returns admin role
    - First user registration returns 201 with user object and session cookie
    - Second registration attempt returns 403 (registration locked after first user)
    - Registration with short username (< 3 chars) returns 400
    - Registration with short password (< 8 chars) returns 400
    - Registration with duplicate username returns 400
  - **Login:**
    - Login with valid credentials returns 200 with user object and session cookie
    - Login with wrong password returns 401
    - Login with non-existent username returns 401
    - Login response never includes password hash
  - **Session:**
    - GET /session with valid cookie returns user info
    - GET /session without cookie returns 401
    - GET /session with expired/invalid cookie returns 401
  - **Logout:**
    - POST /logout clears session cookie
    - POST /logout invalidates session (subsequent /session returns 401)
  - **Password change:**
    - PUT /change-password with correct current password succeeds
    - PUT /change-password with wrong current password returns 401
    - PUT /change-password invalidates old sessions
    - PUT /change-password with short new password returns 400

### 6. Write Chat Route Tests
- **Task ID**: test-chats
- **Depends On**: test-auth
- **Assigned To**: integration-test-builder
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `server/src/test/chats.test.js`
- Test behaviors:
  - **Chat CRUD:**
    - POST /chats creates a chat and returns 201
    - POST /chats with title sets the title
    - POST /chats with folder_id assigns to folder
    - POST /chats with invalid folder_id returns 404
    - GET /chats returns user's chats (paginated)
    - GET /chats does not return other user's chats (ownership isolation)
    - GET /chats/:id returns specific chat
    - GET /chats/:id for other user's chat returns 404
    - PATCH /chats/:id updates title
    - DELETE /chats/:id soft-deletes (no longer in list, but not hard-deleted)
  - **Messages:**
    - POST /chats/:id/messages adds message and returns 201
    - POST /chats/:id/messages with fileIds validates file ownership
    - POST /chats/:id/messages with invalid fileIds returns 403
    - GET /chats/:id/messages returns messages in chronological order
    - GET /chats/:id/messages respects pagination (limit/offset)
    - DELETE /chats/:id/messages/:msgId removes message
    - First user message auto-generates chat title (truncation fallback)
  - **Pin/Archive:**
    - POST /chats/:id/pin pins the chat
    - DELETE /chats/:id/pin unpins the chat
    - POST /chats/:id/archive archives the chat
    - DELETE /chats/:id/archive unarchives the chat
    - Pinned chats appear before unpinned in list
  - **Auth guard:**
    - All chat endpoints return 401 without session cookie

### 7. Write Admin Route Tests
- **Task ID**: test-admin
- **Depends On**: test-auth
- **Assigned To**: integration-test-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with test-chats)
- Create `server/src/test/admin.test.js`
- Test behaviors:
  - **Access control:**
    - All admin endpoints return 401 without session
    - All admin endpoints return 403 for non-admin (member) users
  - **User management:**
    - GET /admin/users returns all users (admin only)
    - POST /admin/users creates new user with specified role
    - POST /admin/users with duplicate username returns 400
    - POST /admin/users with invalid role returns 400
    - PUT /admin/users/:id/role changes user role
    - PUT /admin/users/:id/role prevents self-demotion
    - PUT /admin/users/:id/role for non-existent user returns 404
    - PUT /admin/users/:id/password resets password
    - DELETE /admin/users/:id deletes user
    - DELETE /admin/users/:id prevents self-deletion
  - **Audit log:**
    - GET /admin/audit-log returns audit entries (paginated)
    - Login/register/role changes create audit entries
  - **Purge:**
    - DELETE /admin/chats/purge removes old soft-deleted chats

### 8. Write Provider Route Tests
- **Task ID**: test-providers
- **Depends On**: test-auth
- **Assigned To**: integration-test-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with test-chats, test-admin)
- Create `server/src/test/providers.test.js`
- Test behaviors:
  - **Access control:**
    - All provider endpoints require admin role
  - **Provider CRUD:**
    - POST /admin/providers creates provider with encrypted API key
    - POST /admin/providers with duplicate name returns 400
    - GET /admin/providers lists providers without decrypted keys
    - PUT /admin/providers/:id updates display name and base URL
    - PUT /admin/providers/:id with new API key re-encrypts
    - DELETE /admin/providers/:id deletes provider and cascades to models
  - **SSRF validation:**
    - POST with metadata service URLs (169.254.169.254) returns 400
    - POST with non-http protocol returns 400
  - **Model management:**
    - POST /admin/providers/:id/models/enable toggles all models
    - POST /admin/providers/:id/refresh-models replaces models atomically

### 9. Write Folder Route Tests
- **Task ID**: test-folders
- **Depends On**: test-auth
- **Assigned To**: integration-test-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with test-chats, test-admin, test-providers)
- Create `server/src/test/folders.test.js`
- Test behaviors:
  - **Folder CRUD:**
    - POST /folders creates folder with name and optional color
    - POST /folders validates name length
    - POST /folders validates hex color format
    - GET /folders returns user's folders
    - GET /folders/:id returns specific folder
    - GET /folders/:id for other user returns 404
    - PUT /folders/:id updates name, color, position
    - DELETE /folders/:id deletes folder and unassigns chats
  - **Chat organization:**
    - GET /folders/:id/chats returns chats in folder
    - PUT /folders/:folderId/chats/:chatId moves chat to folder
    - PUT /folders/none/chats/:chatId removes chat from folder
  - **Toggle:**
    - POST /folders/:id/toggle flips collapsed state

### 10. Write Middleware Tests
- **Task ID**: test-middleware
- **Depends On**: setup-test-infra
- **Assigned To**: middleware-test-builder
- **Agent Type**: general-purpose
- **Parallel**: true (with unit tests)
- Create `server/src/test/middleware.test.js`
- Test behaviors:
  - **ensureSession:**
    - Request without cookie returns 401
    - Request with invalid session returns 401
    - Request with valid session sets user on context
  - **requireRole:**
    - Admin user passes admin-required routes
    - Member user is rejected from admin routes (403)
    - Readonly user is rejected from admin routes (403)
  - **optionalAuth:**
    - Sets user when cookie present
    - Sets user to null when no cookie
  - **getClientIP:**
    - Returns x-forwarded-for first entry when TRUST_PROXY is true
    - Returns x-real-ip when forwarded-for absent
    - Returns socket remoteAddress when no proxy headers
    - Returns "local" when no IP source available

### 11. Add Test Job to CI
- **Task ID**: ci-test-job
- **Depends On**: test-auth, test-chats, test-admin, test-providers, test-folders, test-middleware, test-encryption, test-fileutils, test-formatters
- **Assigned To**: ci-builder
- **Agent Type**: general-purpose
- **Parallel**: false
- Add `test` job to `.github/workflows/ci.yml`:
  - Setup Bun, install deps, set required env vars (API_KEY_ENCRYPTION_KEY)
  - Run `bun test`
  - Add as required check alongside format-check and builds

### 12. Final Validation
- **Task ID**: validate-all
- **Depends On**: ci-test-job
- **Assigned To**: test-validator
- **Agent Type**: validator
- **Parallel**: false
- Run `bun test` from project root — all tests pass
- Verify no tests depend on execution order (run with `--rerun-each 2`)
- Verify no tests leak state (each file works in isolation)
- Verify CI workflow YAML is valid
- Count total test cases — target: 100+ behavioral assertions

## Acceptance Criteria
- [ ] `bun test` runs from project root and passes all tests
- [ ] All API routes have at least happy-path + auth-guard tests
- [ ] Encryption roundtrip is verified
- [ ] File validation edge cases are covered
- [ ] No test depends on another test file's state
- [ ] CI runs tests on every PR and push to main
- [ ] Tests use real database operations (in-memory SQLite), not mocks
- [ ] Test helper makes it easy to add new tests (< 5 lines to set up auth)
- [ ] 100+ behavioral test assertions across all test files

## Validation Commands
Execute these commands to validate the task is complete:

- `bun test` — All tests pass
- `bun test --rerun-each 2` — Tests are deterministic (no flaky ordering)
- `grep -r "describe\|test\|it(" server/src/test/ | wc -l` — Count test cases (target: 100+)
- `ls server/src/test/*.test.js | wc -l` — At least 9 test files
- `grep "bun test" .github/workflows/ci.yml` — CI includes test step
- `grep '"test"' package.json` — Root package.json has test script

## Notes

- **No new dependencies needed** — Bun's built-in test runner (`bun:test`) provides `describe`, `test`, `expect`, `beforeAll`, `afterAll`, `mock`
- **Database isolation strategy**: Each test file creates its own in-memory SQLite. The challenge is that `db.js` exports a singleton. The test helper should create a parallel `dbUtils` instance backed by `:memory:`. Routes will need to be testable via `app.request()` with the test db injected.
- **Environment variables for tests**: Tests need `API_KEY_ENCRYPTION_KEY` set. The test helper should set this to a known test value before importing encryption modules.
- **Streaming completion tests are excluded** from this phase — they require mocking the AI SDK's `streamText`, which is a separate concern. The completion endpoint's auth/validation can still be tested (wrong model returns error, missing chat returns 404, etc.) without actually streaming.
- **File upload tests** will need to construct `FormData` with `File` objects using Bun's built-in `File` class.
- **Rate limiter tests** should verify the middleware interface but may need clock manipulation — consider testing at the unit level rather than through full HTTP requests.
