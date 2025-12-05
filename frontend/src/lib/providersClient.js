const API_BASE = import.meta.env.DEV ? "http://localhost:3001" : "";

class ProvidersClient {
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
      error.response = data;
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

  async getProviders() {
    return this._fetch("/api/admin/providers");
  }

  async getAvailableProviders() {
    return this._fetch("/api/admin/providers/available");
  }

  async createProvider(name, displayName, providerType, baseUrl, apiKey) {
    return this._fetch("/api/admin/providers", {
      method: "POST",
      body: JSON.stringify({ name, displayName, providerType, baseUrl, apiKey }),
    });
  }

  async updateProvider(providerId, updates) {
    return this._fetch(`/api/admin/providers/${providerId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async refreshModels(providerId) {
    return this._fetch(`/api/admin/providers/${providerId}/refresh-models`, {
      method: "POST",
    });
  }

  async deleteProvider(providerId) {
    return this._fetch(`/api/admin/providers/${providerId}`, {
      method: "DELETE",
    });
  }

  async getAllModels() {
    return this._fetch("/api/admin/models");
  }

  async getEnabledModels() {
    return this._fetch("/api/models");
  }

  async updateModel(modelId, updates) {
    return this._fetch(`/api/admin/models/${modelId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async setDefaultModel(modelId) {
    return this._fetch(`/api/admin/models/${modelId}/default`, {
      method: "PUT",
    });
  }

  async deleteModel(modelId) {
    return this._fetch(`/api/admin/models/${modelId}`, {
      method: "DELETE",
    });
  }
}

export const providersClient = new ProvidersClient();
