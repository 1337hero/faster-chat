import { Hono } from "hono";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { EXPORT_CONSTANTS } from "@faster-chat/shared";
import { exportAllChats, allExportFilename } from "../lib/export.js";

export const exportRouter = new Hono();

exportRouter.use("/*", ensureSession);

// GET /api/export?format=json - Export all chats of the current user
exportRouter.get("/", async (c) => {
  const user = c.get("user");
  const format = c.req.query("format") || EXPORT_CONSTANTS.FORMATS.JSON;

  if (format !== EXPORT_CONSTANTS.FORMATS.JSON) {
    return c.json({ error: "Unsupported format" }, HTTP_STATUS.BAD_REQUEST);
  }

  c.header("Content-Disposition", `attachment; filename="${allExportFilename()}"`);
  return c.json(exportAllChats(user.id));
});
