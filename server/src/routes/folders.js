import { Hono } from "hono";
import { dbUtils } from "../lib/db.js";
import { randomUUID } from "crypto";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { FOLDER_CONSTANTS, FOLDER_VALIDATION } from "@faster-chat/shared";

export const foldersRouter = new Hono();

foldersRouter.use("/*", ensureSession);

// GET /api/folders - Get all folders for current user
foldersRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const folders = dbUtils.getFoldersByUserId(user.id);
    return c.json({ folders });
  } catch (error) {
    console.error("[Folders] Error fetching folders:", error.message);
    return c.json({ error: "Failed to fetch folders" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// GET /api/folders/:id - Get specific folder
foldersRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const folder = dbUtils.getFolderByIdAndUser(folderId, user.id);
    if (!folder) {
      return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ folder });
  } catch (error) {
    console.error("[Folders] Error fetching folder:", error.message);
    return c.json({ error: "Failed to fetch folder" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// GET /api/folders/:id/chats - Get chats in a folder
foldersRouter.get("/:id/chats", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const folder = dbUtils.getFolderByIdAndUser(folderId, user.id);
    if (!folder) {
      return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const chats = dbUtils.getChatsByFolder(folderId, user.id);
    return c.json({ chats });
  } catch (error) {
    console.error("[Folders] Error fetching folder chats:", error.message);
    return c.json({ error: "Failed to fetch folder chats" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// POST /api/folders - Create new folder
foldersRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const body = await c.req.json();
    const { name, color, position } = body;

    if (!name) {
      return c.json({ error: "Name is required" }, HTTP_STATUS.BAD_REQUEST);
    }

    if (name.length > FOLDER_CONSTANTS.MAX_NAME_LENGTH) {
      return c.json({ error: `Name must be ${FOLDER_CONSTANTS.MAX_NAME_LENGTH} characters or less` }, HTTP_STATUS.BAD_REQUEST);
    }

    if (color && !FOLDER_VALIDATION.HEX_COLOR_REGEX.test(color)) {
      return c.json({ error: FOLDER_VALIDATION.HEX_COLOR_ERROR }, HTTP_STATUS.BAD_REQUEST);
    }

    const folderId = randomUUID();
    const folder = dbUtils.createFolder(
      folderId,
      user.id,
      name,
      color || null,
      position !== undefined ? position : FOLDER_CONSTANTS.DEFAULT_POSITION
    );

    return c.json({ folder }, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error("[Folders] Error creating folder:", error.message);
    return c.json({ error: "Failed to create folder" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// PUT /api/folders/:id - Update folder
foldersRouter.put("/:id", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const existing = dbUtils.getFolderByIdAndUser(folderId, user.id);
    if (!existing) {
      return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const body = await c.req.json();
    const { name, color, position, is_collapsed } = body;

    if (name !== undefined && name.length > FOLDER_CONSTANTS.MAX_NAME_LENGTH) {
      return c.json({ error: `Name must be ${FOLDER_CONSTANTS.MAX_NAME_LENGTH} characters or less` }, HTTP_STATUS.BAD_REQUEST);
    }

    if (color !== undefined && color !== null && !FOLDER_VALIDATION.HEX_COLOR_REGEX.test(color)) {
      return c.json({ error: FOLDER_VALIDATION.HEX_COLOR_ERROR }, HTTP_STATUS.BAD_REQUEST);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (position !== undefined) updates.position = position;
    if (is_collapsed !== undefined) updates.is_collapsed = is_collapsed ? 1 : 0;

    const updated = dbUtils.updateFolder(folderId, user.id, updates);
    if (!updated) {
      return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ folder: updated });
  } catch (error) {
    console.error("[Folders] Error updating folder:", error.message);
    return c.json({ error: "Failed to update folder" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// POST /api/folders/:id/toggle - Toggle folder collapse state
foldersRouter.post("/:id/toggle", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const folder = dbUtils.toggleFolderCollapse(folderId, user.id);
    if (!folder) {
      return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ folder });
  } catch (error) {
    console.error("[Folders] Error toggling folder:", error.message);
    return c.json({ error: "Failed to toggle folder" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// DELETE /api/folders/:id - Delete folder
foldersRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    const success = dbUtils.deleteFolder(folderId, user.id);
    if (!success) {
      return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[Folders] Error deleting folder:", error.message);
    return c.json({ error: "Failed to delete folder" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// PUT /api/folders/:folderId/chats/:chatId - Move chat to folder
foldersRouter.put("/:folderId/chats/:chatId", async (c) => {
  const user = c.get("user");
  const folderId = c.req.param("folderId");
  const chatId = c.req.param("chatId");

  if (!user) {
    return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
  }

  try {
    // Use null to remove from folder
    const targetFolderId = folderId === "none" ? null : folderId;
    const chat = dbUtils.moveChatToFolder(chatId, user.id, targetFolderId);

    if (!chat) {
      return c.json({ error: "Chat or folder not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ chat });
  } catch (error) {
    console.error("[Folders] Error moving chat to folder:", error.message);
    return c.json({ error: "Failed to move chat to folder" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});
