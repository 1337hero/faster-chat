# Component Patterns Reference

Detailed examples for the 8-section component structure, state management, and common patterns.

## Table of Contents

- [Full Component Example](#full-component-example)
- [TanStack Query Patterns](#tanstack-query-patterns)
- [Mutation with Optimistic Updates](#mutation-with-optimistic-updates)
- [Zustand Store Pattern](#zustand-store-pattern)
- [Data Fetching Hierarchy](#data-fetching-hierarchy)
- [shadcn/ui Component Pattern](#shadcnui-component-pattern)
- [Common Anti-Pattern Fixes](#common-anti-pattern-fixes)
- [Project Scaffolding Checklist](#project-scaffolding-checklist)

## Full Component Example

```jsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "preact/hooks";
import { api } from "@/api/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const UserProfile = ({ userId }) => {
  const queryClient = useQueryClient();

  // 1. Server state
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.get(`/users/${userId}`),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!userId,
  });

  const updateUser = useMutation({
    mutationFn: (updates) => api.patch(`/users/${userId}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user", userId] }),
  });

  // 2. Global client state
  const { permissions } = useAuthStore();

  // 3. Local state
  const [isEditing, setIsEditing] = useState(false);

  // 4. Refs
  const formRef = useRef(null);

  // 5. Custom hooks
  // (none in this example)

  // 6. Derived values
  const canEdit = permissions.includes("user:write");
  const fullName = `${user?.firstName} ${user?.lastName}`;

  // 7. Effects
  // (none needed — no DOM sync, subscriptions, or analytics here)

  // 8. Event handlers
  const handleSave = async (formData) => {
    await updateUser.mutateAsync(formData);
    setIsEditing(false);
  };

  // Early returns
  if (isLoading) return <ProfileSkeleton />;
  if (error) return <ErrorCard error={error} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fullName}</CardTitle>
        {canEdit && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <ProfileForm
            ref={formRef}
            user={user}
            onSave={handleSave}
            onCancel={() => setIsEditing(false)}
            isSaving={updateUser.isPending}
          />
        ) : (
          <ProfileDisplay user={user} />
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfile;
```

## TanStack Query Patterns

### Basic Query Hook

```jsx
const useUsers = (filters) => {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: () => api.get("/users", { params: filters }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!filters.teamId,
  });
};
```

### Query in Page Component (Data Owner)

```jsx
const UsersPage = () => {
  const [filters, setFilters] = useState({ status: "active" });
  const { data: users, isLoading, error } = useUsers(filters);

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  // Page owns the data, passes down as props
  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onChange={setFilters} />
      <UserTable users={users} />
      <UserStats users={users} />
    </div>
  );
};
```

### Cache Time Guidelines

| Data type | staleTime | gcTime |
|-----------|-----------|--------|
| Rarely changes (profile, settings) | 30min | 1hr |
| Moderate changes (lists, dashboards) | 5min | 30min |
| Frequently changes (notifications, chat) | 30sec–2min | 5min |
| Real-time data | 0 | 5min |

## Mutation with Optimistic Updates

```jsx
const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => api.patch(`/tasks/${updates.id}`, updates),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData(["tasks"]);

      queryClient.setQueryData(["tasks"], (old) =>
        old.map((t) => (t.id === newData.id ? { ...t, ...newData } : t))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
```

## Zustand Store Pattern

Client state only — modals, UI preferences, non-server data.

```jsx
import { create } from "zustand";

const useUIStore = create((set) => ({
  sidebarOpen: false,
  activeModal: null,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}));
```

Never put server data in Zustand. If it comes from an API, it belongs in TanStack Query.

## Data Fetching Hierarchy

```
Page (fetches data)
├── FilterBar (receives filters, onChange callback)
├── DataTable (receives data as prop — does NOT refetch)
│   └── TableRow (receives row data as prop)
└── StatsSummary (receives same data — derives stats in render)
```

Pages own the data. Children receive props. No child component should independently fetch data the parent already has.

## shadcn/ui Component Pattern

Base UI components follow this structure:

```jsx
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const Badge = ({ className, variant, ...props }) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { Badge, badgeVariants };
```

Key patterns:
- **CVA** for variant definitions
- **`cn()`** merges base + variant + custom classes
- **Spread props** for composition flexibility
- **Named exports** (no default exports for UI primitives)
- **No prop types** on base UI — keep them minimal

## Common Anti-Pattern Fixes

### useEffect for state sync → event handler

```jsx
// BAD
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// GOOD — derive in render
const fullName = `${first} ${last}`;
```

### useCallback virus → plain function

```jsx
// BAD
const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []);

// GOOD
const handleClick = () => setCount(c => c + 1);
```

### Server data in useState → TanStack Query

```jsx
// BAD
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  api.get("/users").then(res => {
    setUsers(res.data);
    setLoading(false);
  });
}, []);

// GOOD
const { data: users, isLoading } = useQuery({
  queryKey: ["users"],
  queryFn: () => api.get("/users"),
});
```

### Prop drilling → composition

```jsx
// BAD — drilling through 3 levels
<Layout user={user}>
  <Sidebar user={user}>
    <UserMenu user={user} />
  </Sidebar>
</Layout>

// GOOD — composition
<Layout>
  <Sidebar>
    <UserMenu user={user} />
  </Sidebar>
</Layout>
```

## Project Scaffolding Checklist

When creating a new frontend project, verify:

- [ ] Bun as runtime, Vite as bundler
- [ ] `@/` path alias configured in vite.config.js
- [ ] `.jsx` for components, `.js` for utilities
- [ ] Feature-based folder structure (not type-based)
- [ ] TanStack Query for all API data
- [ ] Zustand or signals for UI state only
- [ ] Tailwind CSS with `cn()` utility
- [ ] No TypeScript — plain JS with JSDoc where needed
- [ ] No barrel files anywhere
- [ ] No useCallback in scaffolded code
- [ ] No useEffect for state derivation
- [ ] Prettier configured (2-space, double quotes, semicolons)
- [ ] shadcn/ui pattern for base components (CVA + cn)
- [ ] Early returns for loading/error in all data-fetching components
