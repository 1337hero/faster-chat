import { Hono } from "hono";
import { z } from "zod";
import { streamSSE } from "hono/streaming";
import { dbUtils } from "../lib/db.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";

export const modelsRouter = new Hono();

// Admin-only routes
const adminRouter = new Hono();
adminRouter.use("*", ensureSession, requireRole("admin"));

// Public route (for users to see available models)
const publicRouter = new Hono();
publicRouter.use("*", ensureSession); // Just need to be logged in

// Validation schemas
const UpdateModelSchema = z.object({
  displayName: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/models
 * List enabled models (public - for model selector)
 */
publicRouter.get("/", async (c) => {
  try {
    const type = c.req.query("type");
    const models = type ? dbUtils.getEnabledModelsByType(type) : dbUtils.getEnabledModels();

    const modelsWithMetadata = models.map((model) => {
      const metadata = dbUtils.getModelMetadata(model.id);
      return {
        id: model.id,
        model_id: model.model_id,
        display_name: model.display_name,
        model_type: model.model_type || "text",
        provider: model.provider_name,
        provider_display_name: model.provider_display_name,
        is_default: model.is_default === 1,
        metadata: metadata || {},
      };
    });

    return c.json({ models: modelsWithMetadata });
  } catch (error) {
    console.error("List models error:", error);
    return c.json({ error: "Failed to list models" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/models
 * List all models (admin only)
 */
adminRouter.get("/", async (c) => {
  try {
    const type = c.req.query("type");
    const models = type ? dbUtils.getModelsByType(type) : dbUtils.getAllModels();

    const modelsWithMetadata = models.map((model) => {
      const metadata = dbUtils.getModelMetadata(model.id);
      return {
        id: model.id,
        provider_id: model.provider_id,
        provider: model.provider_name,
        provider_display_name: model.provider_display_name,
        model_id: model.model_id,
        display_name: model.display_name,
        model_type: model.model_type || "text",
        enabled: model.enabled === 1,
        is_default: model.is_default === 1,
        metadata: metadata || {},
        created_at: model.created_at,
      };
    });

    return c.json({ models: modelsWithMetadata });
  } catch (error) {
    console.error("List all models error:", error);
    return c.json({ error: "Failed to list models" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/admin/models/:id
 * Get model details
 */
adminRouter.get("/:id", async (c) => {
  try {
    const modelId = parseInt(c.req.param("id"), 10);

    const model = dbUtils.getModelWithMetadata(modelId);
    if (!model) {
      return c.json({ error: "Model not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({
      model: {
        id: model.id,
        provider_id: model.provider_id,
        provider: model.provider_name,
        provider_display_name: model.provider_display_name,
        model_id: model.model_id,
        display_name: model.display_name,
        enabled: model.enabled === 1,
        is_default: model.is_default === 1,
        metadata: {
          context_window: model.context_window,
          max_output_tokens: model.max_output_tokens,
          input_price_per_1m: model.input_price_per_1m,
          output_price_per_1m: model.output_price_per_1m,
          supports_streaming: model.supports_streaming === 1,
          supports_vision: model.supports_vision === 1,
          supports_tools: model.supports_tools === 1,
        },
      },
    });
  } catch (error) {
    console.error("Get model error:", error);
    return c.json({ error: "Failed to get model" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * PUT /api/admin/models/:id
 * Update model
 */
adminRouter.put("/:id", async (c) => {
  try {
    const modelId = parseInt(c.req.param("id"), 10);
    const body = await c.req.json();
    const updates = UpdateModelSchema.parse(body);

    const model = dbUtils.getModelById(modelId);
    if (!model) {
      return c.json({ error: "Model not found" }, HTTP_STATUS.NOT_FOUND);
    }

    dbUtils.updateModel(modelId, updates);

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
    console.error("Update model error:", error);
    return c.json({ error: "Failed to update model" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * PUT /api/admin/models/:id/default
 * Set model as default
 */
adminRouter.put("/:id/default", async (c) => {
  try {
    const modelId = parseInt(c.req.param("id"), 10);

    const model = dbUtils.getModelById(modelId);
    if (!model) {
      return c.json({ error: "Model not found" }, HTTP_STATUS.NOT_FOUND);
    }

    dbUtils.updateModel(modelId, { isDefault: true });

    return c.json({ success: true });
  } catch (error) {
    console.error("Set default model error:", error);
    return c.json({ error: "Failed to set default model" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * DELETE /api/admin/models/:id
 * Delete model
 */
adminRouter.delete("/:id", async (c) => {
  try {
    const modelId = parseInt(c.req.param("id"), 10);

    const model = dbUtils.getModelById(modelId);
    if (!model) {
      return c.json({ error: "Model not found" }, HTTP_STATUS.NOT_FOUND);
    }

    dbUtils.deleteModel(modelId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete model error:", error);
    return c.json({ error: "Failed to delete model" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/admin/models/ollama/pull
 * Pull an Ollama model from the Ollama registry
 * Streams progress via Server-Sent Events
 */
adminRouter.post("/ollama/pull", async (c) => {
  try {
    const body = await c.req.json();
    const { providerId, modelName } = z
      .object({
        providerId: z.number().int().positive(),
        modelName: z.string().min(1),
      })
      .parse(body);

    const provider = dbUtils.getProviderById(providerId);
    if (!provider) {
      return c.json({ error: "Provider not found" }, HTTP_STATUS.NOT_FOUND);
    }

    if (provider.name !== "ollama") {
      return c.json({ error: "Provider is not an Ollama instance" }, HTTP_STATUS.BAD_REQUEST);
    }

    if (!provider.enabled) {
      return c.json({ error: "Provider is disabled" }, HTTP_STATUS.BAD_REQUEST);
    }

    const baseUrl = provider.base_url;
    if (!baseUrl) {
      return c.json({ error: "Provider base URL not configured" }, HTTP_STATUS.BAD_REQUEST);
    }

    // Remove /v1 suffix if present (Ollama API doesn't use /v1 for pull endpoint)
    const ollamaBaseUrl = baseUrl.replace(/\/v1\/?$/, "");

    return streamSSE(c, async (stream) => {
      try {
        const pullUrl = `${ollamaBaseUrl}/api/pull`;
        console.log(`[Ollama Pull] Starting pull for model: ${modelName}`);
        console.log(`[Ollama Pull] URL: ${pullUrl}`);

        const response = await fetch(pullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modelName, stream: true }),
        });

        console.log(`[Ollama Pull] Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Ollama Pull] Error response: ${errorText}`);
          await stream.writeSSE({
            data: JSON.stringify({
              status: "error",
              error: `Ollama API error: ${response.statusText} - ${errorText}`,
            }),
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let chunkCount = 0;

        console.log(`[Ollama Pull] Starting to read stream...`);

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(`[Ollama Pull] Stream done after ${chunkCount} chunks`);
            break;
          }

          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          if (chunkCount <= 3) {
            console.log(`[Ollama Pull] Chunk ${chunkCount}: ${chunk.substring(0, 200)}`);
          }

          const lines = buffer.split("\n");

          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);

              // Check if Ollama returned an error
              if (data.error) {
                console.error(`[Ollama Pull] Ollama error: ${data.error}`);
                await stream.writeSSE({
                  data: JSON.stringify({
                    status: "error",
                    error: data.error,
                  }),
                });
                return; // Stop processing - we hit an error
              }

              await stream.writeSSE({ data: JSON.stringify(data) });

              if (data.status === "success") {
                console.log(`[Ollama Pull] Model ${modelName} pulled successfully!`);
              }
            } catch (parseError) {
              console.error(
                "[Ollama Pull] Failed to parse line:",
                line.substring(0, 100),
                parseError.message
              );
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          console.log(`[Ollama Pull] Processing final buffer: ${buffer.substring(0, 100)}`);
          try {
            const data = JSON.parse(buffer);

            // Check if Ollama returned an error
            if (data.error) {
              console.error(`[Ollama Pull] Ollama error in final buffer: ${data.error}`);
              await stream.writeSSE({
                data: JSON.stringify({
                  status: "error",
                  error: data.error,
                }),
              });
              return;
            }

            await stream.writeSSE({ data: JSON.stringify(data) });
          } catch (parseError) {
            console.error(
              "[Ollama Pull] Failed to parse final buffer:",
              buffer.substring(0, 100),
              parseError.message
            );
          }
        }

        console.log(`[Ollama Pull] Sending completed event`);
        await stream.writeSSE({ data: JSON.stringify({ status: "completed" }) });
      } catch (error) {
        console.error("Ollama pull error:", error);
        await stream.writeSSE({
          data: JSON.stringify({
            status: "error",
            error: error.message || "Failed to pull model",
          }),
        });
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
    console.error("Pull model error:", error);
    return c.json({ error: "Failed to pull model" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Mount routers
modelsRouter.route("/admin/models", adminRouter);
modelsRouter.route("/models", publicRouter);
