import { Hono } from "hono";
import { z } from "zod";
import { streamText } from "ai";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import {
  UI_CONSTANTS,
  getSystemPrompt,
  MODEL_FEATURES,
  COMPLETION_CONSTANTS,
} from "@faster-chat/shared";
import { decryptApiKey } from "../lib/encryption.js";
import { getModelInstance } from "../lib/providerFactory.js";
import { readFile } from "fs/promises";
import path from "path";
import { FILE_CONFIG } from "../lib/fileUtils.js";

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
        pinnedAt: chat.pinned_at,
        archivedAt: chat.archived_at,
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

    return c.json(
      {
        id: chat.id,
        title: chat.title,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      },
      HTTP_STATUS.CREATED
    );
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
 * POST /api/chats/:chatId/pin
 * Pin a chat
 */
chatsRouter.post("/:chatId/pin", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const pinned = dbUtils.pinChat(chatId, user.id);
    if (!pinned) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ message: "Chat pinned successfully" });
  } catch (error) {
    console.error("Pin chat error:", error);
    return c.json({ error: "Failed to pin chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * DELETE /api/chats/:chatId/pin
 * Unpin a chat
 */
chatsRouter.delete("/:chatId/pin", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const unpinned = dbUtils.unpinChat(chatId, user.id);
    if (!unpinned) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ message: "Chat unpinned successfully" });
  } catch (error) {
    console.error("Unpin chat error:", error);
    return c.json({ error: "Failed to unpin chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/chats/:chatId/archive
 * Archive a chat
 */
chatsRouter.post("/:chatId/archive", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const archived = dbUtils.archiveChat(chatId, user.id);
    if (!archived) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ message: "Chat archived successfully" });
  } catch (error) {
    console.error("Archive chat error:", error);
    return c.json({ error: "Failed to archive chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * DELETE /api/chats/:chatId/archive
 * Unarchive a chat
 */
chatsRouter.delete("/:chatId/archive", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const unarchived = dbUtils.unarchiveChat(chatId, user.id);
    if (!unarchived) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ message: "Chat unarchived successfully" });
  } catch (error) {
    console.error("Unarchive chat error:", error);
    return c.json({ error: "Failed to unarchive chat" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
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

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      // Hide existence of chats that belong to other users and do not auto-create
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const messageId = body.id || crypto.randomUUID();
    // Validate attachment ownership
    if (body.fileIds && body.fileIds.length > 0) {
      const userFiles = dbUtils.getFilesByIdsForUser(body.fileIds, user.id);
      if (!userFiles || userFiles.length !== body.fileIds.length) {
        return c.json({ error: "Invalid attachments" }, HTTP_STATUS.FORBIDDEN);
      }
    }

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
      // Generate AI-powered title for the first message
      let title;
      if (body.model) {
        // Use AI to generate a concise title
        title = await generateChatTitle(body.content, body.model);
      } else {
        // Fallback to sliced message if no model provided
        title =
          body.content.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) +
          (body.content.length > UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH
            ? UI_CONSTANTS.CHAT_TITLE_ELLIPSIS
            : "");
      }
      dbUtils.updateChatTitle(chatId, title);
    } else {
      dbUtils.updateChatTimestamp(chatId);
    }

    return c.json(
      {
        id: message.id,
        chatId: message.chat_id,
        role: message.role,
        content: message.content,
        model: message.model,
        fileIds: message.file_ids,
        createdAt: message.created_at,
      },
      HTTP_STATUS.CREATED
    );
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

// =============================================================================
// Completion / Streaming
// =============================================================================

// Request validation schema for completions
const CompletionRequestSchema = z.object({
  model: z.string(),
  systemPromptId: z.string().default("default"),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  fileIds: z.array(z.string()).optional(),
});

/**
 * Get the appropriate model from database
 */
function getModel(modelId) {
  const modelRecord = dbUtils.getEnabledModelWithProvider(modelId);
  if (!modelRecord) {
    throw new Error(`Model ${modelId} is disabled or not registered`);
  }
  return getModelInstance(modelRecord, decryptApiKey);
}

/**
 * Generate a concise AI-powered title for a chat based on the first user message
 */
async function generateChatTitle(userMessage, modelId) {
  try {
    const model = getModel(modelId);

    const result = await streamText({
      model,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      system:
        "Create a 2-5 word title summarizing the user's request. Return ONLY the title, no explanation.",
      maxTokens: 20,
    });

    let title = result.text.trim();

    // Remove thinking blocks if present (for models like o1)
    title = title.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Clean up any quotes or asterisks from the response
    title = title.replace(/^["\*]+|["\*]+$/g, "").trim();

    // Ensure title is within max length
    if (title.length > UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) {
      title = title.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH).trim();
    }

    // Fallback to sliced message if title generation fails or returns empty
    if (!title) {
      title =
        userMessage.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) +
        (userMessage.length > UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH
          ? UI_CONSTANTS.CHAT_TITLE_ELLIPSIS
          : "");
    }

    return title;
  } catch (error) {
    // If title generation fails, fall back to slicing the message
    console.warn("Title generation failed, using message slice fallback:", error);
    return (
      userMessage.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) +
      (userMessage.length > UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH
        ? UI_CONSTANTS.CHAT_TITLE_ELLIPSIS
        : "")
    );
  }
}

/**
 * Convert file to multimodal content part
 */
async function fileToContentPart(file) {
  const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename);
  let fileBuffer;
  try {
    fileBuffer = await readFile(filePath);
  } catch (err) {
    console.error(`Missing or unreadable file ${file.id} at ${filePath}:`, err);
    throw err;
  }

  const isImage = file.mime_type?.startsWith("image/");
  if (isImage) {
    const base64Data = fileBuffer.toString("base64");
    return {
      type: "image",
      image: `data:${file.mime_type};base64,${base64Data}`,
    };
  }

  return {
    type: "text",
    text: `[Attached file: ${file.filename}]`,
  };
}

/**
 * Apply Anthropic prompt caching to messages
 */
function applyCacheControl(messages, modelId) {
  if (!MODEL_FEATURES.SUPPORTS_PROMPT_CACHING(modelId)) {
    return messages;
  }

  return messages.map((msg, idx, arr) => {
    if (msg.role === "system") {
      return {
        ...msg,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: MODEL_FEATURES.CACHE_TYPE } },
        },
      };
    }

    const isRecentMessage = idx >= arr.length - MODEL_FEATURES.CACHE_LAST_N_MESSAGES;
    if (isRecentMessage && idx > 0) {
      return {
        ...msg,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: MODEL_FEATURES.CACHE_TYPE } },
        },
      };
    }

    return msg;
  });
}

/**
 * Create multimodal content array with text and file attachments
 */
async function createMultimodalContent(message, fileIds, userId) {
  const content = [];

  if (message.content.trim()) {
    content.push({ type: "text", text: message.content });
  }

  const files = dbUtils.getFilesByIdsForUser(fileIds, userId);
  if (files.length !== fileIds.length) {
    throw new Error("One or more attachments are not accessible");
  }

  for (const file of files) {
    try {
      const contentPart = await fileToContentPart(file);
      content.push(contentPart);
    } catch (error) {
      console.error(`Failed to process file ${file.id}:`, error);
    }
  }

  return content;
}

/**
 * Convert chat messages to model messages format
 */
async function convertToModelMessages(messages, systemPrompt, fileIds = [], userId) {
  const result = systemPrompt ? [{ role: "system", content: systemPrompt }] : [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "system") continue;

    const isLastUserWithFiles =
      i === messages.length - 1 && msg.role === "user" && fileIds.length > 0;

    if (isLastUserWithFiles) {
      const content = await createMultimodalContent(msg, fileIds, userId);
      result.push({ role: msg.role, content });
    } else {
      result.push({ role: msg.role, content: msg.content });
    }
  }

  return result;
}

/**
 * POST /api/chats/:chatId/completion
 * Stream an AI completion for a chat
 */
chatsRouter.post("/:chatId/completion", async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
    }

    const chatId = c.req.param("chatId");
    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const body = await c.req.json();
    const validated = CompletionRequestSchema.parse(body);

    const modelId = validated.model;
    const model = getModel(modelId);
    const systemPrompt = getSystemPrompt(validated.systemPromptId);

    let messages;
    try {
      messages = await convertToModelMessages(
        validated.messages,
        systemPrompt.content,
        validated.fileIds || [],
        user.id
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes("not accessible")) {
        return c.json({ error: "Invalid attachments" }, HTTP_STATUS.FORBIDDEN);
      }
      throw err;
    }

    messages = applyCacheControl(messages, modelId);

    const stream = await streamText({
      model,
      messages,
      maxTokens: COMPLETION_CONSTANTS.MAX_TOKENS,
    });

    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Completion error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /api/chats/:chatId/stream
 * Resume endpoint (stub for now)
 */
chatsRouter.get("/:chatId/stream", async (c) => {
  return c.body(null, 204);
});
