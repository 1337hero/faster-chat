import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUiState = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      preferredModel: "claude-sonnet-4-5",
      theme: "dark",

      setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (isCollapsed) => set({ sidebarCollapsed: isCollapsed }),
      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPreferredModel: (modelId) => set({ preferredModel: modelId }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
    }),
    {
      name: "ui-state",
    }
  )
);
