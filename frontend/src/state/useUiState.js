import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiState = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      preferredModel: 'claude-sonnet-4-5',
      theme: 'dark',

      setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setPreferredModel: (modelId) => set({ preferredModel: modelId }),

      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';

        if (typeof window !== 'undefined') {
          if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }

        return { theme: newTheme };
      }),

      initializeTheme: () => set((state) => {
        if (typeof window !== 'undefined') {
          if (state.theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
        return {};
      }),
    }),
    {
      name: 'ui-state',
    }
  )
);
