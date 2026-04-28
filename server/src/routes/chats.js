import { Hono } from "hono";
import { z } from "zod";
import { streamText } from "ai";
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
import {
  FILE_CONFIG,
  isTextLikeAttachment,
  isOfficeModernAttachment,
  extractOfficeDocumentText,
  formatInlineAttachmentText,
  MAX_INLINE_TEXT_ATTACHMENT_CHARS,
  preflightAttachments,
} from "../lib/fileUtils.js";
import { ENDPOINT_RATE_LIMITS } from "../lib/constants.js";
import {
  wrapModelWithMemory,
  extractMemories,
  getExtractionModel,
  isMemoryEnabledForRequest,
} from "../lib/memory.js";

const MAX_MODEL_ATTACHMENT_BYTES = 50 * 1024 * 1024;

function mapAttachmentError(error) {
  const message = error.message || String(error);
  if (message.includes("maximum supported dimension")) {
    return { code: "ATTACHMENT_IMAGE_DIMENSIONS", error: message };
  }
  if (message.includes("media type") || message.includes("content type")) {
    return {
      code: "ATTACHMENT_UNSUPPORTED",
      error: "One or more attachments are not supported by the selected model.",
    };
  }
  return null;
}

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
  if (text.length <= UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) {
    return text;
  }
  return text.slice(0, UI_CONSTANTS.CHAT_TITLE_MAX_LENGTH) + UI_CONSTANTS.CHAT_TITLE_ELLIPSIS;
}

function chatStateHandler(action, message) {
  return async (c) => {
    const user = c.get("user");
    const chatId = c.req.param("chatId");

    const updated = action()(chatId, user.id);
    if (!updated) {
      return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
    }

    return c.json({ message });
  };
}

chatsRouter.get("/", async (c) => {
  const user = c.get("user");
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const chats = dbUtils.getChatsByUserIdPaginated(user.id, limit, offset);

  return c.json({
    chats: chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      folderId: chat.folder_id,
      pinnedAt: chat.pinned_at,
      archivedAt: chat.archived_at,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
    })),
    limit,
    offset,
  });
});

chatsRouter.post("/", async (c) => {
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
      folderId: chat.folder_id,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at,
    },
    HTTP_STATUS.CREATED
  );
});

chatsRouter.get("/:chatId", async (c) => {
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
});

chatsRouter.patch("/:chatId", async (c) => {
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
});

chatsRouter.delete("/:chatId", async (c) => {
  const user = c.get("user");
  const chatId = c.req.param("chatId");

  const deleted = dbUtils.softDeleteChatByUser(chatId, user.id);
  if (!deleted) {
    return c.json({ error: "Chat not found" }, HTTP_STATUS.NOT_FOUND);
  }

  return c.json({ message: "Chat deleted successfully" });
});

chatsRouter.post(
  "/:chatId/pin",
  chatStateHandler(() => dbUtils.pinChat, "Chat pinned successfully")
);
chatsRouter.delete(
  "/:chatId/pin",
  chatStateHandler(() => dbUtils.unpinChat, "Chat unpinned successfully")
);
chatsRouter.post(
  "/:chatId/archive",
  chatStateHandler(() => dbUtils.archiveChat, "Chat archived successfully")
);
chatsRouter.delete(
  "/:chatId/archive",
  chatStateHandler(() => dbUtils.unarchiveChat, "Chat unarchived successfully")
);

chatsRouter.get("/:chatId/messages", async (c) => {
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
});

chatsRouter.post("/:chatId/messages", async (c) => {
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

  if (validated.role === "user") {
    const isFirstMessage = dbUtils.getMessageCountByChat(chatId) === 1;
    if (isFirstMessage) {
      let title = truncateToTitle(validated.content); // always computed
      if (validated.model) {
        try {
          const aiTitle = await generateChatTitle(validated.content, validated.model);
          if (aiTitle && aiTitle.trim()) {
            title = aiTitle;
          }
        } catch (err) {
          console.warn("AI title upgrade failed, keeping fallback:", err.message);
        }
      }
      dbUtils.setChatTitleIfEmpty(chatId, title);
    } else {
      dbUtils.updateChatTimestamp(chatId);
    }
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
});

chatsRouter.delete("/:chatId/messages/:messageId", async (c) => {
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
      fileIds: z.array(z.string()).optional(),
    })
  ),
  fileIds: z.array(z.string()).optional(),
  webSearch: z.boolean().optional(),
  memoryEnabled: z.boolean().optional().default(true),
});

function getModel(modelId) {
  const modelRecord = dbUtils.getEnabledModelWithProvider(modelId);
  if (!modelRecord) {
    throw new Error(`Model ${modelId} is disabled or not registered`);
  }
  return getModelInstance(modelRecord, decryptApiKey);
}

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
    title = title.replace(/^["*]+|["*]+$/g, "").trim();

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

function inlineTextPart(file, size, text, totalCharCount) {
  return {
    type: "text",
    text: formatInlineAttachmentText({
      filename: file.filename,
      mimeType: file.mime_type,
      size,
      text,
      totalCharCount,
    }),
  };
}

async function fileToContentPart(file) {
  const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename);
  if (file.size > MAX_MODEL_ATTACHMENT_BYTES) {
    throw new Error(`Attachment ${file.filename} exceeds the per-file model limit`);
  }
  const fileBuffer = await readFile(filePath).catch((err) => {
    throw new Error(`Cannot read ${file.id} at ${filePath}: ${err.message}`);
  });

  if (file.mime_type?.startsWith("image/")) {
    return {
      type: "image",
      image: `data:${file.mime_type};base64,${fileBuffer.toString("base64")}`,
    };
  }

  if (isOfficeModernAttachment(file)) {
    const { text } = await extractOfficeDocumentText(file).catch((err) => {
      throw new Error(`Office document extraction failed for ${file.filename}: ${err.message}`);
    });
    const displayText = text.slice(0, MAX_INLINE_TEXT_ATTACHMENT_CHARS);
    const truncated = displayText.length < text.length;
    return inlineTextPart(
      file,
      fileBuffer.length,
      displayText,
      truncated ? text.length : undefined
    );
  }

  if (isTextLikeAttachment(file)) {
    const fullText = fileBuffer.toString("utf8");
    const displayText = fullText.slice(0, MAX_INLINE_TEXT_ATTACHMENT_CHARS);
    const truncated = displayText.length < fullText.length;
    return inlineTextPart(
      file,
      fileBuffer.length,
      displayText,
      truncated ? fullText.length : undefined
    );
  }

  return {
    type: "file",
    data: fileBuffer,
    mediaType: file.mime_type,
    filename: file.filename,
  };
}

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

export async function createMultimodalContent(message, fileIds, filesById) {
  const content = [];
  let totalBytes = 0;
  if (message.content.trim()) {
    content.push({ type: "text", text: message.content });
  }
  for (const id of fileIds) {
    const file = filesById.get(id);
    totalBytes += file?.size || 0;
    if (totalBytes > MAX_MODEL_ATTACHMENT_BYTES) {
      throw new Error("Combined attachments exceed the model request limit");
    }
    content.push(await fileToContentPart(file));
  }
  return content;
}

async function convertToModelMessages(messages, systemPrompt, fileIds = [], filesById = new Map()) {
  const result = systemPrompt ? [{ role: "system", content: systemPrompt }] : [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "system") {
      continue;
    }

    const isLastUser = i === messages.length - 1 && msg.role === "user";
    const msgFileIds =
      msg.fileIds && msg.fileIds.length > 0 ? msg.fileIds : isLastUser ? fileIds : [];

    if (msg.role === "user" && msgFileIds.length > 0) {
      const content = await createMultimodalContent(msg, msgFileIds, filesById);
      result.push({ role: msg.role, content });
    } else {
      result.push({ role: msg.role, content: msg.content });
    }
  }

  return result;
}

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
      const modelRecord = dbUtils.getEnabledModelWithProvider(modelId);
      if (!modelRecord) {
        return c.json(
          { error: `Model ${modelId} is disabled or not registered` },
          HTTP_STATUS.BAD_REQUEST
        );
      }
      const model = getModelInstance(modelRecord, decryptApiKey);
      const memoryRequestEnabled = validated.memoryEnabled !== false;
      const memoryEnabledForRequest = isMemoryEnabledForRequest({
        dbUtils,
        userId: user.id,
        chatId,
        requestEnabled: memoryRequestEnabled,
      });
      const memoryModel = memoryEnabledForRequest ? wrapModelWithMemory(model, dbUtils) : model;
      const systemPrompt = getSystemPrompt(validated.systemPromptId);

      const allFileIds = [
        ...new Set([
          ...(validated.fileIds || []),
          ...validated.messages.flatMap((m) => m.fileIds || []),
        ]),
      ];

      const allFiles = allFileIds.length ? dbUtils.getFilesByIdsForUser(allFileIds, user.id) : [];
      if (allFiles.length !== allFileIds.length) {
        return c.json({ error: "Invalid attachments" }, HTTP_STATUS.FORBIDDEN);
      }

      const issue = await preflightAttachments({
        files: allFiles,
        modelRecord,
        providerName: modelRecord.provider_name,
      });
      if (!issue.ok) {
        // Include code and formatted error details in response
        return c.json(
          {
            code: issue.code,
            error: issue.error,
            details: issue.details,
          },
          HTTP_STATUS.BAD_REQUEST
        );
      }

      const filesById = new Map(allFiles.map((f) => [f.id, f]));

      const messages = applyCacheControl(
        await convertToModelMessages(
          validated.messages,
          systemPrompt.content,
          validated.fileIds || [],
          filesById
        ),
        modelId
      );

      let toolConfig = {};
      if (validated.webSearch) {
        const metadata = dbUtils.getModelMetadata(modelRecord.id);
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
      const mapped = mapAttachmentError(error);
      if (mapped) {
        return c.json({ code: mapped.code, error: mapped.error }, HTTP_STATUS.BAD_REQUEST);
      }
      return c.json({ error: "Completion failed" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
);

chatsRouter.get("/:chatId/stream", async (c) => {
  return c.body(null, 204);
});

chatsRouter.put("/:chatId/memory", async (c) => {
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
});
