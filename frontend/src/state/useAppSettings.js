import { create } from "zustand";

const DEFAULT_SETTINGS = {
  appName: "Faster Chat",
};

export const useAppSettings = create((set, get) => ({
  appName: DEFAULT_SETTINGS.appName,
  isLoaded: false,
  isLoading: false,
  error: null,

  fetchSettings: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      set({
        appName: data.appName || DEFAULT_SETTINGS.appName,
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to fetch app settings:", error);
      set({
        error: error.message,
        isLoaded: true,
        isLoading: false,
      });
    }
  },

  updateSettings: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update settings");
      }

      const data = await response.json();
      set({
        appName: data.appName || DEFAULT_SETTINGS.appName,
        isLoading: false,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to update app settings:", error);
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },
}));
