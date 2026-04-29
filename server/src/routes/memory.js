import { Hono } from "hono";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";

export const memoryRouter = new Hono();

memoryRouter.use("/*", ensureSession);

memoryRouter.get("/status", async (c) => {
  const user = c.get("user");
  const globalEnabled = dbUtils.getMemoryGlobalEnabled() === "true";
  const enabled = dbUtils.getUserMemoryEnabled(user.id);
  const memoriesCount = dbUtils.getMemoriesCount(user.id);
  return c.json({ enabled, globalEnabled, memoriesCount });
});

memoryRouter.get("/", async (c) => {
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
});

memoryRouter.delete("/", async (c) => {
  const user = c.get("user");
  dbUtils.clearMemoriesForUser(user.id);
  return c.json({ cleared: true });
});

memoryRouter.delete("/:memoryId", async (c) => {
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
});

memoryRouter.put("/enabled", async (c) => {
  const user = c.get("user");
  const { enabled } = await c.req.json();
  if (typeof enabled !== "boolean") {
    return c.json({ error: "enabled must be a boolean" }, HTTP_STATUS.BAD_REQUEST);
  }
  dbUtils.setUserMemoryEnabled(user.id, enabled);
  return c.json({ enabled });
});
