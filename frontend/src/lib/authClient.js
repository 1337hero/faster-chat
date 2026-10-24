import { apiFetch } from "@/lib/api";

export const authClient = {
  async register(username, password, inviteToken) {
    return apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, inviteToken }),
    });
  },

  async getSetup() {
    return apiFetch("/api/auth/setup");
  },

  async validateInvite(token) {
    try {
      const data = await apiFetch(`/api/auth/invites/${encodeURIComponent(token)}`);
      return Boolean(data.valid);
    } catch {
      return false;
    }
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
    } catch {
      return { user: null };
    }
  },
};
