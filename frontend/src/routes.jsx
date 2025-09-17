import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'preact/hooks';
import { nanoid } from 'nanoid';
import { SidebarLayout } from './components/layout/SidebarLayout';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import ChatInterface from './components/chat/ChatInterface';

// Root route with layout
const rootRoute = createRootRoute({
  component: () => (
    <>
      <SidebarLayout
        sidebar={<Sidebar />}
        navbar={<Navbar />}
      >
        <Outlet />
      </SidebarLayout>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  ),
});

// Index route - redirects to new chat
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const newChatId = nanoid();
    navigate({
      to: '/chat/$chatId',
      params: { chatId: newChatId },
      replace: true,
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Creating new chat...</div>
    </div>
  );
}

// Chat route
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chat/$chatId',
  component: ChatPageRoute,
});

function ChatPageRoute() {
  const { chatId } = chatRoute.useParams();
  return (
    <div className="flex-1">
      <ChatInterface chatId={chatId} />
    </div>
  );
}

// Export route tree
export const routeTree = rootRoute.addChildren([indexRoute, chatRoute]);
