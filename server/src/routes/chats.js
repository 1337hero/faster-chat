import { Hono } from "hono";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { UI_CONSTANTS } from "@faster-chat/shared";

export const chatsRouter = new Hono();

chatsRouter.use("/*", ensureSession);

/**
 * GET /api/chats
 * List all chats for the current user
 */
chatsRouter.get("/", async (c) => {
  try {
    const user = c.get("user");
    const chats = dbUtils.getChatsByUserId(user.id);

    return c.json({
      chats: chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      })),
    });
  } catch (error) {
    console.error("List chats error:", error);
    return c.json({ error: "Failed to list chats" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/chats
 * Create a new chat
 */
chatsRouter.post("/", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const title = body.title || null;
    const chatId = body.id || crypto.randomUUID();

    const chat = dbUtils.createChat(chatId, user.id, title);

    return c.json({
      id: chat.id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
    }, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error("Create chat error:", error);
    return c.json({ error: "Failed to create chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/chats/:chatId
 * Get a specific chat
 */
chatsRouter.get("/:chatId", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({
      id: chat.id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return c.json({ error: "Failed to get chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * PATCH /api/chats/:chatId
 * Update a chat (title)
 */
chatsRouter.patch("/:chatId", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const body = await c.req.json();

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    if (body.title !== undefined) {
      dbUtils.updateChatTitle(chatId, body.title);
    }

    const updatedChat = dbUtils.getChatById(chatId);
    return c.json({
      id: updatedChat.id,
      title: updatedChat.title,
      createdAt: updatedChat.created_at,
      updatedAt: updatedChat.updated_at,
    });
  } catch (error) {
    console.error("Update chat error:", error);
    return c.json({ error: "Failed to update chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * DELETE /api/chats/:chatId
 * Soft delete a chat
 */
chatsRouter.delete("/:chatId", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const deleted = dbUtils.softDeleteChatByUser(chatId, user.id);
    if (!deleted) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Delete chat error:", error);
    return c.json({ error: "Failed to delete chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/chats/:chatId/messages
 * Get all messages for a chat
 */
chatsRouter.get("/:chatId/messages", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const messages = dbUtils.getMessagesByChatAndUser(chatId, user.id);

    return c.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        fileIds: msg.file_ids,
        createdAt: msg.created_at,
      })),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return c.json({ error: "Failed to get messages" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/chats/:chatId/messages
 * Add a message to a chat
 */
chatsRouter.post("/:chatId/messages", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const body = await c.req.json();

    if (!body.role || !body.content) {
      return c.json({ error: "role and content are required" }, HTTP_STATUS.BAD_REQUEST);
    }

    if (!["user", "assistant", "system"].includes(body.role)) {
      return c.json({ error: "Invalid role" }, HTTP_STATUS.BAD_REQUEST);
    }

    let chat = dbUtils.getChatByIdAndUser(chatId, user.id);

    if (!chat) {
      chat = dbUtils.createChat(chatId, user.id, null);
    }

    const messageId = body.id || crypto.randomUUID();
    const message = dbUtils.createMessage(
      messageId,
      chatId,
      user.id,
      body.role,
      body.content,
      body.model || null,
      body.fileIds || null
    );

    const isFirstMessage = dbUtils.getMessageCountByChat(chatId) === 1;
    if (isFirstMessage && body.role === "user") {
      const title =
        body.content.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) +
        (body.content.length > UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH
          ? UI_CONSTANTS.CHAT_TITLE_ELLIPSIS
          : "");
      dbUtils.updateChatTitle(chatId, title);
    } else {
      dbUtils.updateChatTimestamp(chatId);
    }

    return c.json({
      id: message.id,
      chatId: message.chat_id,
      role: message.role,
      content: message.content,
      model: message.model,
      fileIds: message.file_ids,
      createdAt: message.created_at,
    }, HTTP_STATUS.CREATED);
  } catch (error) {
    console.error("Create message error:", error);
    return c.json({ error: "Failed to create message" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * DELETE /api/chats/:chatId/messages/:messageId
 * Delete a specific message
 */
chatsRouter.delete("/:chatId/messages/:messageId", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const messageId = c.req.param("messageId");

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const deleted = dbUtils.deleteMessageByUser(messageId, user.id);
    if (!deleted) {
      return c.json({ error: "Message not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    return c.json({ error: "Failed to delete message" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});
