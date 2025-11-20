/**
 * Auth API client
 * Handles authentication requests to the backend
 */

const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

/**
 * Make an auth API request
 * @param {string} endpoint
 * @param {object} options
 */
async function authFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}/api/auth${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Important: send cookies
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export const authClient = {
  /**
   * Register a new user
   * @param {string} username
   * @param {string} password
   */
  async register(username, password) {
    return authFetch("/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * Login with username and password
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    return authFetch("/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  /**
   * Logout
   */
  async logout() {
    return authFetch("/logout", {
      method: "POST",
    });
  },

  /**
   * Get current session
   */
  async getSession() {
    try {
      return await authFetch("/session", {
        method: "GET",
      });
    } catch (error) {
      // Session check returns 401 if no session, don't throw
      return { user: null };
    }
  },
};
