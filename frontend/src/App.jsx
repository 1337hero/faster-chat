import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { useEffect } from "preact/hooks";
import { router } from "./router";
import { useThemeStore } from "./state/useThemeStore";
import { useAppSettings } from "./state/useAppSettings";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

const App = () => {
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const mode = useThemeStore((state) => state.mode);
  const fetchSettings = useAppSettings((state) => state.fetchSettings);

  // Initialize theme and app settings on app mount
  useEffect(() => {
    initializeTheme();
    fetchSettings();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        theme={mode}
        position="bottom-right"
        toastOptions={{
          className: "!bg-theme-surface !text-theme-text !border-theme-border",
        }}
      />
    </QueryClientProvider>
  );
};

export default App;
