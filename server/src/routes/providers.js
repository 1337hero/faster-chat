import { Hono } from "hono";
import { z } from "zod";
import { dbUtils } from "../lib/db.js";
import { encryptApiKey, decryptApiKey, maskApiKey } from "../lib/encryption.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import {
  getAvailableProviders as getModelsDevProviders,
  getModelsForProvider,
  getProviderInfo,
} from "../lib/modelsdev.js";
import {
  getAvailableProviders as getNativeProviders,
  PROVIDERS,
  getProviderType,
} from "@faster-chat/shared";
import { HTTP_STATUS } from "../lib/httpStatus.js";

export const providersRouter = new Hono();

// All provider routes require admin role
providersRouter.use("*", ensureSession, requireRole("admin"));

// Validation schemas
const CreateProviderSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  providerType: z.enum(["official", "openai-compatible"]),
  baseUrl: z.string().url().nullable().optional(),
  apiKey: z.string().min(1),
});

const UpdateProviderSchema = z.object({
  displayName: z.string().min(1).optional(),
  baseUrl: z.string().url().nullable().optional(),
  apiKey: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET /api/admin/providers/available
 * List all available providers: LOCAL first, NATIVE second, COMMUNITY last (filtered)
 */
providersRouter.get("/available", async (c) => {
  try {
    // Get native providers from our curated list
    const nativeProviders = getNativeProviders();

    // Get community providers from models.dev
    const communityProviders = await getModelsDevProviders();

    // Get list of native provider IDs to filter out duplicates
    const nativeProviderIds = new Set(Object.keys(PROVIDERS));

    // Filter community providers to exclude ones with native SDK support
    const filteredCommunity = communityProviders.filter((p) => !nativeProviderIds.has(p.id));

    // Split native into local and official
    const localProviders = nativeProviders.filter((p) => p.type === "openai-compatible");
    const officialProviders = nativeProviders.filter((p) => p.type === "official");

    // Combine: LOCAL → NATIVE → COMMUNITY
    const allProviders = [...localProviders, ...officialProviders, ...filteredCommunity];

    return c.json({ providers: allProviders });
  } catch (error) {
    console.error("Get available providers error:", error);
    return c.json(
      { error: "Failed to fetch available providers" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /api/admin/providers
 * List all providers
 */
providersRouter.get("/", async (c) => {
  try {
    const providers = dbUtils.getAllProviders();

    // Get model counts for each provider
    const providersWithCounts = providers.map((provider) => {
      const models = dbUtils.getModelsByProvider(provider.id);
      return {
        id: provider.id,
        name: provider.name,
        display_name: provider.display_name,
        provider_type: provider.provider_type,
        base_url: provider.base_url,
        enabled: provider.enabled === 1,
        has_key: !!provider.encrypted_key,
        masked_key: provider.encrypted_key
          ? maskApiKey(decryptApiKey(provider.encrypted_key, provider.iv, provider.auth_tag))
          : null,
        model_count: models.length,
        created_at: provider.created_at,
      };
    });

    return c.json({ providers: providersWithCounts });
  } catch (error) {
    console.error("List providers error:", error);
    return c.json({ error: "Failed to list providers" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/admin/providers
 * Create a new provider and auto-fetch models
 */
providersRouter.post("/", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Creating provider with data:", {
      name: body.name,
      displayName: body.displayName,
      providerType: body.providerType,
      hasBaseUrl: !!body.baseUrl,
      hasApiKey: !!body.apiKey,
    });
    const { name, displayName, providerType, baseUrl, apiKey } = CreateProviderSchema.parse(body);

    // Check if provider already exists
    const existing = dbUtils.getProviderByName(name);
    if (existing) {
      return c.json({ error: "Provider already exists" }, HTTP_STATUS.BAD_REQUEST);
    }

    // Encrypt API key
    const { encryptedKey, iv, authTag } = encryptApiKey(apiKey);

    // Create provider
    const providerId = dbUtils.createProvider(
      name,
      displayName,
      providerType,
      baseUrl || null,
      encryptedKey,
      iv,
      authTag
    );

    // Auto-fetch models based on provider type
    let models = [];
    try {
      if (name === "ollama") {
        // Ollama: fetch from local instance
        models = await fetchOllamaModels(baseUrl);
      } else if (name === "lmstudio") {
        // LM Studio: fetch from local instance via OpenAI-compatible API
        models = await fetchLMStudioModels(baseUrl);
      } else {
        // All other providers: use models.dev data
        models = await getModelsForProvider(name);
      }

      // Save models to database
      for (const model of models) {
        const modelId = dbUtils.createModel(
          providerId,
          model.model_id,
          model.display_name,
          model.enabled
        );

        // Add metadata if available
        if (model.metadata) {
          dbUtils.setModelMetadata(modelId, model.metadata);
        }
      }
    } catch (modelError) {
      console.error("Error fetching models:", modelError);
      // Provider was created but models failed - that's okay
    }

    return c.json(
      {
        provider: {
          id: providerId,
          name,
          display_name: displayName,
          model_count: models.length,
        },
      },
      201
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
    console.error("Create provider error:", error);
    return c.json({ error: "Failed to create provider" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * PUT /api/admin/providers/:id
 * Update provider
 */
providersRouter.put("/:id", async (c) => {
  try {
    const providerId = parseInt(c.req.param("id"), 10);
    const body = await c.req.json();
    const updates = UpdateProviderSchema.parse(body);

    const provider = dbUtils.getProviderById(providerId);
    if (!provider) {
      return c.json({ error: "Provider not found" }, HTTP_STATUS.NOT_FOUND);
    }

    // If updating API key, encrypt it
    if (updates.apiKey) {
      const { encryptedKey, iv, authTag } = encryptApiKey(updates.apiKey);
      updates.encryptedKey = encryptedKey;
      updates.iv = iv;
      updates.authTag = authTag;
      delete updates.apiKey;
    }

    dbUtils.updateProvider(providerId, updates);

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
    console.error("Update provider error:", error);
    return c.json({ error: "Failed to update provider" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/admin/providers/:id/refresh-models
 * Refresh models for a provider
 */
providersRouter.post("/:id/refresh-models", async (c) => {
  try {
    const providerId = parseInt(c.req.param("id"), 10);

    const provider = dbUtils.getProviderById(providerId);
    if (!provider) {
      return c.json({ error: "Provider not found" }, HTTP_STATUS.NOT_FOUND);
    }

    // Decrypt API key
    const apiKey = provider.encrypted_key
      ? decryptApiKey(provider.encrypted_key, provider.iv, provider.auth_tag)
      : null;

    // Fetch models
    let models = [];
    if (provider.name === "ollama") {
      // Ollama: fetch from local instance
      models = await fetchOllamaModels(provider.base_url);
    } else if (provider.name === "lmstudio") {
      // LM Studio: fetch from local instance via OpenAI-compatible API
      models = await fetchLMStudioModels(provider.base_url);
    } else {
      // All other providers: use models.dev data
      models = await getModelsForProvider(provider.name);
    }

    // Delete existing models and add new ones
    dbUtils.deleteModelsForProvider(providerId);

    for (const model of models) {
      const modelId = dbUtils.createModel(
        providerId,
        model.model_id,
        model.display_name,
        model.enabled
      );

      if (model.metadata) {
        dbUtils.setModelMetadata(modelId, model.metadata);
      }
    }

    return c.json({
      success: true,
      model_count: models.length,
    });
  } catch (error) {
    console.error("Refresh models error:", error);
    return c.json(
      { error: "Failed to refresh models: " + error.message },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * DELETE /api/admin/providers/:id
 * Delete provider (cascades to models)
 */
providersRouter.delete("/:id", async (c) => {
  try {
    const providerId = parseInt(c.req.param("id"), 10);

    const provider = dbUtils.getProviderById(providerId);
    if (!provider) {
      return c.json({ error: "Provider not found" }, HTTP_STATUS.NOT_FOUND);
    }

    dbUtils.deleteProvider(providerId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete provider error:", error);
    return c.json({ error: "Failed to delete provider" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// ========================================
// MODEL FETCHING UTILITIES
// ========================================

// Note: OpenAI and Anthropic models now come from models.dev
// No need for manual hardcoding anymore!

/**
 * Fetch models from Ollama
 * This is the only provider that dynamically fetches from the instance
 */
async function fetchOllamaModels(baseUrl) {
  try {
    // Try the proper Ollama API endpoint first
    const response = await fetch(`${baseUrl.replace("/v1", "")}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
      throw new Error("Invalid response from Ollama");
    }

    return data.models.map((m) => ({
      model_id: m.name,
      display_name: m.name,
      enabled: true,
      metadata: {
        context_window: 8192, // Default, Ollama doesn't expose this easily
        max_output_tokens: 2048,
        supports_streaming: true,
        supports_vision: m.name.includes("llava") || m.name.includes("vision"),
        supports_tools: m.name.includes("qwen") || m.name.includes("llama3"),
        input_price_per_1m: 0,
        output_price_per_1m: 0,
        size_bytes: m.size,
        modified_at: m.modified_at,
      },
    }));
  } catch (error) {
    console.error("Failed to fetch Ollama models:", error.message);
    // Fallback: return empty array or throw
    throw new Error(`Could not connect to Ollama at ${baseUrl}. Make sure Ollama is running.`);
  }
}

/**
 * Fetch models from LM Studio
 * Uses OpenAI-compatible /v1/models endpoint
 */
async function fetchLMStudioModels(baseUrl) {
  try {
    // LM Studio uses OpenAI-compatible API at /v1/models
    const modelsUrl = baseUrl.endsWith("/v1") ? `${baseUrl}/models` : `${baseUrl}/v1/models`;

    const response = await fetch(modelsUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response from LM Studio");
    }

    // Filter out embedding models (not useful for chat)
    const chatModels = data.data.filter((m) => !m.id.toLowerCase().includes("embedding"));

    return chatModels.map((m) => ({
      model_id: m.id,
      display_name: m.id,
      enabled: true,
      metadata: {
        context_window: 8192, // Default, LM Studio doesn't expose this in /models
        max_output_tokens: 2048,
        supports_streaming: true,
        supports_vision:
          m.id.toLowerCase().includes("vision") || m.id.toLowerCase().includes("llava"),
        supports_tools: m.id.toLowerCase().includes("qwen") || m.id.toLowerCase().includes("llama"),
        input_price_per_1m: 0,
        output_price_per_1m: 0,
        owned_by: m.owned_by || "local",
      },
    }));
  } catch (error) {
    console.error("Failed to fetch LM Studio models:", error.message);
    throw new Error(
      `Could not connect to LM Studio at ${baseUrl}. Make sure LM Studio is running.`
    );
  }
}
