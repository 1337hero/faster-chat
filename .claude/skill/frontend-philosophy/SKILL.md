---
name: frontend-philosophy
description: >
  Frontend design philosophy and coding conventions for React/Preact applications.
  Enforces DHH-inspired simplicity, 8-section component structure, TanStack Query
  server state management, and strict anti-patterns (no useCallback, no useEffect
  for state sync, no barrel files, no TypeScript). Use when: (1) scaffolding new
  frontend projects, (2) building React/Preact components, (3) implementing features
  with state management, (4) reviewing or refactoring frontend code, (5) setting up
  project structure and file organization. Triggers on: "scaffold", "new project",
  "build a component", "create a page", "add a feature", "frontend", "React",
  "Preact", or any frontend implementation task.
---

# Frontend Philosophy

Authoritative conventions for all React/Preact work. These are not suggestions — they are the standard. When in doubt, choose the simpler path.

> "Every line of code is a liability. The best code is no code. The second best is simple, boring code that obviously works."

## Core Principles

1. **Simplicity over cleverness** — Write code a junior dev understands
2. **Convention over configuration** — Follow existing patterns, don't invent
3. **Optimize for understanding** — Code is read 10x more than written
4. **Embrace the monolith** — Colocate related concerns, don't split prematurely
5. **Performance through simplicity** — Fastest code is code that doesn't run

## Stack Defaults

| Purpose | Default | Notes |
|---------|---------|-------|
| Runtime/pkg | Bun | Fallback: npm. Never pnpm/yarn |
| Bundler | Vite | With `@/` path alias |
| Framework | React or Preact | + TanStack Query/Router |
| Styling | Tailwind CSS | Utility-first, `cn()` for merging |
| UI primitives | shadcn/ui pattern | CVA for variants, Radix primitives |
| Server state | TanStack Query | ONLY source of truth for API data |
| Client state | Zustand or Preact Signals | UI state only (modals, theme, filters) |
| Icons | @remixicon/react | `Ri*Line` for outline, `Ri*Fill` for solid |
| Types | **No TypeScript** | `.jsx` components, `.js` utilities |

### Why No TypeScript

Speed over ceremony. Type gymnastics add grief, not joy. Runtime validation at system boundaries, shared constants, JSDoc for complex functions.

## File Conventions

```
src/
├── components/
│   ├── ui/              # Base UI (shadcn pattern)
│   ├── billing/         # Feature-based grouping
│   ├── support/         # NOT type-based (lists/, forms/, displays/)
│   └── common/          # Shared across features
├── hooks/               # Custom hooks (use* prefix)
├── stores/              # Zustand stores
├── constants/           # Shared constants
├── lib/                 # Utilities (cn, formatters)
├── pages/               # Route-level components
└── api/                 # API client
```

**Naming rules:**
- `.jsx` components, `.js` utilities — always
- PascalCase component files, camelCase everything else
- `handle*` event handlers, `use*` hooks, `render*` render methods
- Feature-based folders, never type-based
- **No barrel files** (index.ts/js re-exports) — ever
- **No comments** unless logic is truly non-obvious

## Component Structure (8 Sections)

Every component follows this order. See [references/component-patterns.md](references/component-patterns.md) for full examples.

```jsx
const Component = ({ prop1, prop2 }) => {
  // 1. Server state (TanStack Query)
  const { data, isLoading, error } = useQuery({ ... });

  // 2. Global client state (Zustand/signals)
  const { theme } = useThemeStore();

  // 3. Local state (useState)
  const [isOpen, setIsOpen] = useState(false);

  // 4. Refs
  const formRef = useRef(null);

  // 5. Custom hooks
  const { isOnline } = useNetworkStatus();

  // 6. Derived values (compute in render, no useState)
  const isValid = email.includes("@");
  const fullName = `${data?.first} ${data?.last}`;

  // 7. Effects (DOM sync, subscriptions, analytics ONLY)
  useEffect(() => { ... }, [deps]);

  // 8. Event handlers
  const handleSubmit = () => { ... };

  // Return — early returns for loading/error first
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return ( ... );
};
```

## State Management Rules

### Server State = TanStack Query ONLY

```jsx
// CORRECT — single source of truth
const { data: users } = useQuery({
  queryKey: ["users", filters],
  queryFn: () => api.get("/users", { params: filters }),
  staleTime: 5 * 60 * 1000,
  gcTime: 60 * 60 * 1000,    // NOT cacheTime (v5)
});

// WRONG — duplicating server data in local state
const [users, setUsers] = useState([]);
useEffect(() => { fetchUsers().then(setUsers); }, []);
```

### Client State = Zustand or Signals

Only for UI concerns: modals, theme, sidebar, filters, form inputs.

### Derive, Don't Duplicate

```jsx
// CORRECT — derive in render
const hasError = error !== null;
const activeUsers = users?.filter(u => u.isActive);

// WRONG — useState for derived values
const [hasError, setHasError] = useState(false);
useEffect(() => setHasError(error !== null), [error]);
```

### Data Fetching Hierarchy

1. **Pages** fetch all required data
2. **Pass data as props** to children
3. **Never refetch in children** when parent has the data

## Critical Anti-Patterns

These are **hard rules**, not guidelines.

| NEVER do this | Do this instead |
|---------------|-----------------|
| `useEffect` for state sync | Move logic to event handlers |
| `useCallback` | Just define the function (almost never needed) |
| `useState` for derived values | Compute in render |
| Duplicate server data in useState | TanStack Query is the source of truth |
| Barrel files (index.ts re-exports) | Import directly from the file |
| `useMemo` without profiling first | Just compute it |
| Prop drilling beyond 2 levels | Composition or Zustand |
| Business logic in components | Extract to hooks or utilities |
| Multiple state management libs | TanStack Query + ONE client state lib |
| Inline styles or global CSS | Tailwind utilities |
| Premature abstraction | Rule of 3 — wait for 3+ use cases |
| Custom wrappers around libraries | Use the library directly |
| Over-commenting | Self-documenting names |

### Valid useEffect Uses

Only three:
1. **DOM synchronization** (focus, scroll, resize listeners)
2. **External subscriptions** (WebSocket, event emitters)
3. **Analytics/logging** (page views, tracking)

Everything else belongs in an event handler or TanStack Query.

## Formatting

Prettier defaults:
- 2-space indent, double quotes, semicolons
- 100 char print width, trailing commas ES5
- Tailwind plugin for class ordering

## UI Patterns

- Buttons: always `rounded-full`
- Cards: always `rounded-xl`
- Use `cn()` from `@/lib/utils` for class merging
- Use CVA (class-variance-authority) for component variants
- Composition over configuration — build with children and slots
- `data-slot` attributes for CSS targeting
- Early returns for loading/error states before main render

## Code Review Questions

Before shipping, ask:
1. Can a junior dev understand this?
2. Is this the simplest solution that works?
3. Does this follow existing patterns in the codebase?
