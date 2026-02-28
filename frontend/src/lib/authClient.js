import { apiFetch } from "@/lib/api";

export const authClient = {
  async register(username, password) {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async login(username, password) {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async logout() {
    return apiFetch("/api/auth/logout", {
      method: "POST",
    });
  },

  async getSession() {
    try {
      return await apiFetch("/api/auth/session", {
        method: "GET",
      });
    } catch (error) {
      return { user: null };
    }
  },
};
