import { Hono } from "hono";
import { z } from "zod";
import { streamText, generateText } from "ai";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import {
  UI_CONSTANTS,
  getSystemPrompt,
  MODEL_FEATURES,
  COMPLETION_CONSTANTS,
  WEB_SEARCH_CONSTANTS,
} from "@faster-chat/shared";
import { createWebSearchTool } from "../lib/tools/webSearch.js";
import { createFetchUrlTool } from "../lib/tools/fetchUrl.js";
import { decryptApiKey } from "../lib/encryption.js";
import { getModelInstance } from "../lib/providerFactory.js";
import { readFile } from "fs/promises";
import path from "path";
import { FILE_CONFIG } from "../lib/fileUtils.js";
import { ENDPOINT_RATE_LIMITS } from "../lib/constants.js";
import {
  wrapModelWithMemory,
  extractMemories,
  getExtractionModel,
  isMemoryEnabledForRequest,
} from "../lib/memory.js";

export const chatsRouter = new Hono();

chatsRouter.use("/*", ensureSession);

// Validation schemas
const MessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(100000),
  model: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

const PatchChatSchema = z.object({
  title: z.string().max(200).optional(),
});

function truncateToTitle(text) {
  if (text.length <= UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) return text;
  return text.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) + UI_CONSTANTS.CHAT_TITLE_ELLIPSIS;
}

/**
 * GET /api/chats
 * List chats for the current user (paginated)
 */
chatsRouter.get("/", async (c) => {
  try {
    const user = c.get("user");
    const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
    const offset = parseInt(c.req.query("offset") || "0", 10);
    const chats = dbUtils.getChatsByUserIdPaginated(user.id, limit, offset);

    return c.json({
      chats: chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        pinnedAt: chat.pinned_at,
        archivedAt: chat.archived_at,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      })),
      limit,
      offset,
    });
  } catch (error) {
    console.error("List chats error:", error);
    return c.json({ error: "Failed to list chats" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/chats
 * Create a new chat (optionally in a folder)
 */
chatsRouter.post("/", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json().catch(() => ({}));
    const title = body.title || null;
    const chatId = body.id || crypto.randomUUID();
    const folderId = body.folder_id || null;

    // Validate folder belongs to user if provided
    if (folderId) {
      const folder = dbUtils.getFolderByIdAndUser(folderId, user.id);
      if (!folder) {
        return c.json({ error: "Folder not found" }, HTTP_STATUS.NOT_FOUND);
      }
    }

    const chat = dbUtils.createChat(chatId, user.id, title, folderId);

    return c.json(
      {
        id: chat.id,
        title: chat.title,
        folder_id: chat.folder_id,
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
      memoryDisabled: !!chat.memory_disabled,
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
    const validated = PatchChatSchema.parse(body);

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    if (validated.title !== undefined) {
      dbUtils.updateChatTitle(chatId, validated.title);
    }

    const updatedChat = dbUtils.getChatById(chatId);
    return c.json({
      id: updatedChat.id,
      title: updatedChat.title,
      createdAt: updatedChat.created_at,
      updatedAt: updatedChat.updated_at,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
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
 * Get messages for a chat (paginated)
 */
chatsRouter.get("/:chatId/messages", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const limit = Math.min(parseInt(c.req.query("limit") || "200", 10), 500);
    const offset = parseInt(c.req.query("offset") || "0", 10);
    const messages = dbUtils.getMessagesByChatAndUserPaginated(chatId, user.id, limit, offset);

    return c.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        fileIds: msg.file_ids,
        metadata: msg.metadata || null,
        createdAt: msg.created_at,
      })),
      limit,
      offset,
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
    const validated = MessageSchema.parse(body);

    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const messageId = validated.id || crypto.randomUUID();
    // Validate attachment ownership
    if (validated.fileIds && validated.fileIds.length > 0) {
      const userFiles = dbUtils.getFilesByIdsForUser(validated.fileIds, user.id);
      if (!userFiles || userFiles.length !== validated.fileIds.length) {
        return c.json({ error: "Invalid attachments" }, HTTP_STATUS.FORBIDDEN);
      }
    }

    const message = dbUtils.createMessage(
      messageId,
      chatId,
      user.id,
      validated.role,
      validated.content,
      validated.model || null,
      validated.fileIds || null,
      validated.metadata || null
    );

    const isFirstMessage = dbUtils.getMessageCountByChat(chatId) === 1;
    if (isFirstMessage && validated.role === "user") {
      let title;
      if (validated.model) {
        title = await generateChatTitle(validated.content, validated.model);
      } else {
        title = truncateToTitle(validated.content);
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
        metadata: message.metadata || null,
        createdAt: message.created_at,
      },
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
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
  webSearch: z.boolean().optional(),
  memoryEnabled: z.boolean().optional().default(true),
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

    let title = (await result.text).trim();

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
      title = truncateToTitle(userMessage);
    }

    return title;
  } catch (error) {
    console.warn("Title generation failed, using message slice fallback:", error);
    return truncateToTitle(userMessage);
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
    type: "file",
    data: fileBuffer,
    mediaType: file.mime_type,
    filename: file.filename,
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
        providerOptions: {
          anthropic: { cacheControl: { type: MODEL_FEATURES.CACHE_TYPE } },
        },
      };
    }

    const isRecentMessage = idx >= arr.length - MODEL_FEATURES.CACHE_LAST_N_MESSAGES;
    if (isRecentMessage && idx > 0) {
      return {
        ...msg,
        providerOptions: {
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
chatsRouter.post(
  "/:chatId/completion",
  createRateLimiter(ENDPOINT_RATE_LIMITS.COMPLETION),
  async (c) => {
    try {
      const user = c.get("user");
      const chatId = c.req.param("chatId");
      const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
      if (!chat) {
        return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
      }

      const body = await c.req.json();
      const validated = CompletionRequestSchema.parse(body);

      const modelId = validated.model;
      const model = getModel(modelId);
      const memoryRequestEnabled = validated.memoryEnabled !== false;
      const memoryEnabledForRequest = isMemoryEnabledForRequest({
        dbUtils,
        userId: user.id,
        chatId,
        requestEnabled: memoryRequestEnabled,
      });
      const memoryModel = memoryEnabledForRequest ? wrapModelWithMemory(model, dbUtils) : model;
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

      let toolConfig = {};
      if (validated.webSearch) {
        const modelRecord = dbUtils.getEnabledModelWithProvider(modelId);
        const metadata = modelRecord && dbUtils.getModelMetadata(modelRecord.id);
        if (metadata?.supports_tools) {
          const apiKey = dbUtils.getWebSearchApiKey();
          if (apiKey) {
            toolConfig = {
              tools: {
                webSearch: createWebSearchTool({ apiKey }),
                fetchUrl: createFetchUrlTool(),
              },
              maxSteps: WEB_SEARCH_CONSTANTS.MAX_TOOL_STEPS,
            };
          }
        }
      }

      const stream = await streamText({
        model: memoryModel,
        messages,
        maxTokens: COMPLETION_CONSTANTS.MAX_TOKENS,
        providerOptions: {
          memory: { userId: user.id, chatId, enabled: memoryRequestEnabled },
        },
        onFinish: async ({ text }) => {
          const canExtractMemories = isMemoryEnabledForRequest({
            dbUtils,
            userId: user.id,
            chatId,
            requestEnabled: memoryRequestEnabled,
          });
          if (canExtractMemories) {
            const lastUserMsg = validated.messages.findLast((m) => m.role === "user");
            if (lastUserMsg && text.trim()) {
              const extractionModel = getExtractionModel(dbUtils, decryptApiKey) || model;
              extractMemories({
                model: extractionModel,
                userMessage: lastUserMsg.content,
                assistantMessage: text,
                userId: user.id,
                chatId,
                dbUtils,
              }).catch((err) => console.warn("Memory extraction failed:", err.message));
            }
          }
        },
        ...toolConfig,
      });

      return stream.toUIMessageStreamResponse();
    } catch (error) {
      console.error("Completion error:", error);
      return c.json({ error: "Completion failed" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
);

/**
 * GET /api/chats/:chatId/stream
 * Resume endpoint (stub for now)
 */
chatsRouter.get("/:chatId/stream", async (c) => {
  return c.body(null, 204);
});

chatsRouter.put("/:chatId/memory", async (c) => {
  try {
    const user = c.get("user");
    const chatId = c.req.param("chatId");
    const chat = dbUtils.getChatByIdAndUser(chatId, user.id);
    if (!chat) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }
    const { disabled } = await c.req.json();
    if (typeof disabled !== "boolean") {
      return c.json({ error: "disabled must be a boolean" }, HTTP_STATUS.BAD_REQUEST);
    }
    dbUtils.setChatMemoryDisabled(chatId, disabled);
    return c.json({ disabled });
  } catch (error) {
    console.error("Toggle chat memory error:", error);
    return c.json({ error: "Failed to toggle chat memory" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});
