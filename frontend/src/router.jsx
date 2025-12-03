import MainLayout from "@/components/layout/MainLayout";
import Sidebar from "@/components/layout/Sidebar";
import {
  hasSeenAdminConnectionsOnboarding,
  markAdminConnectionsOnboardingSeen,
} from "@/lib/adminOnboarding";
import { chatsClient } from "@/lib/chatsClient";
import { useAuthState } from "@/state/useAuthState";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "preact/compat";

// Lazy load page components
const Login = lazy(() => import("@/pages/public/Login"));
const Chat = lazy(() => import("@/pages/authenticated/Chat"));
const Admin = lazy(() => import("@/pages/authenticated/Admin"));
const Settings = lazy(() => import("@/pages/authenticated/Settings"));

// Loading component
const LoadingSpinner = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-latte-subtext0 dark:text-macchiato-subtext0">Loading...</div>
    </div>
  );
};

// Protected Layout Component - handles auth checks and sidebar layout
const ProtectedLayout = () => {
  const { user, isLoading, checkSession } = useAuthState();

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
  component: () => {
    const navigate = useNavigate();
    const { user } = useAuthState();
    const [isChecking, setIsChecking] = useState(true);
    const hasStartedNavigation = useRef(false);

    useEffect(() => {
      // Prevent double execution
      if (hasStartedNavigation.current) return;

      async function loadChatOrCreateNew() {
        try {
          const existingChats = await chatsClient.getChats();
          const hasSeenOnboarding = hasSeenAdminConnectionsOnboarding(user?.id);

          // First-time admin onboarding: redirect to Connections tab before creating chats
          if (user?.role === "admin" && existingChats.length === 0 && !hasSeenOnboarding) {
            markAdminConnectionsOnboardingSeen(user.id);
            navigate({
              to: "/admin",
              search: { tab: "connections" },
              replace: true,
            });
            return;
          }

          if (existingChats && existingChats.length > 0) {
            // Load most recent chat
            navigate({
              to: "/chat/$chatId",
              params: { chatId: existingChats[0].id },
              replace: true,
            });
          } else {
            // Create new chat
            const newChat = await chatsClient.createChat();
            navigate({
              to: "/chat/$chatId",
              params: { chatId: newChat.id },
              replace: true,
            });
          }
        } catch (error) {
          console.error("Error loading chats:", error);
          // Fallback to new chat on error
          const newChat = await chatsClient.createChat();
          navigate({
            to: "/chat/$chatId",
            params: { chatId: newChat.id },
            replace: true,
          });
        } finally {
          setIsChecking(false);
        }
      }

      hasStartedNavigation.current = true;
      loadChatOrCreateNew();
    }, [navigate, user]);

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-latte-subtext0 dark:text-macchiato-subtext0">
          {isChecking ? "Loading..." : "Redirecting..."}
        </div>
      </div>
    );
  },
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
      search?.tab === "users" || search?.tab === "models" || search?.tab === "connections"
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

// Route Tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([indexRoute, chatRoute, adminRoute, settingsRoute]),
]);

// Create Router
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
