const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

class AdminClient {
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

  async getUsers() {
    return this._fetch("/api/admin/users");
  }

  async createUser(username, password, role = "member") {
    return this._fetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });
  }

  async updateUserRole(userId, role) {
    return this._fetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  }

  async resetUserPassword(userId, password) {
    return this._fetch(`/api/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
  }

  async deleteUser(userId) {
    return this._fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });
  }
}

export const adminClient = new AdminClient();
