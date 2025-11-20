/**
 * Providers API client
 * Handles provider and model management
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

class ProvidersClient {
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
      const error = new Error(data.error || "Request failed");
      error.response = data; // Include full response for details
      error.status = response.status;
      console.error("API Error:", {
        endpoint,
        status: response.status,
        error: data.error,
        details: data.details,
      });
      throw error;
    }

    return data;
  }

  // ========================================
  // PROVIDERS
  // ========================================

  /**
   * List all providers
   */
  async getProviders() {
    return this._fetch("/api/admin/providers");
  }

  /**
   * Create a new provider
   */
  async createProvider(name, displayName, providerType, baseUrl, apiKey) {
    return this._fetch("/api/admin/providers", {
      method: "POST",
      body: JSON.stringify({ name, displayName, providerType, baseUrl, apiKey }),
    });
  }

  /**
   * Update provider
   */
  async updateProvider(providerId, updates) {
    return this._fetch(`/api/admin/providers/${providerId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Refresh models for a provider
   */
  async refreshModels(providerId) {
    return this._fetch(`/api/admin/providers/${providerId}/refresh-models`, {
      method: "POST",
    });
  }

  /**
   * Delete provider
   */
  async deleteProvider(providerId) {
    return this._fetch(`/api/admin/providers/${providerId}`, {
      method: "DELETE",
    });
  }

  // ========================================
  // MODELS
  // ========================================

  /**
   * List all models (admin)
   */
  async getAllModels() {
    return this._fetch("/api/admin/models");
  }

  /**
   * List enabled models (for users)
   */
  async getEnabledModels() {
    return this._fetch("/api/models");
  }

  /**
   * Update model
   */
  async updateModel(modelId, updates) {
    return this._fetch(`/api/admin/models/${modelId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Set model as default
   */
  async setDefaultModel(modelId) {
    return this._fetch(`/api/admin/models/${modelId}/default`, {
      method: "PUT",
    });
  }

  /**
   * Delete model
   */
  async deleteModel(modelId) {
    return this._fetch(`/api/admin/models/${modelId}`, {
      method: "DELETE",
    });
  }
}

export const providersClient = new ProvidersClient();
