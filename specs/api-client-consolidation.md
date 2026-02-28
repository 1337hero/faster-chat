# Plan: Consolidate API Client Patterns

## Task Description
The frontend has 6 different patterns for making authenticated API calls, with `API_BASE` defined 6 separate times, inconsistent `credentials: "include"` usage (missing in 2 places — a bug), and a mix of classes, module objects, and inline fetch calls. Consolidate into one shared `apiFetch` utility and one consistent client architecture.

## Objective
Single `apiFetch` function in `lib/api.js` that handles base URL, credentials, headers, and error throwing. All API clients converted to thin module objects that delegate to `apiFetch`. No inline `fetch()` calls for API endpoints. Zero duplicate `API_BASE` definitions.

## Problem Statement
6 patterns exist for "make an authenticated JSON request":

| Pattern | Files | Issues |
|---------|-------|--------|
| Module object + private fetch fn | `chatsClient.js`, `authClient.js` | Good pattern but `API_BASE` duplicated |
| Class + `_fetch` method | `providersClient.js`, `adminClient.js` | Unnecessary class, `API_BASE` duplicated |
| Bare `fetchJson` in hook | `useFolders.js` | Missing `API_BASE` DEV toggle |
| Inline fetch in hooks | `useImageGeneration.js` | `fetchImageStatus` has zero error handling |
| Inline fetch in components | `FileUpload.jsx`, `MessageAttachment.jsx` | `API_BASE` duplicated per file |
| Inline fetch in state/utils | `useAppSettings.js`, `KnowledgeBaseSelector.jsx`, `PullModelModal.jsx` | `useAppSettings.fetchSettings` missing `credentials: "include"` |

Bugs found:
- `useAppSettings.js:fetchSettings()` — missing `credentials: "include"` (auth cookie not sent for GET)
- `PullModelModal.jsx` SSE fetch — missing `credentials: "include"`
- `useImageGeneration.js:fetchImageStatus()` — no error handling at all

## Solution Approach
1. Create `lib/api.js` with shared `apiFetch(endpoint, options)` and exported `API_BASE`
2. Convert `chatsClient`, `authClient`, `adminClient`, `providersClient` to module objects using `apiFetch`
3. Convert `useFolders.js` inline `fetchJson` to use `apiFetch`
4. Convert inline fetches in `useImageGeneration.js`, `FileUpload.jsx`, `MessageAttachment.jsx`, `useAppSettings.js`, `KnowledgeBaseSelector.jsx` to use `apiFetch` or imported `API_BASE`
5. `PullModelModal.jsx` SSE streaming is a special case — use `API_BASE` for the URL but keep raw `fetch` for the streaming reader (apiFetch returns JSON, SSE needs the raw response)

## Relevant Files

### New Files
- `frontend/src/lib/api.js` — shared `apiFetch` utility and `API_BASE` export

### Files Modified
- `frontend/src/lib/chatsClient.js` — import `apiFetch` from `@/lib/api`, remove local `API_BASE` and `chatsFetch`
- `frontend/src/lib/authClient.js` — import `apiFetch` from `@/lib/api`, remove local `API_BASE` and `authFetch`
- `frontend/src/lib/providersClient.js` — convert class → module object using `apiFetch`, remove local `API_BASE`
- `frontend/src/lib/adminClient.js` — convert class → module object using `apiFetch`, remove local `API_BASE`
- `frontend/src/hooks/useFolders.js` — import `apiFetch` from `@/lib/api`, remove local `fetchJson`
- `frontend/src/hooks/useImageGeneration.js` — import `apiFetch` and `API_BASE` from `@/lib/api`, remove local `API_BASE`, add error handling to `fetchImageStatus`
- `frontend/src/components/chat/FileUpload.jsx` — import `API_BASE` from `@/lib/api`, remove local `API_BASE` (keeps raw fetch for FormData upload — apiFetch sets Content-Type: application/json which breaks multipart)
- `frontend/src/components/chat/MessageAttachment.jsx` — import `API_BASE` and `apiFetch` from `@/lib/api`, remove local `API_BASE`
- `frontend/src/state/useAppSettings.js` — import `apiFetch` from `@/lib/api`, fix missing `credentials: "include"` bug
- `frontend/src/components/chat/KnowledgeBaseSelector.jsx` — import `apiFetch` from `@/lib/api`, replace inline fetches
- `frontend/src/components/admin/PullModelModal.jsx` — import `API_BASE` from `@/lib/api` for the SSE URL (keep raw fetch for streaming)

## Implementation Phases

### Phase 1: Create shared utility
Create `lib/api.js` with `apiFetch` and `API_BASE`. This is the foundation — zero risk, nothing changes yet.

### Phase 2: Convert API clients
Convert the 4 client files (`chatsClient`, `authClient`, `providersClient`, `adminClient`) to use `apiFetch`. These are the cleanest conversions — same pattern, just swap the fetch wrapper.

### Phase 3: Convert inline fetches
Convert hooks and components with inline `fetch()` calls. Handle special cases:
- `FileUpload.jsx` — FormData upload, can't use `apiFetch` (it sets JSON content-type). Just import `API_BASE`.
- `PullModelModal.jsx` — SSE streaming, can't use `apiFetch` (it calls `.json()`). Just import `API_BASE` and add `credentials: "include"`.
- `MessageAttachment.jsx` — uses `API_BASE` for `window.open` and `<img src>` URLs too, not just fetch calls.

### Phase 3: Fix bugs
- Add `credentials: "include"` to `useAppSettings.js:fetchSettings()`
- Add `credentials: "include"` to `PullModelModal.jsx` SSE fetch
- Add error handling to `useImageGeneration.js:fetchImageStatus()`

## Team Orchestration

### Team Members

- Builder
  - Name: `api-consolidation-builder`
  - Role: Create shared apiFetch utility, convert all API clients and inline fetches, fix credential bugs
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `api-consolidation-validator`
  - Role: Verify all API_BASE definitions removed, all clients use apiFetch, credentials are consistent, build passes
  - Agent Type: `validator`
  - Resume: false

## Step by Step Tasks

### 1. Create shared apiFetch utility
- **Task ID**: create-api-utility
- **Depends On**: none
- **Assigned To**: `api-consolidation-builder`
- **Agent Type**: `builder`
- **Parallel**: false

Create `frontend/src/lib/api.js`:
```js
export const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

export async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}
```

Design decisions:
- `credentials: "include"` always set — fixes the 2 bugs where it was missing
- `error.status` attached to thrown errors — useful for auth error detection
- Options spread BEFORE credentials/headers defaults so they can't accidentally override auth
- Actually wait — options.headers needs to merge, not replace. The spread order matters: base headers first, then options.headers to allow overrides (e.g. removing Content-Type for FormData). But `credentials: "include"` should NOT be overridable.

Corrected:
```js
export async function apiFetch(endpoint, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...restOptions,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...optionHeaders,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || "Request failed");
    error.status = response.status;
    throw error;
  }

  return data;
}
```

### 2. Convert chatsClient.js
- **Task ID**: convert-chats-client
- **Depends On**: create-api-utility
- **Assigned To**: `api-consolidation-builder`
- **Agent Type**: `builder`
- **Parallel**: false

- Import `apiFetch` from `@/lib/api`
- Remove local `API_BASE` and `chatsFetch` function
- Keep `SNAKE_TO_CAMEL` map and `toCamelCase` function (response normalization is chatsClient-specific)
- Each method calls `apiFetch("/api/chats" + endpoint, options)` then runs `toCamelCase` on result
- Create a thin wrapper: `const chatsFetch = async (endpoint, options) => toCamelCase(await apiFetch("/api/chats" + endpoint, options))`

### 3. Convert authClient.js
- **Task ID**: convert-auth-client
- **Depends On**: create-api-utility
- **Assigned To**: `api-consolidation-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with task 2)

- Import `apiFetch` from `@/lib/api`
- Remove local `API_BASE` and `authFetch` function
- Each method calls `apiFetch("/api/auth" + endpoint, options)`
- `getSession()` keeps its try/catch that returns `{ user: null }` on error

### 4. Convert providersClient.js
- **Task ID**: convert-providers-client
- **Depends On**: create-api-utility
- **Assigned To**: `api-consolidation-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2, 3)

- Import `apiFetch` from `@/lib/api`
- Convert from class to module object (same pattern as chatsClient/authClient)
- Remove local `API_BASE` and `_fetch` method
- Remove the extra `console.error` in error handling — `apiFetch` handles errors consistently
- Remove `.response = data` from error — `apiFetch` attaches `.status` which is the useful part
- Each method becomes `async methodName(...) { return apiFetch(endpoint, options); }`

### 5. Convert adminClient.js
- **Task ID**: convert-admin-client
- **Depends On**: create-api-utility
- **Assigned To**: `api-consolidation-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2, 3, 4)

- Import `apiFetch` from `@/lib/api`
- Convert from class to module object
- Remove local `API_BASE` and `_fetch` method
- Each method calls `apiFetch(endpoint, options)`

### 6. Convert useFolders.js inline fetchJson
- **Task ID**: convert-folders-hook
- **Depends On**: create-api-utility
- **Assigned To**: `api-consolidation-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2-5)

- Import `apiFetch` from `@/lib/api`
- Remove local `API_BASE` and `fetchJson` function
- Replace all `fetchJson(...)` calls with `apiFetch(...)` calls
- Note: `fetchJson` uses relative paths like `/api/folders/...` — these work directly with `apiFetch` since it prepends `API_BASE`

### 7. Convert inline fetches in hooks and components
- **Task ID**: convert-inline-fetches
- **Depends On**: create-api-utility
- **Assigned To**: `api-consolidation-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2-6)

**useImageGeneration.js:**
- Import `apiFetch` from `@/lib/api`
- Remove local `API_BASE`
- `generateImage`: replace inline fetch with `apiFetch("/api/images/generate", { method: "POST", body: ... })`
- `fetchImageStatus`: replace with `apiFetch("/api/images/status")` — this fixes the missing error handling

**MessageAttachment.jsx:**
- Import `API_BASE` and `apiFetch` from `@/lib/api`
- Remove local `API_BASE`
- queryFn: replace inline fetch with `apiFetch("/api/files/${fileId}")`
- Keep `API_BASE` import for `window.open` URL and `<img src>` URL (these aren't fetch calls)

**FileUpload.jsx:**
- Import `API_BASE` from `@/lib/api` (NOT `apiFetch` — FormData upload needs raw fetch without JSON Content-Type)
- Remove local `API_BASE`
- Keep the raw `fetch()` call for the multipart upload — `apiFetch` would set `Content-Type: application/json` which breaks `FormData`

**useAppSettings.js:**
- Import `apiFetch` from `@/lib/api`
- Replace both `fetchSettings` and `updateSettings` inline fetches with `apiFetch`
- This fixes the missing `credentials: "include"` in `fetchSettings`

**KnowledgeBaseSelector.jsx:**
- Import `apiFetch` from `@/lib/api`
- Replace all 3 inline fetch calls in queryFn/mutationFn with `apiFetch`

**PullModelModal.jsx:**
- Import `API_BASE` from `@/lib/api` (NOT `apiFetch` — SSE streaming needs raw response, not JSON)
- Remove hardcoded relative URL, use `${API_BASE}/api/admin/models/ollama/pull`
- Add `credentials: "include"` to the raw fetch call — this fixes the missing auth cookie bug

### 8. Validate consolidation
- **Task ID**: validate-api-consolidation
- **Depends On**: convert-chats-client, convert-auth-client, convert-providers-client, convert-admin-client, convert-folders-hook, convert-inline-fetches
- **Assigned To**: `api-consolidation-validator`
- **Agent Type**: `validator`
- **Parallel**: false

Verification:
- `grep -rn "const API_BASE" frontend/src/` — should return exactly 1 result (in `lib/api.js`)
- `grep -rn "import.meta.env.DEV" frontend/src/` — should return exactly 1 result (in `lib/api.js`), possibly also in vite config
- `grep -rn "credentials:" frontend/src/lib/` — all should be in `api.js` only
- `cd frontend && npm run build` — should pass
- Read each converted file and verify it imports from `@/lib/api`
- Verify `providersClient` and `adminClient` are module objects, not classes
- Verify `FileUpload.jsx` still uses raw `fetch` for FormData (with imported `API_BASE`)
- Verify `PullModelModal.jsx` still uses raw `fetch` for SSE (with imported `API_BASE` and `credentials: "include"`)

## Acceptance Criteria
1. Single `API_BASE` definition in `lib/api.js` — no other file defines it
2. Single `apiFetch` function — all JSON API calls go through it
3. All 4 client files (`chatsClient`, `authClient`, `providersClient`, `adminClient`) are module objects importing `apiFetch`
4. No inline `fetch()` calls for JSON API endpoints in hooks or components
5. `credentials: "include"` on every API call (including the 2 that were missing)
6. `fetchImageStatus` has error handling
7. `FileUpload.jsx` and `PullModelModal.jsx` use raw `fetch` with imported `API_BASE` (FormData/SSE exceptions)
8. `npm run build` passes

## Validation Commands
- `grep -rn "const API_BASE" frontend/src/` — expect exactly 1 result in `lib/api.js`
- `grep -rn "class.*Client" frontend/src/lib/` — expect 0 results (no more classes)
- `cd frontend && npm run build` — expect success
- `grep -rn 'credentials: "include"' frontend/src/lib/api.js` — expect 1 result
- `grep -rn "fetchJson" frontend/src/hooks/useFolders.js` — expect 0 results
- `grep -rn "async _fetch" frontend/src/lib/` — expect 0 results

## Notes
- `chatsClient.toCamelCase` stays in `chatsClient.js` — it's the only client doing response key normalization. If/when the server is updated to return camelCase, it can be removed.
- `FileUpload.jsx` is the one legitimate exception to "use apiFetch everywhere" — `FormData` uploads require the browser to set the `Content-Type` with the multipart boundary. Setting `Content-Type: application/json` would break it.
- `PullModelModal.jsx` is the other exception — SSE streaming reads from `response.body.getReader()`, not `.json()`. It needs raw `fetch`, but should use `API_BASE` for the URL and `credentials: "include"`.
- `MessageAttachment.jsx` still needs `API_BASE` as a direct import for constructing `<img src>` and `window.open` URLs — those aren't fetch calls but need the same base URL.
