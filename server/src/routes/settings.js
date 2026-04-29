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

settingsRouter.get("/", async (c) => {
  const settings = dbUtils.getAllSettings();
  return c.json(normalizeAppSettings(settings));
});

settingsRouter.put("/", ensureSession, requireRole("admin"), async (c) => {
  const body = await c.req.json();
  const updates = UpdateSettingsSchema.parse(body);

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "No valid settings to update" }, HTTP_STATUS.BAD_REQUEST);
  }

  dbUtils.setSettings(updates);

  const settings = dbUtils.getAllSettings();
  return c.json(normalizeAppSettings(settings));
});

// ========================================
// WEB SEARCH (Brave)
// ========================================

function maskApiKey(key) {
  if (!key || key.length < 5) {
    return null;
  }
  return "••••" + key.slice(-4);
}

settingsRouter.get("/web-search", ensureSession, requireRole("admin"), async (c) => {
  const apiKey = dbUtils.getWebSearchApiKey();
  return c.json({ apiKey: maskApiKey(apiKey) });
});

settingsRouter.put("/web-search", ensureSession, requireRole("admin"), async (c) => {
  const { apiKey } = await c.req.json();
  dbUtils.setWebSearchApiKey(apiKey);
  return c.json({ success: true });
});

// ========================================
// MEMORY
// ========================================

settingsRouter.get("/memory", ensureSession, requireRole("admin"), async (c) => {
  const globalEnabled = dbUtils.getMemoryGlobalEnabled() === "true";
  const extractionModel = dbUtils.getMemoryExtractionModel();
  return c.json({ globalEnabled, extractionModel });
});

settingsRouter.put("/memory", ensureSession, requireRole("admin"), async (c) => {
  const body = await c.req.json();
  if (typeof body.globalEnabled === "boolean") {
    dbUtils.setMemoryGlobalEnabled(body.globalEnabled);
  }
  if (body.extractionModel !== undefined) {
    dbUtils.setMemoryExtractionModel(body.extractionModel || null);
  }
  const globalEnabled = dbUtils.getMemoryGlobalEnabled() === "true";
  const extractionModel = dbUtils.getMemoryExtractionModel();
  return c.json({ globalEnabled, extractionModel });
});
