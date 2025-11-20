import { create } from "zustand";
import { authClient } from "../lib/authClient.js";

/**
 * Auth state management
 * Stores current user info and provides auth actions
 */
export const useAuthState = create((set, get) => ({
  // State
  user: null, // { id, username, role }
  isLoading: true,
  error: null,

  // Actions
  setUser: (user) => set({ user, error: null }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  /**
   * Check current session on app load
   */
  checkSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await authClient.getSession();
      set({ user: data.user, isLoading: false });
      return data.user;
    } catch (error) {
      set({ user: null, isLoading: false, error: error.message });
      return null;
    }
  },

  /**
   * Login with username and password
   */
  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authClient.login(username, password);
      set({ user: data.user, isLoading: false });
      return data.user;
    } catch (error) {
      set({ user: null, isLoading: false, error: error.message });
      throw error;
    }
  },

  /**
   * Register a new user
   */
  register: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authClient.register(username, password);
      set({ user: data.user, isLoading: false });
      return data.user;
    } catch (error) {
      set({ user: null, isLoading: false, error: error.message });
      throw error;
    }
  },

  /**
   * Logout
   */
  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authClient.logout();
      set({ user: null, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },
}));
