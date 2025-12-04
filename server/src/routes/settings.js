import { Hono } from "hono";
import { z } from "zod";
import { dbUtils } from "../lib/db.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { LOGO_ICON_NAMES, normalizeAppSettings, UI_CONSTANTS } from "@faster-chat/shared";

export const settingsRouter = new Hono();

// Validation schema for updating settings
const UpdateSettingsSchema = z.object({
  appName: z.string().min(1).max(UI_CONSTANTS.APP_NAME_MAX_LENGTH).optional(),
  logoIcon: z.enum(LOGO_ICON_NAMES).optional(),
});

/**
 * GET /api/settings
 * Get all public settings (no auth required)
 */
settingsRouter.get("/", async (c) => {
  try {
    const settings = dbUtils.getAllSettings();
    return c.json(normalizeAppSettings(settings));
  } catch (error) {
    console.error("Get settings error:", error);
    return c.json({ error: "Failed to get settings" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * PUT /api/settings
 * Update settings (admin only)
 */
settingsRouter.put("/", ensureSession, requireRole("admin"), async (c) => {
  try {
    const body = await c.req.json();
    const updates = UpdateSettingsSchema.parse(body);

    if (Object.keys(updates).length === 0) {
      return c.json({ error: "No valid settings to update" }, HTTP_STATUS.BAD_REQUEST);
    }

    dbUtils.setSettings(updates);

    const settings = dbUtils.getAllSettings();
    return c.json(normalizeAppSettings(settings));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
    console.error("Update settings error:", error);
    return c.json({ error: "Failed to update settings" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});
