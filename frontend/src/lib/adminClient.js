/**
 * Admin API client
 * Handles admin-only operations (user management, etc.)
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

class AdminClient {
  /**
   * Fetch wrapper with error handling
   */
  async _fetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  }

  /**
   * List all users
   */
  async getUsers() {
    return this._fetch("/api/admin/users");
  }

  /**
   * Create a new user
   */
  async createUser(username, password, role = "member") {
    return this._fetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
  }

  /**
   * Update user role
   */
  async updateUserRole(userId, role) {
    return this._fetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId, password) {
    return this._fetch(`/api/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Delete a user
   */
  async deleteUser(userId) {
    return this._fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
  }
}

export const adminClient = new AdminClient();
