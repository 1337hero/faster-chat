import { apiFetch } from "@/lib/api";

export const adminClient = {
  async getUsers() {
    return apiFetch("/api/admin/users");
  },

  async createUser(username, password, role = "member") {
    return apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
  },

  async updateUserRole(userId, role) {
    return apiFetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },

  async resetUserPassword(userId, password) {
    return apiFetch(`/api/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
  },

  async deleteUser(userId) {
    return apiFetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
  },
};
