const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

async function authFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}/api/auth${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const authClient = {
  async register(username, password) {
    return authFetch("/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async login(username, password) {
    return authFetch("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async logout() {
    return authFetch("/logout", {
      method: "POST",
    });
  },

  async getSession() {
    try {
      return await authFetch("/session", {
        method: "GET",
      });
    } catch (error) {
      return { user: null };
    }
  },
};
