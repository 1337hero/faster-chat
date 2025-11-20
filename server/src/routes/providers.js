import { Hono } from "hono";
import { z } from "zod";
import { dbUtils } from "../lib/db.js";
import { encryptApiKey, decryptApiKey, maskApiKey } from "../lib/encryption.js";
import { ensureSession, requireRole } from "../middleware/auth.js";

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
        masked_key: provider.encrypted_key ? maskApiKey(decryptApiKey(provider.encrypted_key, provider.iv, provider.auth_tag)) : null,
        model_count: models.length,
        created_at: provider.created_at,
      };
    });

    return c.json({ providers: providersWithCounts });
  } catch (error) {
    console.error("List providers error:", error);
    return c.json({ error: "Failed to list providers" }, 500);
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
      return c.json({ error: "Provider already exists" }, 400);
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
      if (name === "openai") {
        models = await fetchOpenAIModels(apiKey);
      } else if (name === "anthropic") {
        models = getAnthropicModels();
      } else if (name === "ollama") {
        models = await fetchOllamaModels(baseUrl);
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

    return c.json({
      provider: {
        id: providerId,
        name,
        display_name: displayName,
        model_count: models.length,
      },
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Create provider error:", error);
    return c.json({ error: "Failed to create provider" }, 500);
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
      return c.json({ error: "Provider not found" }, 404);
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
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Update provider error:", error);
    return c.json({ error: "Failed to update provider" }, 500);
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
      return c.json({ error: "Provider not found" }, 404);
    }

    // Decrypt API key
    const apiKey = provider.encrypted_key
      ? decryptApiKey(provider.encrypted_key, provider.iv, provider.auth_tag)
      : null;

    // Fetch models
    let models = [];
    if (provider.name === "openai") {
      models = await fetchOpenAIModels(apiKey);
    } else if (provider.name === "anthropic") {
      models = getAnthropicModels();
    } else if (provider.name === "ollama") {
      models = await fetchOllamaModels(provider.base_url);
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
    return c.json({ error: "Failed to refresh models: " + error.message }, 500);
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
      return c.json({ error: "Provider not found" }, 404);
    }

    dbUtils.deleteProvider(providerId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete provider error:", error);
    return c.json({ error: "Failed to delete provider" }, 500);
  }
});

// ========================================
// MODEL FETCHING UTILITIES
// ========================================

/**
 * Fetch models from OpenAI API
 */
async function fetchOpenAIModels(apiKey) {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch OpenAI models");
  }

  const data = await response.json();

  // Filter for GPT models only
  return data.data
    .filter((m) => m.id.includes("gpt"))
    .map((m) => ({
      model_id: m.id,
      display_name: formatModelName(m.id),
      enabled: true,
      metadata: getOpenAIModelMetadata(m.id),
    }));
}

/**
 * Get Anthropic models (manually maintained)
 * Using model IDs from original ModelRegistry
 */
function getAnthropicModels() {
  return [
    {
      model_id: "claude-sonnet-4-20250514",
      display_name: "Claude Sonnet 4.5 🏆 (best)",
      enabled: true,
      metadata: {
        contextWindow: 200000,
        maxOutputTokens: 8192,
        inputPrice: 3,
        outputPrice: 15,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
      },
    },
    {
      model_id: "claude-3-5-haiku-20241022",
      display_name: "Claude Haiku 4.5 (⚡fast)",
      enabled: true,
      metadata: {
        contextWindow: 200000,
        maxOutputTokens: 8192,
        inputPrice: 0.8,
        outputPrice: 4,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
      },
    },
    {
      model_id: "claude-opus-4-20250514",
      display_name: "Claude Opus 4.1 (thinking) 💪💪",
      enabled: true,
      metadata: {
        contextWindow: 200000,
        maxOutputTokens: 8192,
        inputPrice: 15,
        outputPrice: 75,
        supportsStreaming: true,
        supportsVision: true,
        supportsTools: true,
      },
    },
  ];
}

/**
 * Fetch models from Ollama
 */
async function fetchOllamaModels(baseUrl) {
  const response = await fetch(`${baseUrl}/api/tags`);

  if (!response.ok) {
    throw new Error("Failed to fetch Ollama models");
  }

  const data = await response.json();

  return data.models.map((m) => ({
    model_id: m.name,
    display_name: m.name,
    enabled: true,
    metadata: {
      contextWindow: 8192, // Default, could parse from model details
      supportsStreaming: true,
      supportsVision: false,
      supportsTools: false,
      inputPrice: 0,
      outputPrice: 0,
    },
  }));
}

/**
 * Format model name for display
 */
function formatModelName(modelId) {
  // Convert "gpt-4-turbo-2024-04-09" to "GPT-4 Turbo"
  return modelId
    .replace(/-\d{4}-\d{2}-\d{2}$/, "") // Remove date suffix
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Get metadata for OpenAI models
 */
function getOpenAIModelMetadata(modelId) {
  // Basic metadata for common models
  const metadata = {
    "gpt-4-turbo": {
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPrice: 10,
      outputPrice: 30,
      supportsVision: true,
    },
    "gpt-4o": {
      contextWindow: 128000,
      maxOutputTokens: 16384,
      inputPrice: 2.5,
      outputPrice: 10,
      supportsVision: true,
    },
    "gpt-4o-mini": {
      contextWindow: 128000,
      maxOutputTokens: 16384,
      inputPrice: 0.15,
      outputPrice: 0.6,
      supportsVision: true,
    },
    "gpt-3.5-turbo": {
      contextWindow: 16385,
      maxOutputTokens: 4096,
      inputPrice: 0.5,
      outputPrice: 1.5,
      supportsVision: false,
    },
  };

  // Find best match
  for (const [key, value] of Object.entries(metadata)) {
    if (modelId.includes(key)) {
      return {
        ...value,
        supportsStreaming: true,
        supportsTools: true,
      };
    }
  }

  // Default metadata
  return {
    contextWindow: 8192,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: false,
    supportsTools: true,
    inputPrice: 0,
    outputPrice: 0,
  };
}
