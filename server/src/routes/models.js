import { Hono } from "hono";
import { z } from "zod";
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
    const models = type
      ? dbUtils.getEnabledModelsByType(type)
      : dbUtils.getEnabledModels();

    const modelsWithMetadata = models.map((model) => {
      const metadata = dbUtils.getModelMetadata(model.id);
      return {
        id: model.id,
        model_id: model.model_id,
        display_name: model.display_name,
        model_type: model.model_type || 'text',
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
    const models = type
      ? dbUtils.getModelsByType(type)
      : dbUtils.getAllModels();

    const modelsWithMetadata = models.map((model) => {
      const metadata = dbUtils.getModelMetadata(model.id);
      return {
        id: model.id,
        provider_id: model.provider_id,
        provider: model.provider_name,
        provider_display_name: model.provider_display_name,
        model_id: model.model_id,
        display_name: model.display_name,
        model_type: model.model_type || 'text',
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

// Mount routers
modelsRouter.route("/admin/models", adminRouter);
modelsRouter.route("/models", publicRouter);
