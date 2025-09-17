import { render } from 'preact';
import { StrictMode } from 'preact/compat';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import the route tree
import { routeTree } from './routes';
import './styles/globals.css';

// Create a new query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

function App() {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}

const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
