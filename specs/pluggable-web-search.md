# Plan: Pluggable Web Search

## Task Description
Add web browsing and search capability to FasterChat. Users toggle a "Search Web" button in the chat input, and the AI agent can search the web, fetch URLs, extract content, and cite sources in its responses. The system supports multiple pluggable search providers (Brave, Kagi, Perplexity, Google PSE, Bing, DuckDuckGo) configured via admin settings.

## Objective
When complete, users can:
1. Toggle web search ON via the existing Globe button in `InputArea`
2. Ask the AI to look things up — the model autonomously decides when to search
3. See search status indicators while the agent searches
4. Get responses with inline source citations and link previews
5. Admins configure which search provider + API key via the admin panel

## Problem Statement
FasterChat currently has no web access. The `streamText` call passes no `tools` — the infrastructure exists (`supports_tools` in DB, tool-use flags on providers) but nothing is wired up. Users have to manually search and paste context. This feature closes the gap between FasterChat and production chat UIs like Open WebUI / ChatGPT.

## Solution Approach

**AI SDK Tool-Use Pattern (not middleware injection):**

Instead of Open WebUI's middleware approach (search before LLM, inject context), we use AI SDK's native tool calling. The model decides when to search by calling a `webSearch` tool. This is cleaner, more agentic, and works with the existing `streamText` pipeline.

Flow:
```
User sends message (webSearch: true)
  → Server passes tools: { webSearch, fetchUrl } to streamText()
  → Model decides to call webSearch({ query }) or fetchUrl({ url })
  → Tool executes: calls Brave/Kagi/etc, returns results
  → AI SDK feeds results back to model as tool-result messages
  → Model synthesizes response with citations
  → Frontend renders source citations below the response
```

**Why tool-use over middleware injection:**
- Model chooses *when* and *what* to search (might not need to search at all)
- Model can do multiple searches, refine queries
- Model can fetch specific URLs the user mentions
- AI SDK handles the multi-step loop natively via `stopWhen: stepCountIs(N)`
- No custom context-injection templating

**Search Provider Architecture:**
- One file per provider: `server/src/lib/search/brave.js`, `server/src/lib/search/kagi.js`, etc.
- All return `SearchResult[]` with canonical shape (see below)
- Router function dispatches to configured provider
- Provider config stored in `settings` table (admin-configurable)
- DuckDuckGo as zero-config fallback (no API key needed)
- In-memory search cache (Map with 5-min TTL) to handle rate limits and repeated queries

**Canonical SearchResult shape** (all providers normalize to this):
```js
{
  title: string,       // page title
  url: string,         // canonical URL
  snippet: string,     // description/excerpt
  domain: string,      // extracted hostname (for favicon, dedup)
}
```

**Canonical FetchResult shape** (returned by fetchUrl tool):
```js
{
  title: string,
  url: string,
  content: string,        // extracted text, truncated
  description: string,    // meta description
  contentLength: number,  // original length before truncation
  truncated: boolean,     // true if content was cut — tells model "there's more"
}
```

**Multi-step search guardrails:**
- `MAX_TOOL_STEPS = 5` caps the total tool invocations per completion
- This allows: search → fetch 2-3 pages → synthesize, OR search → refine search → fetch → synthesize
- AI SDK's `maxSteps` enforces this hard — the model cannot loop beyond the cap
- No additional guard needed at v1; the cap is sufficient for all current models

**Error propagation to frontend:**
- Tool execution errors are returned as tool-result messages with `{ error: string, code: string }`
- Frontend renders these as inline error banners (rate limit, auth failure, fetch error)
- Provider-level errors use codes: `RATE_LIMITED`, `AUTH_FAILED`, `PROVIDER_ERROR`, `FETCH_FAILED`, `SSRF_BLOCKED`

## Relevant Files
Use these files to complete the task:

**Server — core changes:**
- `server/src/routes/chats.js` — Completion endpoint (line 634). Add `tools` + `stopWhen` to `streamText()` call. Gate on `webSearch` flag from request body + model `supports_tools` check.
- `server/src/lib/providerFactory.js` — Reference for provider pattern. No changes needed.
- `server/src/lib/db.js` — Add web search settings CRUD (`getWebSearchConfig`, `setWebSearchConfig`). Uses existing `settings` table pattern.
- `server/src/routes/settings.js` — Add admin endpoints for web search config.
- `server/src/lib/modelsdev.js` — Reference for `supports_tools` metadata (already populated).

**Server — new files:**
- `server/src/lib/search/providers/brave.js` — Brave Search API provider
- `server/src/lib/search/providers/kagi.js` — Kagi Search API provider
- `server/src/lib/search/providers/google-pse.js` — Google Programmable Search Engine provider
- `server/src/lib/search/providers/bing.js` — Bing Web Search API provider
- `server/src/lib/search/providers/duckduckgo.js` — DuckDuckGo (no API key, fallback)
- `server/src/lib/search/providers/perplexity.js` — Perplexity Sonar API provider
- `server/src/lib/search/index.js` — Provider router: reads config, dispatches to correct provider
- `server/src/lib/search/fetchUrl.js` — URL fetcher: fetch → HTML → markdown/text extraction
- `server/src/lib/tools/webSearch.js` — AI SDK `tool()` definition for web search
- `server/src/lib/tools/fetchUrl.js` — AI SDK `tool()` definition for URL fetching

**Frontend — core changes:**
- `frontend/src/components/chat/InputArea.jsx` — Wire up existing Globe button to toggle `webSearchEnabled` state
- `frontend/src/hooks/useChatStream.js` — Pass `webSearch: true` in `prepareSendMessagesRequest` body
- `frontend/src/hooks/useChat.js` — Thread `webSearchEnabled` through to stream hook
- `frontend/src/components/chat/MessageItem.jsx` — Render source citations below assistant messages
- `frontend/src/components/chat/ChatInterface.jsx` — Pass `webSearchEnabled` prop down

**Frontend — new files:**
- `frontend/src/components/chat/SourceCitations.jsx` — Citation chips with favicons + link preview
- `frontend/src/components/chat/SearchStatus.jsx` — "Searching..." indicator during tool execution

**Admin — changes:**
- `frontend/src/components/admin/` — New `WebSearchTab.jsx` for search provider config

**Shared:**
- `packages/shared/src/constants/config.js` — Add `WEB_SEARCH_CONSTANTS` (max results, max content length, step limit)
- `packages/shared/src/constants/search.js` — New: search provider definitions (name, requires key, config fields)

### New Files

- `server/src/lib/search/providers/brave.js`
- `server/src/lib/search/providers/kagi.js`
- `server/src/lib/search/providers/google-pse.js`
- `server/src/lib/search/providers/bing.js`
- `server/src/lib/search/providers/duckduckgo.js`
- `server/src/lib/search/providers/perplexity.js`
- `server/src/lib/search/index.js`
- `server/src/lib/search/fetchUrl.js`
- `server/src/lib/tools/webSearch.js`
- `server/src/lib/tools/fetchUrl.js`
- `frontend/src/components/chat/SourceCitations.jsx`
- `frontend/src/components/chat/SearchStatus.jsx`
- `frontend/src/components/admin/WebSearchTab.jsx`
- `packages/shared/src/constants/search.js`

## Implementation Phases

### Phase 1: Foundation
- Search provider interface + router
- DuckDuckGo fallback (zero-config, testable immediately)
- Brave Search provider (primary)
- URL content extraction (fetch → text)
- Web search settings in DB + admin API endpoints
- Shared constants

### Phase 2: Core Implementation
- AI SDK tool definitions (`webSearch`, `fetchUrl`)
- Wire tools into `streamText()` completion endpoint
- Gate tools on `webSearch` request flag + model `supports_tools`
- Frontend: wire Globe button toggle → request body
- Frontend: source citation rendering in `MessageItem`
- Frontend: search status indicator during tool execution

### Phase 3: Additional Providers + Polish
- Kagi, Google PSE, Bing, Perplexity providers
- Admin WebSearchTab UI for provider config
- Link preview on citation hover
- Error handling (rate limits, invalid keys, provider down)

## Team Orchestration

- You operate as the team lead and orchestrate the team to execute the plan.
- You're responsible for deploying the right team members with the right context to execute the plan.
- IMPORTANT: You NEVER operate directly on the codebase. You use `Task` and `Task*` tools to deploy team members to to the building, validating, testing, deploying, and other tasks.
  - This is critical. You're job is to act as a high level director of the team, not a builder.
  - You're role is to validate all work is going well and make sure the team is on track to complete the plan.
  - You'll orchestrate this by using the Task* Tools to manage coordination between the team members.
  - Communication is paramount. You'll use the Task* Tools to communicate with the team members and ensure they're on track to complete the plan.
- Take note of the session id of each team member. This is how you'll reference them.

### Team Members

- Builder
  - Name: search-backend
  - Role: Implement all server-side search infrastructure — providers, router, URL fetcher, AI SDK tools, settings API, and completion endpoint integration
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: search-frontend
  - Role: Implement all frontend changes — Globe button wiring, webSearch flag in transport, citation rendering, search status indicator, and admin WebSearchTab
  - Agent Type: general-purpose
  - Resume: true

- Builder
  - Name: search-shared
  - Role: Implement shared constants and search provider definitions used by both frontend and backend
  - Agent Type: general-purpose
  - Resume: false

- Validator
  - Name: validator
  - Role: Validate all work — type checking, linting, dev server startup, manual flow verification
  - Agent Type: validator
  - Resume: false

## Step by Step Tasks

### 1. Create Shared Constants
- **Task ID**: shared-constants
- **Depends On**: none
- **Assigned To**: search-shared
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside nothing — it's first)
- Add `WEB_SEARCH_CONSTANTS` to `packages/shared/src/constants/config.js`:
  ```js
  export const WEB_SEARCH_CONSTANTS = {
    MAX_RESULTS: 5,
    MAX_CONTENT_LENGTH: 3000,  // chars per page fetch
    MAX_TOOL_STEPS: 5,         // maxSteps limit for tool loop
    FETCH_TIMEOUT_MS: 10000,
    CACHE_TTL_MS: 5 * 60 * 1000,  // 5 min cache for search results
  };

  export const SEARCH_ERROR_CODES = {
    RATE_LIMITED: "RATE_LIMITED",
    AUTH_FAILED: "AUTH_FAILED",
    PROVIDER_ERROR: "PROVIDER_ERROR",
    FETCH_FAILED: "FETCH_FAILED",
    SSRF_BLOCKED: "SSRF_BLOCKED",
    NO_RESULTS: "NO_RESULTS",
  };
  ```
- Create `packages/shared/src/constants/search.js` with provider definitions:
  ```js
  export const SEARCH_PROVIDERS = {
    duckduckgo: { name: "DuckDuckGo", requiresKey: false },
    brave: { name: "Brave Search", requiresKey: true, keyField: "brave_api_key" },
    kagi: { name: "Kagi", requiresKey: true, keyField: "kagi_api_key" },
    "google-pse": { name: "Google PSE", requiresKey: true, keyField: "google_pse_api_key", extraFields: ["google_pse_engine_id"] },
    bing: { name: "Bing", requiresKey: true, keyField: "bing_api_key" },
    perplexity: { name: "Perplexity", requiresKey: true, keyField: "perplexity_api_key" },
  };
  export const DEFAULT_SEARCH_PROVIDER = "duckduckgo";
  ```
- Export from `packages/shared/src/index.js`

### 2. Implement Search Providers + Router
- **Task ID**: search-providers
- **Depends On**: shared-constants
- **Assigned To**: search-backend
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `server/src/lib/search/providers/duckduckgo.js` — Use `fetch()` against DuckDuckGo's HTML API or the `lite.duckduckgo.com` endpoint. Parse results. Return `SearchResult[]`.
  - Shape: `{ title: string, url: string, snippet: string }`
  - No API key required — the zero-config fallback
- Create `server/src/lib/search/providers/brave.js` — `GET https://api.search.brave.com/res/v1/web/search` with `X-Subscription-Token` header. Handle 429 rate limits with retry.
- Create `server/src/lib/search/providers/kagi.js` — `GET https://kagi.com/api/v0/search` with `Authorization: Bot {key}`.
- Create `server/src/lib/search/providers/google-pse.js` — `GET https://www.googleapis.com/customsearch/v1` with `key` + `cx` params.
- Create `server/src/lib/search/providers/bing.js` — `GET https://api.bing.microsoft.com/v7.0/search` with `Ocp-Apim-Subscription-Key` header.
- Create `server/src/lib/search/providers/perplexity.js` — Uses OpenAI-compatible API. `POST https://api.perplexity.ai/chat/completions` with `sonar` model. Returns answer + citations.
- Create `server/src/lib/search/index.js` — Router function with cache:
  ```js
  import { WEB_SEARCH_CONSTANTS } from "@faster-chat/shared";
  // ... provider imports

  const providers = { duckduckgo: searchDuckDuckGo, brave: searchBrave, ... };

  // Simple in-memory cache: Map<"provider:query", { results, timestamp }>
  const cache = new Map();

  export async function searchWeb(query, config) {
    const cacheKey = `${config.provider}:${query}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < WEB_SEARCH_CONSTANTS.CACHE_TTL_MS) {
      return cached.results;
    }

    const provider = providers[config.provider] || providers.duckduckgo;
    const results = await provider(query, {
      apiKey: config.apiKey, ...config.extra,
      count: WEB_SEARCH_CONSTANTS.MAX_RESULTS,
    });

    // Normalize: ensure domain field is populated
    const normalized = results.map(r => ({
      ...r,
      domain: r.domain || new URL(r.url).hostname,
    }));

    cache.set(cacheKey, { results: normalized, timestamp: Date.now() });
    return normalized;
  }
  ```
- Each provider wraps errors with `SEARCH_ERROR_CODES` — the router catches and returns `{ error, code }` instead of throwing

### 3. Implement URL Content Fetcher
- **Task ID**: url-fetcher
- **Depends On**: shared-constants
- **Assigned To**: search-backend
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside search-providers)
- Create `server/src/lib/search/fetchUrl.js`:
  - `fetch(url)` with timeout from `WEB_SEARCH_CONSTANTS.FETCH_TIMEOUT_MS`
  - `redirect: "manual"` — validate each redirect hop's resolved IP before following (prevents DNS rebinding / redirect-to-private-IP attacks)
  - Max 5 redirects
  - Parse HTML → extract text content using semantic priority:
    1. `<article>` or `<main>` content (preferred — article body)
    2. `role="main"` elements
    3. Fall back to `<body>` with aggressive stripping
  - Strip: `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, comments, hidden elements
  - Use `node-html-parser` (add via `bun add node-html-parser` in server/)
  - Truncate to `WEB_SEARCH_CONSTANTS.MAX_CONTENT_LENGTH`
  - Return canonical `FetchResult` shape:
    ```js
    { title, url, content, description, contentLength, truncated }
    ```
  - The `contentLength` + `truncated` fields tell the model "original page was N chars, content was truncated" so it doesn't hallucinate about missing info
  - **SSRF protection** (in `validateUrl()` helper):
    1. Require `http:` or `https:` scheme only
    2. Resolve hostname via DNS
    3. Block private/reserved IP ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`, `fe80::/10`
    4. Validate AFTER redirect resolution (check each hop's target IP)
    5. Normalize IDN domains via punycode before DNS resolution
  - Error handling: return `{ error: string, code: SEARCH_ERROR_CODES.* }` on failure — never throw

### 4. Web Search Settings API
- **Task ID**: settings-api
- **Depends On**: shared-constants
- **Assigned To**: search-backend
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside providers)
- Add to `server/src/lib/db.js` — `dbUtils.getWebSearchConfig()` / `dbUtils.setWebSearchConfig()` using the existing `settings` KV table pattern:
  - Keys: `web_search_provider`, `web_search_api_key`, `web_search_enabled`, plus provider-specific keys (e.g., `google_pse_engine_id`)
  - Encrypt API keys using existing `encryption.js` functions
- Add to `server/src/routes/settings.js`:
  - `GET /api/settings/web-search` — returns current config (admin only, keys masked)
  - `PUT /api/settings/web-search` — update config (admin only)
  - `POST /api/settings/web-search/test` — test current provider config with a sample query

### 5. Create AI SDK Tool Definitions
- **Task ID**: tool-definitions
- **Depends On**: search-providers, url-fetcher
- **Assigned To**: search-backend
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `server/src/lib/tools/webSearch.js`:
  ```js
  import { tool } from "ai";
  import { z } from "zod";
  import { searchWeb } from "../search/index.js";

  export function createWebSearchTool(searchConfig) {
    return tool({
      description: "Search the web for current information. Use when the user asks about recent events, facts you're unsure about, or anything that needs up-to-date information. Your training data has a knowledge cutoff — use this tool for anything that may have changed.",
      parameters: z.object({
        query: z.string().min(1).max(200).describe("The search query"),
      }),
      execute: async ({ query }) => {
        const results = await searchWeb(query, searchConfig);

        // Error case: return structured error so model can inform user
        if (results.error) {
          return { error: results.error, code: results.code, results: [] };
        }

        if (results.length === 0) {
          return { results: [], message: "No results found. Try a different query." };
        }

        return {
          results: results.map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            domain: r.domain,
          })),
        };
      },
    });
  }
  ```
- Create `server/src/lib/tools/fetchUrl.js`:
  ```js
  import { tool } from "ai";
  import { z } from "zod";
  import { fetchAndExtract } from "../search/fetchUrl.js";

  export function createFetchUrlTool() {
    return tool({
      description: "Fetch and read the content of a specific URL. Use when the user shares a link or when you need to read a specific web page from search results.",
      parameters: z.object({
        url: z.string().url().describe("The URL to fetch"),
      }),
      execute: async ({ url }) => {
        const result = await fetchAndExtract(url);

        // Error case: structured error
        if (result.error) {
          return { error: result.error, code: result.code };
        }

        // Include truncation hint so model knows content was cut
        return {
          ...result,
          ...(result.truncated && {
            note: `Content truncated from ${result.contentLength} to ${result.content.length} characters. Key information may be missing.`,
          }),
        };
      },
    });
  }
  ```

### 6. Wire Tools into Completion Endpoint
- **Task ID**: completion-integration
- **Depends On**: tool-definitions, settings-api
- **Assigned To**: search-backend
- **Agent Type**: general-purpose
- **Parallel**: false
- Modify `server/src/routes/chats.js` completion handler:
  1. Read `webSearch` boolean from request body (alongside `model`, `messages`, etc.)
  2. If `webSearch === true` AND model supports tools (check `model_metadata.supports_tools`):
     - Load web search config from DB via `dbUtils.getWebSearchConfig()`
     - Create tool instances: `createWebSearchTool(config)`, `createFetchUrlTool()`
     - Pass to `streamText()`:
       ```js
       const stream = await streamText({
         model,
         messages,
         maxTokens: COMPLETION_CONSTANTS.MAX_TOKENS,
         ...(webSearchEnabled && supportsTools && {
           tools: { webSearch: createWebSearchTool(searchConfig), fetchUrl: createFetchUrlTool() },
           maxSteps: WEB_SEARCH_CONSTANTS.MAX_TOOL_STEPS,
         }),
       });
       ```
  3. If `webSearch === true` but model doesn't support tools, fall back gracefully (just run without tools — no error)

### 7. Frontend — Wire Globe Toggle + Transport
- **Task ID**: frontend-toggle
- **Depends On**: shared-constants
- **Assigned To**: search-frontend
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside backend tasks)
- In `InputArea.jsx`:
  - Add `webSearchEnabled` / `onToggleWebSearch` / `modelSupportsTools` props
  - Wire the existing Globe button with three visual states:
    - **Inactive**: `text-theme-muted hover:bg-theme-green/10 hover:text-theme-green rounded-lg p-2 transition-colors`
    - **Active**: `bg-theme-green/20 text-theme-green rounded-lg p-2 transition-colors`
    - **Disabled** (model can't use tools): `text-theme-muted/40 cursor-not-allowed opacity-50 rounded-lg p-2` — mirrors voice button disabled pattern (line 157)
  - Add `aria-pressed={webSearchEnabled}` for a11y (toggle button semantics)
  - Title: disabled → "This model doesn't support web search" / active → "Disable Web Search" / inactive → "Search Web"
  - **Mutual exclusivity with imageMode**: toggling web search ON deactivates imageMode and vice versa. Handle in the click handler, not useEffect:
    ```jsx
    const handleToggleWebSearch = () => {
      if (imageMode) setImageMode(false);
      onToggleWebSearch();
    };
    ```
- In `useUiState.js` (Zustand):
  - Add `webSearchEnabled: false` + `toggleWebSearch` + `setWebSearchEnabled` actions
  - Do NOT persist this — it's per-session
- In `ChatInterface.jsx`:
  - Read `webSearchEnabled` from Zustand, pass to `InputArea`
  - Derive `modelSupportsTools` from the model metadata (already available via TanStack Query model list). Pass to `InputArea`.
  - Pass `webSearchEnabled` to `useChat` → `useChatStream`
  - **Auto-disable on model switch**: In the model change handler, if new model doesn't support tools, call `setWebSearchEnabled(false)`. Do this in the event handler, NOT useEffect.
  - **Reset on chat navigation**: When `chatId` changes, reset `webSearchEnabled` to false. Unlike imageMode (which resets after each send), web search stays on for multi-turn research — but resets between chats.
- In `useChatStream.js`:
  - Accept `webSearchEnabled` param
  - Add `webSearch: webSearchEnabled` to the `body` in `prepareSendMessagesRequest`
- In `useChat.js`:
  - Thread `webSearchEnabled` through to `useChatStream`

### 8. Frontend — Source Citations + Error Display
- **Task ID**: frontend-citations
- **Depends On**: frontend-toggle
- **Assigned To**: search-frontend
- **Agent Type**: general-purpose
- **Parallel**: false

#### SourceCitations.jsx
- Create `frontend/src/components/chat/SourceCitations.jsx`
- **Container**: `mt-4 border-theme-border/30 border-t pt-3` — border-top separator below response text
- **Label**: `text-theme-text-muted mb-2 flex items-center gap-1.5 text-xs font-medium` with Globe icon + "Sources"
- **Chip grid**: `flex flex-wrap gap-2`
- **Individual chip** (anchor tag):
  ```
  bg-theme-surface/60 border-theme-border/40 hover:bg-theme-surface hover:border-theme-border
  text-theme-text-muted hover:text-theme-text ease-snappy
  group inline-flex max-w-[200px] items-center gap-1.5 rounded-md border px-2 py-1 text-xs
  transition-colors duration-75
  ```
- **Favicon**: `h-3.5 w-3.5 flex-shrink-0 rounded-sm` via `https://www.google.com/s2/favicons?domain={domain}&sz=16`, `loading="lazy"`, hide on error
- **Title**: `truncate` — `max-w-[200px]` on chip handles overflow
- **Snippet tooltip**: Native `title={source.snippet}` on the anchor — no custom tooltip component
- **Overflow at 5+ sources**: Show first 5, then a "+N more" button (`text-theme-text-muted hover:text-theme-text text-xs font-medium`) that expands. This is valid local useState. Click to expand, click to collapse.
- **Responsive**: flex-wrap handles all widths naturally. At 320px, chips stack 1-2 per row.

#### Citation extraction (canonical function)
```js
function extractSources(parts) {
  if (!parts) return [];
  const sources = [];
  const seen = new Set();
  for (const part of parts) {
    if (part.type !== "tool-invocation" || part.state !== "result") continue;
    if (part.toolName === "webSearch" && part.result?.results) {
      for (const r of part.result.results) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          sources.push({ title: r.title, url: r.url, snippet: r.snippet, domain: r.domain });
        }
      }
    }
    if (part.toolName === "fetchUrl" && part.result?.url && !part.result?.error) {
      if (!seen.has(part.result.url)) {
        seen.add(part.result.url);
        sources.push({ title: part.result.title, url: part.result.url, domain: new URL(part.result.url).hostname });
      }
    }
  }
  return sources;
}
```

#### Inline tool errors (NOT ErrorBanner — custom inline)
- Derive errors as expression: `const toolErrors = message.parts?.filter(p => p.type === "tool-invocation" && p.state === "result" && p.result?.error) || []`
- Render **above** the markdown content (user sees error context first, then the model's best-effort response):
  ```jsx
  <div className="mb-3 space-y-2">
    {toolErrors.map((err, i) => (
      <div key={i} role="alert"
        className="bg-theme-red/8 border-theme-red/20 text-theme-red flex items-start gap-2 rounded-lg border px-3 py-2 text-xs">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>{ERROR_MESSAGES[err.result.code] || err.result.error}</span>
      </div>
    ))}
  </div>
  ```
- Error messages:
  - `RATE_LIMITED` → "Search provider rate limited. Try again in a moment."
  - `AUTH_FAILED` → "Search API key is invalid or expired. Contact your admin."
  - `PROVIDER_ERROR` → "Search provider returned an error. Try again."
  - `FETCH_FAILED` → "Could not fetch the requested URL."
  - `SSRF_BLOCKED` → "URL blocked for security reasons."

#### Render order in MessageItem
```
[model label]
[attachments]
[thinking blocks]
[tool errors]        ← new
[markdown content]
[source citations]   ← new
[action buttons]
[search status]      ← new (replaces "Processing..." when tool active)
```

- Modify `MessageItem.jsx`:
  - Derive `sources` using `extractSources(message.parts)` — expression, no useState
  - Derive `toolErrors` — expression, no useState
  - Render errors before content, citations after content, per order above

### 9. Frontend — Search Status Indicator
- **Task ID**: frontend-status
- **Depends On**: frontend-toggle
- **Assigned To**: search-frontend
- **Agent Type**: general-purpose
- **Parallel**: true (can run alongside citations)
- Create `frontend/src/components/chat/SearchStatus.jsx`:
  - Config map for tool states:
    - `webSearch` → Globe icon, `text-theme-green`, "Searching the web..."
    - `fetchUrl` → Link2 icon, `text-theme-blue`, "Reading {domain}..." (extract from tool args: `new URL(args.url).hostname`)
  - **Animation**: NOT the same as "Processing..." pulse. Use:
    - `animate-ping` radar pulse on the icon (with `opacity-30`, `bg-current`) — communicates active work
    - Three bouncing dots (`h-1 w-1 animate-bounce`) with staggered delays (0ms, 150ms, 300ms)
    - Container: `{color} mt-3 flex transform-gpu items-center gap-2` — same layout as existing streaming indicator
  - Renders in same position as "Processing..." (bottom of message bubble). The two are mutually exclusive:
    ```jsx
    {isStreaming && !activeToolCall && (
      /* existing Processing... sparkle */
    )}
    {activeToolCall && (
      <SearchStatus toolName={activeToolCall.toolName} args={activeToolCall.args} />
    )}
    ```
  - No exit animation needed — the snap from "Searching..." to content feels satisfying
- In `MessageItem.jsx`:
  - Derive: `const activeToolCall = message.parts?.find(p => p.type === "tool-invocation" && p.state === "call")`
  - This is derived state (expression), not useState

### 10. Admin — Web Search Config Tab
- **Task ID**: admin-tab
- **Depends On**: settings-api, frontend-toggle
- **Assigned To**: search-frontend
- **Agent Type**: general-purpose
- **Parallel**: false
- Create `frontend/src/components/admin/WebSearchTab.jsx`:
  - **Layout**: Follow CustomizeTab pattern (single-page form), NOT ConnectionsTab (CRUD list). This is a global config, not a list of items.
  - Header: `border-theme-surface flex items-center justify-between border-b px-6 py-4` with "Web Search" title + [Save Changes] button
  - Content: `max-w-2xl` container matching CustomizeTab width
  - **Provider dropdown**: Native `<select>` (no custom dropdown — none exists in codebase). Style: `border-theme-surface-strong bg-theme-canvas text-theme-text focus:border-theme-blue w-full rounded-lg border px-4 py-2 text-sm`. Append " (no key needed)" to DuckDuckGo option.
  - **Conditional fields**:
    - DuckDuckGo selected → hide API key field entirely
    - Google PSE selected → show additional "Search Engine ID" input
    - All others → show API key field
    - Derive visibility: `const showApiKey = SEARCH_PROVIDERS[provider]?.requiresKey`
  - **API key input**: password field, masked. Style matches existing provider key inputs.
  - **Enable/disable toggle**: Use existing Switch component from `@/components/ui/Switch` with `color="green"`
  - **Test Connection button**: Below enable switch. Outline variant of Button component.
    - Loading: "Testing..." with spinner
    - Success: Green CheckCircle + "Connected" (auto-clear after 3s)
    - Failure: Red XCircle + error message (persists until retry)
  - Uses TanStack Query for fetch/mutate following existing admin tab patterns
  - Wire into admin tabs array + lazy load: `const WebSearchTab = lazy(() => import("./WebSearchTab"))`

### 11. Validate Everything
- **Task ID**: validate-all
- **Depends On**: completion-integration, frontend-citations, frontend-status, admin-tab
- **Assigned To**: validator
- **Agent Type**: validator
- **Parallel**: false
- Run `bun install` from monorepo root
- Run `bun run dev` — verify both frontend and server start without errors
- Verify no import errors, no missing exports
- Check that Globe button toggles state in UI
- Check that `webSearch: true` appears in request body when toggled
- Verify admin WebSearchTab renders and loads settings
- Check that tool definitions are valid (no Zod errors)
- Verify streamText call includes tools conditionally

## Acceptance Criteria

1. Globe button in InputArea toggles web search on/off with visual feedback
2. Globe button is disabled with tooltip when selected model doesn't support tools
3. When web search is ON, `webSearch: true` is sent in the completion request body
4. Server conditionally passes `webSearch` + `fetchUrl` tools to `streamText()` when flag is true AND model supports tools
5. At least 2 search providers work (DuckDuckGo + Brave)
6. URL fetcher extracts readable text from web pages with SSRF protection (private IP blocking, redirect validation)
7. Source citations render below assistant messages that used web search, deduplicated by URL
8. Search status indicator shows during tool execution with contextual label (searching vs reading)
9. Error states surface to user: rate limit, auth failure, fetch failure, SSRF block
10. Admin can configure search provider + API key via WebSearchTab
11. Search results are cached in-memory (5 min TTL) to avoid duplicate API calls
12. Graceful fallback: if model doesn't support tools, Globe button is disabled (not silently ignored)
13. No regressions: normal chat flow works identically when web search is OFF
14. FetchUrl returns `truncated` + `contentLength` so model knows when content was cut

## Validation Commands
Execute these commands to validate the task is complete:

- `cd /home/mikekey/Builds/FasterChat/app && bun install` — Install any new dependencies
- `cd /home/mikekey/Builds/FasterChat/app && bun run dev` — Verify dev server starts cleanly (both frontend + backend)
- `grep -r "webSearch" server/src/routes/chats.js` — Verify tool integration in completion endpoint
- `grep -r "webSearch" frontend/src/hooks/useChatStream.js` — Verify transport sends flag
- `ls server/src/lib/search/providers/` — Verify provider files exist
- `ls server/src/lib/tools/` — Verify tool definition files exist
- `ls frontend/src/components/chat/SourceCitations.jsx` — Verify citation component exists
- `ls frontend/src/components/admin/WebSearchTab.jsx` — Verify admin tab exists

## Notes

- **Dependencies**: `fetch()` is built into Bun, `zod` already in deps, `ai` SDK already at v6. Add `node-html-parser` for content extraction (`bun add node-html-parser` in server/). For DuckDuckGo, scrape the lite HTML endpoint — no API key needed.
- **AI SDK v6 note**: Use `maxSteps` (not `stopWhen: stepCountIs(N)`) — verify which API the installed `ai@6.0.104` uses. The `maxSteps` pattern is more stable across versions.
- **Perplexity is special**: It's not a search API — it's an LLM with built-in search. The provider would make a chat completion call to Perplexity's API and return the response + citations as search results. Consider it a stretch goal.
- **Caching**: In-memory Map with 5-min TTL in the search router. Keyed on `provider:query`. DuckDuckGo rate-limits aggressively — cache prevents repeated hits. No persistence needed; cache dies with server restart.
- **SSRF protection layers**:
  1. Scheme validation (http/https only)
  2. DNS resolution → IP range check (block RFC 1918, loopback, link-local)
  3. Redirect following with per-hop validation (`redirect: "manual"`, max 5 hops)
  4. IDN/punycode normalization before DNS resolution
  5. No meta-refresh following (HTML-level redirects ignored)
- **Content extraction priority**: `<article>` > `<main>` > `[role="main"]` > `<body>` with stripping. This produces clean content for most news/blog/docs pages. The `truncated` flag prevents model hallucination about missing content.
- **Error codes are structured**: All tool errors return `{ error: string, code: SEARCH_ERROR_CODES.* }` instead of throwing. This lets the model inform the user naturally ("I couldn't search because...") and lets the frontend render appropriate error UI.
