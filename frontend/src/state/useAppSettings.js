import { create } from "zustand";
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from "@faster-chat/shared";

export const useAppSettings = create((set, get) => ({
  appName: DEFAULT_APP_SETTINGS.appName,
  logoIcon: DEFAULT_APP_SETTINGS.logoIcon,
  isLoaded: false,
  isFetching: false,
  isSaving: false,
  error: null,

  fetchSettings: async () => {
    if (get().isFetching) return;

    set({ isFetching: true, error: null });
    try {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");

      const data = await response.json();
      set({
        ...normalizeAppSettings(data),
        isLoaded: true,
        isFetching: false,
      });
    } catch (error) {
      console.error("Failed to fetch app settings:", error);
      set({
        error: error.message,
        isLoaded: true,
        isFetching: false,
      });
    }
  },

  updateSettings: async (updates) => {
    set({ isSaving: true, error: null });
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
        ...normalizeAppSettings(data),
        isLoaded: true,
        isSaving: false,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to update app settings:", error);
      set({ error: error.message, isSaving: false });
      return { success: false, error: error.message };
    }
  },
}));
