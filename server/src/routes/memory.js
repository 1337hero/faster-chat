import { Hono } from "hono";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";

export const memoryRouter = new Hono();

memoryRouter.use("/*", ensureSession);

memoryRouter.get("/status", async (c) => {
  try {
    const user = c.get("user");
    const globalEnabled = dbUtils.getMemoryGlobalEnabled() === "true";
    const enabled = dbUtils.getUserMemoryEnabled(user.id);
    const memoriesCount = dbUtils.getMemoriesCount(user.id);
    return c.json({ enabled, globalEnabled, memoriesCount });
  } catch (error) {
    console.error("Get memory status error:", error);
    return c.json({ error: "Failed to get memory status" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

memoryRouter.get("/", async (c) => {
  try {
    const user = c.get("user");
    const memories = dbUtils.getMemoriesForUser(user.id);
    return c.json({
      memories: memories.map((m) => ({
        id: m.id,
        fact: m.fact,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      })),
    });
  } catch (error) {
    console.error("Get memories error:", error);
    return c.json({ error: "Failed to get memories" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

memoryRouter.delete("/", async (c) => {
  try {
    const user = c.get("user");
    dbUtils.clearMemoriesForUser(user.id);
    return c.json({ cleared: true });
  } catch (error) {
    console.error("Clear memories error:", error);
    return c.json({ error: "Failed to clear memories" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

memoryRouter.delete("/:memoryId", async (c) => {
  try {
    const user = c.get("user");
    const memoryId = parseInt(c.req.param("memoryId"), 10);
    if (isNaN(memoryId)) {
      return c.json({ error: "Invalid memory ID" }, HTTP_STATUS.BAD_REQUEST);
    }
    const deleted = dbUtils.deleteMemory(memoryId, user.id);
    if (!deleted) {
      return c.json({ error: "Memory not found" }, HTTP_STATUS.NOT_FOUND);
    }
    return c.json({ deleted: true });
  } catch (error) {
    console.error("Delete memory error:", error);
    return c.json({ error: "Failed to delete memory" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

memoryRouter.put("/enabled", async (c) => {
  try {
    const user = c.get("user");
    const { enabled } = await c.req.json();
    if (typeof enabled !== "boolean") {
      return c.json({ error: "enabled must be a boolean" }, HTTP_STATUS.BAD_REQUEST);
    }
    dbUtils.setUserMemoryEnabled(user.id, enabled);
    return c.json({ enabled });
  } catch (error) {
    console.error("Toggle memory error:", error);
    return c.json({ error: "Failed to toggle memory" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});
