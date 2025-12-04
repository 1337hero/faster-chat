FOLLOW THESE GUIDELINES AT ALL TIMES WHEN MAKING CODE CHANGES! NEVER EVER COMMIT ANYTHING YOURSELF!

### Key Architectural Patterns
1. Component Organization: Components are feature-based, not type-based. Each feature folder contains all related components.
2. UI Components: Base components follow shadcn/ui patterns in `src/components/ui/`. These are headless, styled with Tailwind, use UI primitives.
3. State Management:
   - Use Zustand for global client state (user preferences, UI state, etc.)
   - Use TanStack Query for all server state (API data, caching, loading states)
   - Never duplicate server data in local state
   - Derive computed state from existing state rather than storing separately
4. Routing: Uses TanStack Router with a code-defined route tree in `frontend/src/routes.jsx` (root redirects to `/chat/:chatId`, renders `ChatInterface` under `SidebarLayout`); no auth guard layer in use.
5. API Integration: Chat uses AI SDK’s `DefaultChatTransport` hitting `/api/chat` (Vite proxy → Hono server at 3001); no axios layer—calls stay inside hooks/components with Dexie for local persistence.

## Documentation Guidelines
- **Place all documentation you write into `/docs` directory**
- Keep documentation organized by topic/feature
- Use markdown format for all documentation files

## React/Preact Coding Principles

### State Management Philosophy

**CRITICAL: Avoid useEffect Unless Absolutely Necessary**
- `useEffect` is a last resort and code smell in most cases
- Before using `useEffect`, you MUST consider these alternatives:
  1. **Derive state as expressions**: Compute values directly in render from existing state
  2. **Colocate logic**: Move side effects into event handlers where the state changes
  3. **Use TanStack Query lifecycle**: `onSuccess`, `onError`, `onSettled` callbacks
  4. **Use Zustand computed values**: Derive state in selectors
- The only valid uses of `useEffect`:
  - Syncing with external systems (DOM, browser APIs, third-party libraries)
  - Cleanup subscriptions
  - Analytics/logging (non-UI side effects)

**Minimize useState Calls**
- If state is dependent on other state, derive it as an expression in render - don't add new useState
- Before adding useState, ask:
  1. Can I use an expression with existing local state?
  2. Can I use an expression with global Zustand state?
  3. Can I use an expression with TanStack Query data?
  4. Can I use an expression with props or loader data?
- Example: Don't add `useState` for `isOpen` on error popovers - use the error state itself as the open condition
- Only use useState for true local UI state that can't be derived (form inputs, toggles, modals)

**NEVER Use useCallback**
- `useCallback` is a virus that infects codebases with unnecessary complexity
- NEVER pass functions to `useEffect` or `useMemo` dependencies - this forces `useCallback` everywhere
- If you need stable function references, you're likely over-optimizing or using `useEffect` incorrectly
- Event handlers don't need `useCallback` - React doesn't re-render on every function re-creation
- Exception: Only use if you've profiled and proven a performance issue exists

**Server State vs. Client State**
- Use TanStack Query for ALL server data - it handles caching, loading, and error states
- NEVER duplicate server data in useState/Zustand - always read from TanStack Query cache
- Use Zustand only for client-side state: UI preferences, theme, sidebar state, etc.

**Derive, Don't Duplicate**
- If data can be computed from existing state, derive it - don't store it separately
- Examples of derived state (DO THIS):
  ```javascript
  // ✅ Derive from existing state
  const hasError = error !== null;
  const filteredItems = items.filter(item => item.active);
  const isValid = email.includes('@') && password.length >= 8;
  ```
- Examples of unnecessary state (DON'T DO THIS):
  ```javascript
  // ❌ Don't duplicate with useState
  const [hasError, setHasError] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isValid, setIsValid] = useState(false);
  ```

### Component Composition

- **Small, focused components**: One responsibility per component. If scrolling to see it all, it's too big
- **Composition over configuration**: Pass `children` and use slots rather than dozens of boolean props
- **No prop drilling beyond 2 levels**: Use composition, Zustand, or TanStack Query instead
- **Colocate related code**: Component, styles, and utilities together - don't organize by file type

### Data Flow Patterns

- **Single source of truth**: Fetch data ONCE at the highest component that needs it, pass down as props
- **Data flows down, events flow up**: Props pass data to children, callbacks notify parents
- **Never refetch in children**: If parent has the data, pass it via props - don't duplicate API calls
- **Optimistic updates**: Update UI immediately on user action, rollback if server disagrees

### Hook Usage Rules

**useMemo**
- Only use after profiling shows a performance problem
- Don't use for cheap calculations - JavaScript is fast
- Exception: Expensive computations in frequently re-rendering components

**useCallback**
- Avoid at all costs (see above)
- Creates false dependencies and infects the codebase
- Event handlers don't need it

**useEffect**
- Avoid (see detailed guidelines above)
- Question every use - usually there's a better way
- Valid uses: DOM sync, external subscriptions, analytics

### Code Quality Principles

- **Delete code aggressively**: Best code is no code. Feature unused? Delete it
- **Boring is good**: Use proven patterns. Don't invent new state management
- **Naming matters**: `isUserEligibleForDiscount` beats `checkUser` with comments
- **Consistency over preference**: Follow existing codebase patterns
- **Build for today**: Don't create abstractions for hypothetical future features (YAGNI)
- **Self-documenting code**: Rename variables and extract functions instead of adding comments

### Anti-Patterns to Eliminate

- ❌ Using `useEffect` to sync state between variables
- ❌ Duplicating server data in `useState` or Zustand
- ❌ Adding `useState` for derived values
- ❌ Using `useCallback` to prevent re-renders
- ❌ Wrapper components that just pass props through
- ❌ Custom hooks that don't use React hooks internally
- ❌ Comments explaining what code does (code should be self-evident)
- ❌ `utils.js` grab-bag files (name by purpose: `formatters.js`, `validators.js`)

### Before You Code Checklist

When adding state or effects, ask yourself:
1. Can I delete any of this code and lose nothing?
2. Am I solving a real problem or an imaginary future one?
3. Have I duplicated server state in client state?
4. Can this derived state be an expression instead of useState?
5. Is this useEffect necessary, or can I move logic to an event handler?
6. Am I using useCallback? (If yes, reconsider your approach)
7. Does this code follow patterns already in this codebase?
8. Would this be obvious to a new developer without explanation?

## CSS/Animation Performance Patterns

### Snappy Transitions
- Use `ease-snappy` timing function for UI interactions (defined in vite.config.js as `cubic-bezier(.2, .4, .1, .95)`)
- Fast start, quick settle - makes interfaces feel responsive
- Apply to hover states, toggles, slide-ins, and other micro-interactions

### Transition Best Practices
- Use specific transition properties (`transition-colors`, `transition-transform`) instead of `transition-all`
- Keep durations short: 75ms for hovers, 150ms max for most UI transitions
- Combine: `transition-colors duration-75 ease-snappy`

### GPU Acceleration
- Add `transform-gpu` to elements with:
  - `animate-*` classes (ping, pulse, spin, bounce)
  - `transition-transform`
  - Transform classes (`translate-*`, `rotate-*`, `scale-*`)
- This forces GPU compositing via `translateZ(0)` for smoother animations

### Scroll Containers
- Use `overflow-y-scroll` with `scrollbar-gutter: stable both-edges` to prevent content shift
- Avoid JS scroll handlers when native scrolling suffices
- Keep fixed/absolute overlays (headers, input areas) outside the scroll container

### Transform-Based Animations
- Prefer `translate-x/y` transforms over `left/top/opacity` for slide animations
- Transforms are GPU-accelerated and don't trigger layout recalculations
- Example: Slide-in delete button uses `translate-x-2 group-hover:translate-x-0` instead of opacity
