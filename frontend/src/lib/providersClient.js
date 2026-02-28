import { apiFetch } from "@/lib/api";

export const providersClient = {
  async getProviders() {
    return apiFetch("/api/admin/providers");
  },

  async getAvailableProviders() {
    return apiFetch("/api/admin/providers/available");
  },

  async createProvider(name, displayName, providerType, baseUrl, apiKey) {
    return apiFetch("/api/admin/providers", {
      method: "POST",
      body: JSON.stringify({ name, displayName, providerType, baseUrl, apiKey }),
    });
  },

  async updateProvider(providerId, updates) {
    return apiFetch(`/api/admin/providers/${providerId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async refreshModels(providerId) {
    return apiFetch(`/api/admin/providers/${providerId}/refresh-models`, {
      method: "POST",
    });
  },

  async deleteProvider(providerId) {
    return apiFetch(`/api/admin/providers/${providerId}`, {
      method: "DELETE",
    });
  },

  async setAllModelsEnabled(providerId, enabled) {
    return apiFetch(`/api/admin/providers/${providerId}/models/enable`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  },

  async getAllModels() {
    return apiFetch("/api/admin/models");
  },

  async getEnabledModels() {
    return apiFetch("/api/models");
  },

  async getEnabledModelsByType(modelType) {
    const params = modelType ? `?type=${modelType}` : "";
    return apiFetch(`/api/models${params}`);
  },

  async updateModel(modelId, updates) {
    return apiFetch(`/api/admin/models/${modelId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  async setDefaultModel(modelId) {
    return apiFetch(`/api/admin/models/${modelId}/default`, {
      method: "PUT",
    });
  },

  async deleteModel(modelId) {
    return apiFetch(`/api/admin/models/${modelId}`, {
      method: "DELETE",
    });
  },
};
