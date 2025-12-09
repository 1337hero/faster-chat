import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import { useAuthState } from "@/state/useAuthState";
import { IndexRouteGuard } from "@/components/layout/IndexRouteGuard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "preact/compat";

// Lazy load page components
const Login = lazy(() => import("@/pages/public/Login"));
const Chat = lazy(() => import("@/pages/authenticated/Chat"));
const Admin = lazy(() => import("@/pages/authenticated/Admin"));
const Settings = lazy(() => import("@/pages/authenticated/Settings"));
const Import = lazy(() => import("@/pages/authenticated/Import"));

// Loading component
const LoadingSpinner = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-theme-text-muted">Loading...</div>
    </div>
  );
};

// Protected Layout Component - handles auth checks and sidebar layout
const ProtectedLayout = () => {
  const { user, isLoading, checkSession } = useAuthState();

  // Global keyboard shortcuts (Ctrl+B, Ctrl+Shift+O, Ctrl+K)
  useKeyboardShortcuts();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout sidebar={<Sidebar />}>
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
};

// Root Route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Public Routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <Login />
    </Suspense>
  ),
});

// Protected Routes Parent
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
});

// Protected child routes
const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  component: IndexRouteGuard,
});

const chatRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/chat/$chatId",
  component: () => {
    const { chatId } = chatRoute.useParams();
    return <Chat chatId={chatId} />;
  },
});

const adminRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/admin",
  validateSearch: (search) => ({
    tab:
      search?.tab === "users" ||
      search?.tab === "models" ||
      search?.tab === "connections" ||
      search?.tab === "customize"
        ? search.tab
        : undefined,
  }),
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <Admin />
    </Suspense>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/settings",
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <Settings />
    </Suspense>
  ),
});

const importRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/import",
  component: () => (
    <Suspense fallback={<LoadingSpinner />}>
      <Import />
    </Suspense>
  ),
});

// Route Tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([indexRoute, chatRoute, adminRoute, settingsRoute, importRoute]),
]);

// Create Router
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
