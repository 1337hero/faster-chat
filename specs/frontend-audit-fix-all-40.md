# Plan: Fix All 40 Frontend Audit Findings

## Task Description
Fix all 40 findings from the comprehensive frontend audit across accessibility, code quality, consistency, and UX. Issues range from WCAG failures (no focus trap in modals, missing aria attributes) to code consistency problems (dual clsx, dual messageUtils, duplicated handlers) to UX anti-patterns (browser confirm/alert, no delete confirmation). Work is organized into a foundation pass followed by 5 parallel builder streams and a final validation pass.

## Objective
Resolve every finding from the audit — 7 critical, 18 important, 15 nice-to-have — resulting in a frontend that passes basic WCAG 2.1 AA, uses consistent patterns throughout, and eliminates all identified DRY violations and dead code.

## Problem Statement
The frontend has solid architecture (zero useCallback, good TanStack Query usage, clean hook decomposition) but suffers from:
1. **Accessibility gaps**: No focus trapping in modals, custom dropdowns lack keyboard nav and ARIA attributes, icon buttons missing labels
2. **Inconsistency**: Two clsx implementations, two messageUtils files, three API client patterns, mixed styling systems
3. **UX anti-patterns**: Browser native `confirm()`/`alert()`, chat delete with no confirmation, mutation states that disable all items instead of the clicked one
4. **Dead code**: Unused exports, unused dependencies, duplicate logic

## Solution Approach
1. **Foundation first**: Consolidate shared utilities (clsx, messageUtils, ErrorBanner) and clean dead code. This touches files that later streams also modify, so it must complete first.
2. **Five parallel streams**: Each stream owns a distinct set of files with zero overlap, enabling true parallel execution:
   - A11y primitives (Modal, Switch, ErrorBanner, textarea, Avatar, MessageList, InputArea buttons)
   - Dropdown refactor (ModelSelector, ImageModelSelector, UserMenu, KnowledgeBaseSelector)
   - Admin & auth (ConnectionsTab, AuthPage, admin modals, ChatInterface error handling)
   - Sidebar & layout (Sidebar.jsx decomposition, VoiceSettings, PullModelModal)
   - React patterns (useAppSettings, ThemeSelector, useIsMobile, useChatVoice, MessageList empty state)
3. **Validation**: A read-only validator agent audits all changes against the 40-item checklist.

## Relevant Files

### Files Modified in Phase 1 (Foundation)
- `frontend/src/lib/clsx.js` — DELETE (replaced by npm `clsx` package)
- `frontend/src/components/ui/text.jsx` — update import from `@/lib/clsx` to `clsx`
- `frontend/src/components/ui/button.jsx` — update import from `@/lib/clsx` to `clsx`
- `frontend/src/components/ui/dropdown.jsx` — update import from `@/lib/clsx` to `clsx`
- `frontend/src/components/ui/textarea.jsx` — update import from `@/lib/clsx` to `clsx`
- `frontend/src/utils/message/messageUtils.js` — DELETE (merge into lib/messageUtils.js)
- `frontend/src/lib/messageUtils.js` — add `extractTextContent` and `hasTextContent` exports
- `frontend/src/hooks/useChatVoice.js` — update import path for messageUtils
- `frontend/src/components/ui/ErrorBanner.jsx` — use `extractErrorMessage` from `@/lib/errorHandler`
- `frontend/src/lib/chatsClient.js` — replace nested ternary with map lookup
- `frontend/src/lib/utils.js` — delete `safeHydration`, move `formatDate` to `lib/formatters.js`
- `frontend/src/lib/search.js` — delete unused `searchByKey` and `searchByKeys` exports
- `frontend/package.json` — remove `tailwind-merge`, remove dup `@preact/preset-vite` from deps, add `fuzzysort`

### New Files
- `frontend/src/lib/formatters.js` — receives `formatDate` from lib/utils.js

### Files Modified in Phase 2 (Parallel Streams)

**Stream A — A11y Primitives:**
- `frontend/src/components/ui/Modal.jsx` — add focus trap, `role="dialog"`, `aria-modal="true"`, `aria-label` on close button
- `frontend/src/components/ui/Switch.jsx` — add `role="switch"`, `aria-checked`, fix label association
- `frontend/src/components/ui/ErrorBanner.jsx` — add `role="alert"`
- `frontend/src/components/ui/textarea.jsx` — `disabled:opacity-0` → `disabled:opacity-50`
- `frontend/src/components/ui/Avatar.jsx` — use `<img>` tag with `alt` instead of CSS `backgroundImage`
- `frontend/src/components/chat/MessageList.jsx` — add `aria-live="polite"` region
- `frontend/src/components/chat/InputArea.jsx` — add `aria-label` to all icon-only buttons + textarea
- `frontend/src/components/chat/FileUpload.jsx` — add `aria-label` to remove button
- `frontend/src/components/ui/ToolbarGroup.jsx` — add `aria-label` support to ToolbarButton

**Stream B — Dropdown Refactor:**
- `frontend/src/components/chat/ModelSelector.jsx` — refactor to use HeadlessUI `Menu`, extract shared base
- `frontend/src/components/chat/ImageModelSelector.jsx` — refactor to use shared base from ModelSelector
- `frontend/src/components/ui/UserMenu.jsx` — refactor to use HeadlessUI `Menu`
- `frontend/src/components/chat/KnowledgeBaseSelector.jsx` — convert `class` → `className`, non-theme → theme tokens, add Escape/keyboard support

**Stream C — Admin & Auth:**
- `frontend/src/components/admin/ConnectionsTab.jsx` — replace `confirm()` with confirmation modal, fix per-item mutation pending states
- `frontend/src/components/auth/AuthPage.jsx` — replace `alert()` with inline error state
- `frontend/src/components/admin/CreateUserModal.jsx` — add `htmlFor`/`id` pairing
- `frontend/src/components/admin/EditProviderModal.jsx` — add `htmlFor`/`id` pairing
- `frontend/src/components/admin/AddProviderModal.jsx` — add `htmlFor`/`id` pairing
- `frontend/src/components/admin/ResetPasswordModal.jsx` — add `htmlFor`/`id` pairing
- `frontend/src/components/admin/EditUserRoleModal.jsx` — add `htmlFor`/`id` pairing
- `frontend/src/components/chat/ChatInterface.jsx` — add try/catch to `handleNewChat`
- `frontend/src/components/layout/IndexRouteGuard.jsx` — add `onError` to `createChatMutation`

**Stream D — Sidebar & Layout:**
- `frontend/src/components/layout/Sidebar.jsx` — use `useChatActions`, add delete confirmation, fix hardcoded Catppuccin tokens, add `aria-label` to close/collapse/overlay/search/logo
- `frontend/src/components/chat/VoiceSettings.jsx` — use shared `Modal` component
- `frontend/src/components/admin/PullModelModal.jsx` — use shared `Modal` component, remove redundant autoFocus useEffect

**Stream E — React Patterns:**
- `frontend/src/state/useAppSettings.js` — convert to TanStack Query hook
- `frontend/src/components/settings/ThemeSelector.jsx` — convert useEffect+useState fetch to useQuery
- `frontend/src/hooks/useIsMobile.js` — use `matchMedia` instead of resize listener
- `frontend/src/hooks/useChatVoice.js` — `useLayoutEffect` → `useEffect`
- `frontend/src/components/admin/PullModelModal.jsx` — derive `isComplete` from progress (shared with Stream D)
- `frontend/src/components/chat/InputArea.jsx` — `hasContent` function → expression (shared with Stream A)
- `frontend/src/components/chat/MessageList.jsx` — add empty state for new chats (shared with Stream A)

## Implementation Phases

### Phase 1: Foundation
Consolidate clsx to single npm source, merge dual messageUtils, clean dead code/deps, fix ErrorBanner to use shared `extractErrorMessage`, replace toCamelCase nested ternary with map lookup, move `formatDate` out of grab-bag utils.js. **Must complete before Phase 2** because clsx and messageUtils import path changes affect files in every stream.

### Phase 2: Core Implementation (5 Parallel Streams)
Each stream owns distinct files and can run simultaneously after Phase 1 completes. Minor overlaps (InputArea, PullModelModal, MessageList) are noted — the builder handling the first change owns the file, subsequent streams adapt.

### Phase 3: Integration & Polish
Validator agent reads every modified file, checks against the 40-item checklist, verifies no regressions, and confirms the build passes.

## Team Orchestration

### Team Members

- Builder
  - Name: `foundation-builder`
  - Role: Consolidate shared utilities, clean dead code, fix package.json — the prerequisite work that unblocks all other streams
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `a11y-primitives-builder`
  - Role: Fix accessibility on UI primitives (Modal, Switch, ErrorBanner, textarea, Avatar) and add aria attributes to chat components
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `dropdown-builder`
  - Role: Refactor all custom dropdowns to use HeadlessUI Menu, extract shared ModelSelector base, fix KnowledgeBaseSelector styling
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `admin-auth-builder`
  - Role: Fix admin/auth UX issues — replace native dialogs, fix mutation pending states, add form label pairing, add error handling
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `sidebar-layout-builder`
  - Role: Sidebar cleanup — use useChatActions, add delete confirmation, fix Catppuccin tokens, migrate VoiceSettings and PullModelModal to shared Modal
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `react-patterns-builder`
  - Role: Fix React anti-patterns — convert useAppSettings to TanStack Query, ThemeSelector to useQuery, useIsMobile to matchMedia, fix useChatVoice, add empty state
  - Agent Type: `builder`
  - Resume: true

- Builder
  - Name: `audit-validator`
  - Role: Read-only validation — verify all 40 findings are resolved, check build passes, confirm no regressions
  - Agent Type: `validator`
  - Resume: false

## Step by Step Tasks

### 1. Foundation: Consolidate Utilities & Clean Dead Code
- **Task ID**: foundation
- **Depends On**: none
- **Assigned To**: `foundation-builder`
- **Agent Type**: `builder`
- **Parallel**: false (must complete before Phase 2)
- **Findings covered**: #12, #13, #16, #25, #30, #31, #32, #33

**Actions:**

1. **Consolidate clsx** (#12):
   - Delete `frontend/src/lib/clsx.js`
   - Update imports in `text.jsx`, `button.jsx`, `dropdown.jsx`, `textarea.jsx` from `import { clsx } from "@/lib/clsx"` to `import { clsx } from "clsx"`
   - Verify `Switch.jsx`, `Avatar.jsx`, `Radio.jsx` already import from `"clsx"` — no change needed

2. **Merge messageUtils** (#13):
   - Copy `extractTextContent` and `hasTextContent` from `utils/message/messageUtils.js` into `lib/messageUtils.js`
   - Delete `utils/message/messageUtils.js` and `utils/message/` directory
   - Update import in `hooks/useChatVoice.js` from `"@/utils/message/messageUtils"` to `"@/lib/messageUtils"`

3. **ErrorBanner: use extractErrorMessage** (#16):
   - In `components/ui/ErrorBanner.jsx`, replace the inline `getMessageText` function with `import { extractErrorMessage } from "@/lib/errorHandler"`
   - Use `extractErrorMessage(message)` instead of `getMessageText(message)`

4. **toCamelCase map lookup** (#25):
   - In `lib/chatsClient.js`, replace the 8-level nested ternary (lines 14-31) with a `SNAKE_TO_CAMEL` map object and `SNAKE_TO_CAMEL[key] ?? key`

5. **Clean dead code** (#30):
   - In `lib/utils.js`: delete `safeHydration` function (never imported anywhere)
   - Create `lib/formatters.js` with `formatDate` moved from `lib/utils.js`
   - Update imports of `formatDate` in `Folder.jsx` and `UsersTab.jsx` to use `"@/lib/formatters"`
   - Delete `lib/utils.js` if now empty
   - In `lib/search.js`: delete `searchByKey` and `searchByKeys` functions (only `searchWithHighlights` is imported)

6. **Fix package.json** (#31, #32, #33):
   - Remove `"tailwind-merge"` from dependencies (never imported)
   - Remove `"@preact/preset-vite"` from `dependencies` (keep in `devDependencies`)
   - Add `"fuzzysort": "^3.0.0"` to dependencies (currently hoisted from workspace)

### 2. A11y Primitives: Modal Focus Trap, Switch ARIA, Icon Labels
- **Task ID**: a11y-primitives
- **Depends On**: foundation
- **Assigned To**: `a11y-primitives-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 3, 4, 5, 6)
- **Findings covered**: #1, #6, #7, #23, #34, #39, #40

**Actions:**

1. **Modal.jsx focus trap** (#1, #17 partial):
   - Add `role="dialog"` and `aria-modal="true"` to the modal container
   - Add `aria-labelledby` pointing to the title element (give title an `id`)
   - Add focus trap: on mount, collect focusable elements inside modal, trap Tab/Shift+Tab to cycle within them
   - Add `aria-label="Close"` to the close button
   - Implementation: Use a simple `useEffect` that on mount: saves `document.activeElement`, focuses first focusable element in modal, adds keydown handler for Tab cycling, on unmount: restores focus to saved element. This is a valid useEffect (syncing with DOM/browser focus API).

2. **Switch.jsx accessibility** (#6):
   - Add `role="switch"` to the inner toggle `<div>` (the one with `tabIndex`)
   - Add `aria-checked={value}` to the same element
   - Add `aria-label={label}` to the toggle element when label is provided
   - Change `<label htmlFor={id}>` to use a proper association: give the toggle div a unique id and point `htmlFor` to it, OR wrap the label+toggle in a `<label>` element

3. **ErrorBanner role="alert"** (#40):
   - Add `role="alert"` to the outer `<div>` in ErrorBanner.jsx so screen readers announce errors immediately

4. **textarea.jsx opacity fix** (#34):
   - Change `disabled:opacity-0` to `disabled:opacity-50` in the className string

5. **Avatar.jsx img tag** (#39):
   - Replace the `<span>` with CSS `backgroundImage` with an actual `<img>` element
   - Add `alt={initials || "User avatar"}` attribute
   - Keep the same visual styling using `object-cover rounded-full`

6. **MessageList aria-live** (#23):
   - Wrap the message list content in a container with `aria-live="polite"` and `aria-relevant="additions"`
   - This ensures screen readers announce new messages as they stream in

7. **Icon button aria-labels sweep** (#7):
   In `InputArea.jsx`:
   - Attachment button: add `aria-label="Add attachment"`
   - Image mode button: add `aria-label={imageMode ? "Exit image mode" : "Generate image"}`
   - Web search button: add `aria-label="Search web"`
   - Voice button: add `aria-label` matching the existing `title` attribute
   - Send button: add `aria-label="Send message"`
   - Chat textarea: add `aria-label="Message input"`

   In `FileUpload.jsx`:
   - Remove button: add `aria-label={`Remove ${file.name}`}`

   In `ToolbarGroup.jsx`:
   - Ensure `ToolbarButton` passes through `aria-label` prop

8. **InputArea hasContent expression** (#29):
   - Change `const hasContent = () => input.trim() || selectedFiles.length > 0;` to `const hasContent = input.trim() || selectedFiles.length > 0;`
   - Update references from `hasContent()` to `hasContent` at lines 39 and 86

9. **MessageList empty state** (#36):
   - When `messages` is empty and `!isLoading` and `!isGeneratingImage`, render a centered welcome/prompt message like "Start a conversation" with a subtle icon

### 3. Dropdown Refactor: HeadlessUI Migration & Shared Base
- **Task ID**: dropdown-refactor
- **Depends On**: foundation
- **Assigned To**: `dropdown-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2, 4, 5, 6)
- **Findings covered**: #3, #17, #18, #19, #20

**Actions:**

1. **Merge ModelSelector + ImageModelSelector into shared base** (#19):
   - The two components are nearly identical. Create a single `ModelSelector.jsx` that accepts props for:
     - `type`: `"text"` or `"image"` (determines query key and accent color)
     - `accentColor`: `"blue"` (text) or `"pink"` (image)
     - `emptyMessage`: custom message when no models available
   - Use HeadlessUI `Menu` component (already in project via `@headlessui/react`) which provides:
     - `role="menu"` / `role="menuitem"` automatically
     - `aria-expanded` on trigger
     - Arrow key navigation
     - Escape to close
     - Click outside to close (eliminates the manual useEffect)
     - Focus management
   - Delete the separate `ImageModelSelector.jsx`
   - Update `ChatInterface.jsx` to use the unified component with `type="image"` prop
   - Implementation pattern:
   ```jsx
   import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";

   const ModelSelector = ({ currentModel, onModelChange, type = "text" }) => {
     const accentColor = type === "image" ? "pink" : "blue";
     const { data, isLoading } = useQuery({
       queryKey: ["models", type],
       queryFn: () => providersClient.getEnabledModelsByType(type),
       staleTime: CACHE_DURATIONS.IMAGE_MODELS,
     });
     // ... rest of component using Menu/MenuButton/MenuItems/MenuItem
   };
   ```

2. **UserMenu HeadlessUI migration** (#17):
   - Refactor `UserMenu.jsx` to use HeadlessUI `Menu` component
   - This eliminates the manual click-outside useEffect (lines 12-20)
   - Gains keyboard navigation, ARIA attributes, and Escape handling for free
   - Keep the same visual styling, just swap the structural elements

3. **KnowledgeBaseSelector fix** (#20):
   - Replace all `class` attributes with `className` (Preact supports both but project convention is `className`)
   - Replace non-theme CSS classes with theme tokens:
     - `bg-primary/20` → `bg-theme-blue/20`
     - `text-primary` → `text-theme-blue`
     - `text-muted-foreground` → `text-theme-text-muted`
     - `hover:bg-muted` → `hover:bg-theme-surface-strong/50`
     - `bg-card` → `bg-theme-surface`
     - `border-border` → `border-theme-surface-strong`
     - `text-primary-foreground` → `text-white`
   - Add Escape key handler to close the dropdown
   - Add click-outside handling (use the backdrop div pattern already in the component, just needs Escape)

4. **Eliminate click-outside duplication** (#18):
   - After migrating ModelSelector and UserMenu to HeadlessUI, the manual click-outside useEffect is eliminated in 3 of 4 locations
   - The remaining instance in `ChatContextMenu.jsx` is unique (positioning-based) and stays

### 4. Admin & Auth: Replace Native Dialogs, Fix Mutations, Form Labels
- **Task ID**: admin-auth-fixes
- **Depends On**: foundation
- **Assigned To**: `admin-auth-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2, 3, 5, 6)
- **Findings covered**: #4, #5, #11, #22, #35, #37

**Actions:**

1. **Replace confirm() in ConnectionsTab** (#4):
   - Add a `deleteConfirm` state: `const [deleteConfirm, setDeleteConfirm] = useState(null)` (holds provider object or null)
   - Replace the `confirm()` call (lines 192-199) with `setDeleteConfirm(provider)`
   - Render a `<Modal>` when `deleteConfirm` is set:
     ```jsx
     {deleteConfirm && (
       <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="Delete Connection">
         <p>Delete {deleteConfirm.display_name}? This will also delete all associated models.</p>
         <div className="mt-4 flex justify-end gap-3">
           <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
           <Button color="red" onClick={() => {
             deleteMutation.mutate(deleteConfirm.id);
             setDeleteConfirm(null);
           }}>Delete</Button>
         </div>
       </Modal>
     )}
     ```

2. **Fix per-item mutation pending states** (#11):
   - For `refreshMutation`: change `disabled={refreshMutation.isPending}` to `disabled={refreshMutation.isPending && refreshMutation.variables === provider.id}`
   - Same pattern for the spin animation class
   - For `toggleMutation`: same pattern using `toggleMutation.variables?.providerId === provider.id`
   - For `deleteMutation`: same pattern using `deleteMutation.variables === provider.id`

3. **Replace alert() in AuthPage** (#5):
   - Remove `alert("Passwords do not match")` (line 22)
   - Add a local `validationError` state or reuse the existing `error` state from `useAuthState`
   - When passwords don't match, use the `useAuthState` error mechanism or set local state that renders via the existing error display (line 108-110)
   - Simplest: call the existing `clearError` then set a local validation error that displays in the same error div

4. **Add error handling to chat creation** (#22):
   - In `ChatInterface.jsx` `handleNewChat` (line 32-35): wrap in try/catch, show toast on error
     ```jsx
     const handleNewChat = async () => {
       try {
         const newChat = await createChatMutation.mutateAsync();
         navigate({ to: "/chat/$chatId", params: { chatId: newChat.id } });
       } catch (err) {
         toast.error("Failed to create chat");
       }
     };
     ```
   - In `IndexRouteGuard.jsx` `createChatMutation.mutate` call: add `onError` callback that shows an error state instead of "Redirecting..." forever

5. **Form label pairing** (#35):
   In each of these files, add `id` to `<input>` elements and matching `htmlFor` to `<label>` elements:
   - `CreateUserModal.jsx` — username, password, role inputs
   - `EditProviderModal.jsx` — API key, base URL inputs
   - `AddProviderModal.jsx` — all form inputs in the multi-step flow
   - `ResetPasswordModal.jsx` — new password input
   - `EditUserRoleModal.jsx` — role select

6. **Users table responsive** (#37):
   - Wrap the `<table>` in a `<div className="overflow-x-auto">` to allow horizontal scroll on mobile
   - This is the minimal fix; a full card-layout refactor is out of scope

### 5. Sidebar & Layout: Delete Confirmation, Decomposition, Token Fix
- **Task ID**: sidebar-layout
- **Depends On**: foundation
- **Assigned To**: `sidebar-layout-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2, 3, 4, 6)
- **Findings covered**: #2, #9, #10, #21, #24, #38

**Actions:**

1. **Add chat delete confirmation** (#2):
   - Add a `deleteConfirm` state to Sidebar: `const [deleteConfirm, setDeleteConfirm] = useState(null)`
   - Change `handleDeleteChat` to set `deleteConfirm` instead of immediately deleting
   - Render a `<Modal>` for confirmation:
     ```jsx
     {deleteConfirm && (
       <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title="Delete Chat">
         <p className="text-theme-text-muted">This chat will be permanently deleted.</p>
         <div className="mt-4 flex justify-end gap-3">
           <button onClick={() => setDeleteConfirm(null)} className="...">Cancel</button>
           <button onClick={() => { /* call actual delete, then setDeleteConfirm(null) */ }} className="...">Delete</button>
         </div>
       </Modal>
     )}
     ```
   - This covers both the inline delete button and context menu delete

2. **Use useChatActions instead of duplicate handlers** (#10):
   - Import `useChatActions` in Sidebar
   - Remove the duplicate `pinChatMutation`, `unpinChatMutation`, `archiveChatMutation`, `updateChatMutation` declarations (lines 385-388)
   - Remove the duplicate `handlePin`, `handleUnpin`, `handleArchive` functions (lines 414-426)
   - Use the handlers from `useChatActions()` instead
   - Note: Sidebar's `handleRename` is different from `useChatActions`'s `handleRename` (Sidebar uses inline editing, useChatActions uses `prompt()`). Keep Sidebar's version for inline rename.

3. **Fix hardcoded Catppuccin tokens** (#24):
   - Line 534: Replace `text-latte-overlay0 dark:text-macchiato-overlay0 hover:text-latte-text dark:hover:text-macchiato-text hover:bg-latte-surface0/50 dark:hover:bg-macchiato-surface0/50` with `text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-strong/50`

4. **Sidebar accessibility** (partial #7, #8 from Sidebar scope):
   - Mobile close button (line 523-527): add `aria-label="Close sidebar"`
   - Desktop collapse button (line 532-536): add `aria-label="Collapse sidebar"`
   - Mobile overlay (line 495-499): add `aria-label="Close sidebar"` and `role="button"`
   - Logo div (line 507-518): add `role="button"`, `tabIndex={0}`, `onKeyDown` handler for Enter/Space
   - Search input (line 558-564): add `aria-label="Search chats"`

5. **Verify dangerouslySetInnerHTML safety** (#21):
   - Check that `fuzzysort`'s `highlight("<mark>", "</mark>")` method escapes HTML entities in the matched text
   - If it does (fuzzysort v3 does escape by default), add a comment noting this
   - If it doesn't, add `DOMPurify` sanitization or switch to a React-rendered highlight approach

6. **VoiceSettings: use shared Modal** (#38 partial):
   - Refactor VoiceSettings to use the shared `Modal` component instead of its own hand-rolled modal markup
   - This gains Escape key handling, focus trapping (after task 2 adds it), and consistent styling
   ```jsx
   const VoiceSettings = ({ voiceControls, onClose }) => (
     <Modal isOpen={true} onClose={onClose} title="Voice Settings">
       {/* existing voice settings content without the modal chrome */}
     </Modal>
   );
   ```

7. **PullModelModal: use shared Modal** (#38):
   - Refactor PullModelModal to use the shared `Modal` component for its outer shell
   - Remove the redundant autoFocus `useEffect` (line 13-16) since Modal already has `autoFocus` on the input (line 237) and Modal will handle focus management
   - Derive `isComplete` from `progress?.percentage === 100` instead of separate useState (#28)

### 6. React Patterns: useAppSettings, ThemeSelector, useIsMobile
- **Task ID**: react-patterns
- **Depends On**: foundation
- **Assigned To**: `react-patterns-builder`
- **Agent Type**: `builder`
- **Parallel**: true (with tasks 2, 3, 4, 5)
- **Findings covered**: #8, #15, #26, #27

**Actions:**

1. **Convert useAppSettings to TanStack Query** (#8):
   - Replace the manual fetch/loading/error Zustand store with TanStack Query hooks
   - Create `useAppSettingsQuery()` using `useQuery`:
     ```jsx
     export function useAppSettingsQuery() {
       return useQuery({
         queryKey: ["app-settings"],
         queryFn: async () => {
           const response = await fetch("/api/settings");
           if (!response.ok) throw new Error("Failed to fetch settings");
           const data = await response.json();
           return normalizeAppSettings(data);
         },
         staleTime: Infinity,
       });
     }
     ```
   - Create `useUpdateAppSettingsMutation()` using `useMutation`:
     ```jsx
     export function useUpdateAppSettingsMutation() {
       const queryClient = useQueryClient();
       return useMutation({
         mutationFn: async (updates) => {
           const response = await fetch("/api/settings", {
             method: "PUT",
             headers: { "Content-Type": "application/json" },
             credentials: "include",
             body: JSON.stringify(updates),
           });
           if (!response.ok) throw new Error("Failed to update settings");
           return response.json();
         },
         onSuccess: (data) => {
           queryClient.setQueryData(["app-settings"], normalizeAppSettings(data));
         },
       });
     }
     ```
   - Update all consumers: `Sidebar.jsx` (reads `appName`, `logoIcon`), `CustomizeTab.jsx` (reads + writes)
   - Keep the file at `state/useAppSettings.js` but export hooks instead of Zustand store
   - If any consumer calls `fetchSettings()` on mount, replace with the query hook which auto-fetches

2. **ThemeSelector: useEffect+useState → useQuery** (#15):
   - In `ThemeCardWithData`, replace:
     ```jsx
     const [themeData, setThemeData] = useState(null);
     useEffect(() => {
       fetch(themePath).then(res => res.json()).then(setThemeData).catch(console.error);
     }, [themePath]);
     ```
   - With:
     ```jsx
     const { data: themeData } = useQuery({
       queryKey: ["theme-preview", themeId],
       queryFn: () => fetch(themePath).then(r => r.json()),
       staleTime: Infinity,
     });
     ```
   - This gives free deduplication (15 theme cards won't fire 15 identical requests) and error handling

3. **useIsMobile: matchMedia** (#26):
   - Replace resize event listener with `matchMedia` change listener:
     ```jsx
     export function useIsMobile() {
       const query = `(max-width: ${UI_CONSTANTS.BREAKPOINT_MD - 1}px)`;
       const [isMobile, setIsMobile] = useState(
         () => typeof window !== "undefined" && window.matchMedia(query).matches
       );

       useEffect(() => {
         if (typeof window === "undefined") return;
         const mql = window.matchMedia(query);
         const handler = (e) => setIsMobile(e.matches);
         mql.addEventListener("change", handler);
         return () => mql.removeEventListener("change", handler);
       }, []);

       return isMobile;
     }
     ```
   - Fires only when the breakpoint threshold is crossed, not on every pixel of resize

4. **useChatVoice: useLayoutEffect → useEffect** (#27):
   - Change `useLayoutEffect` to `useEffect` on line 27 of `hooks/useChatVoice.js`
   - Speech synthesis doesn't need to block painting — `useEffect` is correct for this external system sync

### 7. Validate All 40 Fixes
- **Task ID**: validate-all
- **Depends On**: a11y-primitives, dropdown-refactor, admin-auth-fixes, sidebar-layout, react-patterns
- **Assigned To**: `audit-validator`
- **Agent Type**: `validator`
- **Parallel**: false
- **Findings covered**: ALL (verification pass)

**Actions:**

1. **Checklist verification** — For each of the 40 findings, read the modified file and confirm the fix:
   - [ ] #1: Modal.jsx has focus trap, role="dialog", aria-modal
   - [ ] #2: Chat delete shows confirmation modal
   - [ ] #3: ModelSelector/ImageModelSelector/UserMenu have keyboard nav (HeadlessUI Menu)
   - [ ] #4: ConnectionsTab uses Modal instead of confirm()
   - [ ] #5: AuthPage uses inline error instead of alert()
   - [ ] #6: Switch has role="switch" and aria-checked
   - [ ] #7: All icon-only buttons have aria-label
   - [ ] #8: useAppSettings uses TanStack Query
   - [ ] #9: Sidebar uses useChatActions (reduced duplication)
   - [ ] #10: Duplicate handlers removed from Sidebar
   - [ ] #11: ConnectionsTab mutation pending states are per-item
   - [ ] #12: Single clsx source (npm package), lib/clsx.js deleted
   - [ ] #13: Single messageUtils file at lib/messageUtils.js
   - [ ] #14: (Deferred — API client consolidation is future work)
   - [ ] #15: ThemeCardWithData uses useQuery
   - [ ] #16: ErrorBanner uses extractErrorMessage from errorHandler
   - [ ] #17: UserMenu uses HeadlessUI Menu
   - [ ] #18: Click-outside duplication eliminated (3 of 4 via HeadlessUI)
   - [ ] #19: ModelSelector/ImageModelSelector merged into shared base
   - [ ] #20: KnowledgeBaseSelector uses className and theme-* tokens
   - [ ] #21: dangerouslySetInnerHTML verified safe or sanitized
   - [ ] #22: handleNewChat and IndexRouteGuard have error handling
   - [ ] #23: MessageList has aria-live region
   - [ ] #24: Sidebar collapse button uses theme-* tokens
   - [ ] #25: toCamelCase uses map lookup
   - [ ] #26: useIsMobile uses matchMedia
   - [ ] #27: useChatVoice uses useEffect (not useLayoutEffect)
   - [ ] #28: PullModelModal derives isComplete
   - [ ] #29: InputArea hasContent is expression not function
   - [ ] #30: Dead code removed (safeHydration, searchByKey, searchByKeys)
   - [ ] #31: tailwind-merge removed from package.json
   - [ ] #32: @preact/preset-vite only in devDependencies
   - [ ] #33: fuzzysort added to package.json
   - [ ] #34: textarea uses disabled:opacity-50
   - [ ] #35: Admin form inputs have htmlFor/id pairing
   - [ ] #36: MessageList has empty state
   - [ ] #37: Users table has overflow-x-auto wrapper
   - [ ] #38: VoiceSettings and PullModelModal use shared Modal
   - [ ] #39: Avatar uses img tag with alt text
   - [ ] #40: ErrorBanner has role="alert"

2. **Build verification** — Run `cd frontend && npm run build` to confirm no compilation errors

3. **Import verification** — Grep for any remaining imports of deleted files:
   - `@/lib/clsx` — should be zero
   - `@/utils/message/messageUtils` — should be zero
   - `@/lib/utils` — should be zero (replaced by `@/lib/formatters`)

4. **Consistency check** — Grep for remaining anti-patterns:
   - `confirm(` — should only appear in `useChatActions.js` (which uses it for rename, TODO for future)
   - `alert(` — should be zero
   - `disabled:opacity-0` — should be zero
   - `class=` (without `Name`) in JSX files — should be zero in modified files

5. **Report findings** — List any remaining issues or regressions

## Acceptance Criteria
1. All 40 audit findings resolved (except #14 API client consolidation, deferred)
2. `npm run build` passes with zero errors in frontend
3. No imports reference deleted files (`lib/clsx.js`, `utils/message/messageUtils.js`, `lib/utils.js`)
4. Zero `confirm(` calls in admin components
5. Zero `alert(` calls anywhere in the codebase
6. Every `<Modal>` has focus trapping
7. Every icon-only `<button>` has `aria-label`
8. `Switch` component has `role="switch"` and `aria-checked`
9. `ErrorBanner` has `role="alert"`
10. ModelSelector and ImageModelSelector share a single component
11. KnowledgeBaseSelector uses `className` and `theme-*` tokens exclusively
12. `useAppSettings` uses TanStack Query, not manual fetch in Zustand
13. `useIsMobile` uses `matchMedia`
14. No hardcoded Catppuccin tokens (`latte-*`, `macchiato-*`) outside theme definition files

## Validation Commands
- `cd /home/mikekey/Builds/FasterChat/app/frontend && npm run build` — Verify frontend builds without errors
- `grep -r "@/lib/clsx" frontend/src/` — Should return zero results
- `grep -r "@/utils/message" frontend/src/` — Should return zero results
- `grep -r "@/lib/utils" frontend/src/` — Should return zero results
- `grep -rn "confirm(" frontend/src/components/admin/` — Should return zero results
- `grep -rn "alert(" frontend/src/` — Should return zero results
- `grep -rn "disabled:opacity-0" frontend/src/` — Should return zero results
- `grep -rn 'class="' frontend/src/components/chat/KnowledgeBaseSelector.jsx` — Should return zero results
- `grep -rn "latte-\|macchiato-" frontend/src/components/layout/Sidebar.jsx` — Should return zero results
- `grep -rn "useLayoutEffect" frontend/src/hooks/useChatVoice.js` — Should return zero results
- `grep -rn "tailwind-merge" frontend/package.json` — Should return zero results

## Notes
- **Finding #14 (API client consolidation) is deferred** — Creating a shared `apiFetch` utility and migrating all 8 fetch patterns is a larger refactor that deserves its own focused session. The toCamelCase fix (#25) is included as a standalone improvement.
- **Finding #14 scope note** — When tackled, create `lib/api.js` with a shared `apiFetch(endpoint, options)` and convert `chatsClient`, `providersClient`, `adminClient`, `authClient`, inline fetches in `useFolders`, `useImageGeneration`, `FileUpload`, and `MessageAttachment`.
- **useChatActions note** — `useChatActions.handleDelete` still uses `confirm()` and `handleRename` uses `prompt()`. These should be cleaned up in Stream D when integrating with Sidebar (Sidebar's inline rename is better UX). The Sidebar builder should keep Sidebar's inline rename and ignore `useChatActions.handleRename`.
- **HeadlessUI version** — The project uses `@headlessui/react@^2.2.0` which works with Preact via `@preact/compat`. The `Menu` component from this version supports all needed ARIA and keyboard features.
- **File ownership conflicts** — `InputArea.jsx` and `MessageList.jsx` are touched by both Stream A (a11y) and Stream E (patterns). Stream A owns these files since it runs first alphabetically. Stream E's changes (hasContent expression, empty state) are included in Stream A's scope to avoid conflicts.
- **PullModelModal** is touched by both Stream D (sidebar-layout) and Stream E (patterns). Stream D owns it and includes the `isComplete` derivation fix.
