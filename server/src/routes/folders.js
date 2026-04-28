import { Hono } from "hono";
import { z } from "zod";
import { dbUtils } from "../lib/db.js";
import { randomUUID } from "crypto";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { FOLDER_CONSTANTS, FOLDER_VALIDATION } from "@faster-chat/shared";

export const foldersRouter = new Hono();

foldersRouter.use("/*", ensureSession);

const FolderCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(FOLDER_CONSTANTS.MAX_NAME_LENGTH),
  color: z.string().regex(FOLDER_VALIDATION.HEX_COLOR_REGEX).nullable().optional(),
  position: z.number().int().optional(),
});

const FolderUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(FOLDER_CONSTANTS.MAX_NAME_LENGTH).optional(),
  color: z.string().regex(FOLDER_VALIDATION.HEX_COLOR_REGEX).nullable().optional(),
  position: z.number().int().optional(),
  is_collapsed: z.boolean().optional(),
});

// GET /api/folders - Get all folders for current user
foldersRouter.get("/", async (c) => {
  const user = c.get("user");
  const folders = dbUtils.getFoldersByUserId(user.id);
  return c.json({ folders });
});

// GET /api/folders/:id - Get specific folder
foldersRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  const folder = dbUtils.getFolderByIdAndUser(folderId, user.id);
  if (!folder) {
    return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
  }

  return c.json({ folder });
});

// GET /api/folders/:id/chats - Get chats in a folder
foldersRouter.get("/:id/chats", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  const folder = dbUtils.getFolderByIdAndUser(folderId, user.id);
  if (!folder) {
    return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
  }

  const chats = dbUtils.getChatsByFolder(folderId, user.id);
  return c.json({ chats });
});

// POST /api/folders - Create new folder
foldersRouter.post("/", async (c) => {
  const user = c.get("user");
  const { name, color, position } = FolderCreateSchema.parse(await c.req.json());

  const folderId = randomUUID();
  const folder = dbUtils.createFolder(
    folderId,
    user.id,
    name,
    color || null,
    position !== undefined ? position : FOLDER_CONSTANTS.DEFAULT_POSITION
  );

  return c.json({ folder }, HTTP_STATUS.CREATED);
});

// PUT /api/folders/:id - Update folder
foldersRouter.put("/:id", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  const existing = dbUtils.getFolderByIdAndUser(folderId, user.id);
  if (!existing) {
    return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
  }

  const { name, color, position, is_collapsed } = FolderUpdateSchema.parse(await c.req.json());

  const updates = {};
  if (name !== undefined) {
    updates.name = name;
  }
  if (color !== undefined) {
    updates.color = color;
  }
  if (position !== undefined) {
    updates.position = position;
  }
  if (is_collapsed !== undefined) {
    updates.is_collapsed = is_collapsed ? 1 : 0;
  }

  const updated = dbUtils.updateFolder(folderId, user.id, updates);
  if (!updated) {
    return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
  }

  return c.json({ folder: updated });
});

// POST /api/folders/:id/toggle - Toggle folder collapse state
foldersRouter.post("/:id/toggle", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  const folder = dbUtils.toggleFolderCollapse(folderId, user.id);
  if (!folder) {
    return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
  }

  return c.json({ folder });
});

// DELETE /api/folders/:id - Delete folder
foldersRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  const success = dbUtils.deleteFolder(folderId, user.id);
  if (!success) {
    return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
  }

  return c.json({ success: true });
});

// PUT /api/folders/:folderId/chats/:chatId - Move chat to folder
foldersRouter.put("/:folderId/chats/:chatId", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("folderId");
  const chatId = c.req.param("chatId");

  // Use null to remove from folder
  const targetFolderId = folderId === "none" ? null : folderId;
  const chat = dbUtils.moveChatToFolder(chatId, user.id, targetFolderId);

  if (!chat) {
    return c.json({ error: "Chat or folder not found" }, HTTP_STATUS.NOT_FOUND);
  }

  return c.json({ chat });
});
