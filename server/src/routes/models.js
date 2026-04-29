import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { ENDPOINT_RATE_LIMITS } from "../lib/constants.js";
import { dbUtils } from "../lib/db.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { validateProviderBaseUrl } from "../lib/ssrf.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const debug = process.env.NODE_ENV !== "production";

async function processOllamaPullLine(line, stream) {
  if (!line.trim()) {
    return true;
  }

  try {
    const data = JSON.parse(line);
    if (data.error) {
      console.error(`[Ollama Pull] Ollama error: ${data.error}`);
      await stream.writeSSE({
        data: JSON.stringify({
          status: "error",
          error: data.error,
        }),
      });
      return false;
    }

    await stream.writeSSE({ data: JSON.stringify(data) });
    return true;
  } catch (parseError) {
    console.error(
      "[Ollama Pull] Failed to parse line:",
      line.substring(0, 100),
      parseError.message
    );
    return true;
  }
}

export const modelsRouter = new Hono();

// Admin-only routes
const adminModelsRouter = new Hono();
adminModelsRouter.use("*", ensureSession, requireRole("admin"));

// Public route (for users to see available models)
const publicRouter = new Hono();
publicRouter.use("*", ensureSession); // Just need to be logged in

// Validation schemas
const UpdateModelSchema = z.object({
  displayName: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

publicRouter.get("/", async (c) => {
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
});

adminModelsRouter.get("/", async (c) => {
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
});

adminModelsRouter.get("/:id", async (c) => {
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
});

adminModelsRouter.put("/:id", async (c) => {
  const modelId = parseInt(c.req.param("id"), 10);
  const body = await c.req.json();
  const updates = UpdateModelSchema.parse(body);

  const model = dbUtils.getModelById(modelId);
  if (!model) {
    return c.json({ error: "Model not found" }, HTTP_STATUS.NOT_FOUND);
  }

  dbUtils.updateModel(modelId, updates);

  return c.json({ success: true });
});

adminModelsRouter.put("/:id/default", async (c) => {
  const modelId = parseInt(c.req.param("id"), 10);

  const model = dbUtils.getModelById(modelId);
  if (!model) {
    return c.json({ error: "Model not found" }, HTTP_STATUS.NOT_FOUND);
  }

  dbUtils.updateModel(modelId, { isDefault: true });

  return c.json({ success: true });
});

adminModelsRouter.delete("/:id", async (c) => {
  const modelId = parseInt(c.req.param("id"), 10);

  const model = dbUtils.getModelById(modelId);
  if (!model) {
    return c.json({ error: "Model not found" }, HTTP_STATUS.NOT_FOUND);
  }

  dbUtils.deleteModel(modelId);

  return c.json({ success: true });
});

adminModelsRouter.post(
  "/ollama/pull",
  createRateLimiter(ENDPOINT_RATE_LIMITS.OLLAMA_PULL),
  async (c) => {
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
    if (!validateProviderBaseUrl(baseUrl)) {
      return c.json({ error: "Invalid provider base URL" }, HTTP_STATUS.BAD_REQUEST);
    }

    const ollamaBaseUrl = baseUrl.replace(/\/v1\/?$/, "");

    return streamSSE(c, async (stream) => {
      try {
        const pullUrl = `${ollamaBaseUrl}/api/pull`;
        debugLog(`Starting pull for model: ${modelName}`);
        debugLog(`URL: ${pullUrl}`);

        const response = await fetch(pullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: modelName, stream: true }),
        });

        debugLog(`Response status: ${response.status} ${response.statusText}`);

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

        debugLog("Starting to read stream...");

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            debugLog(`Stream done after ${chunkCount} chunks`);
            break;
          }

          chunkCount++;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          if (chunkCount <= 3) {
            debugLog(`Chunk ${chunkCount}: ${chunk.substring(0, 200)}`);
          }

          const lines = buffer.split("\n");

          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!(await processOllamaPullLine(line, stream))) {
              return;
            }
          }
        }

        if (buffer.trim()) {
          debugLog(`Processing final buffer: ${buffer.substring(0, 100)}`);
          if (!(await processOllamaPullLine(buffer, stream))) {
            return;
          }
        }

        debugLog("Sending completed event");
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
  }
);

// Mount routers
modelsRouter.route("/admin/models", adminModelsRouter);
modelsRouter.route("/models", publicRouter);
