import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUiState = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      preferredModel: "claude-sonnet-4-5",
      preferredImageModel: null,
      theme: "dark",
      autoScroll: true,
      imageMode: false,

      setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarCollapsed: (isCollapsed) => set({ sidebarCollapsed: isCollapsed }),
      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setPreferredModel: (modelId) => set({ preferredModel: modelId }),
      setPreferredImageModel: (modelId) => set({ preferredImageModel: modelId }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
      setAutoScroll: (enabled) => set({ autoScroll: enabled }),
      setImageMode: (enabled) => set({ imageMode: enabled }),
      toggleImageMode: () => set((state) => ({ imageMode: !state.imageMode })),
    }),
    {
      name: "ui-state",
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        sidebarCollapsed: state.sidebarCollapsed,
        preferredModel: state.preferredModel,
        preferredImageModel: state.preferredImageModel,
        theme: state.theme,
        autoScroll: state.autoScroll,
      }),
    }
  )
);
