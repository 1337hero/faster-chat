import { config } from "dotenv";
import { Hono } from "hono";
import { z } from "zod";
import { streamText } from "ai";
import { getSystemPrompt, MODEL_FEATURES } from "@faster-chat/shared";
import { dbUtils } from "../lib/db.js";
import { decryptApiKey } from "../lib/encryption.js";
import { getModelInstance } from "../lib/providerFactory.js";
import { readFile } from "fs/promises";
import path from "path";
import { FILE_CONFIG } from "../lib/fileUtils.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";

// Ensure environment variables are loaded even when this module is imported before index config()
config();

// Request validation schema
const ChatRequestSchema = z.object({
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

export const chatRouter = new Hono();

/**
 * Get the appropriate model from database
 * @param {string} modelId - The model_id from the database
 */
function getModel(modelId) {
  const modelRecord = dbUtils.getEnabledModelWithProvider(modelId);

  if (!modelRecord) {
    throw new Error(`Model ${modelId} is disabled or not registered`);
  }

  return getModelInstance(modelRecord, decryptApiKey);
}

/**
 * Convert file to multimodal content part
 * @param {object} file - File record from database
 */
async function fileToContentPart(file) {
  // Read file from disk
  const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename);
  const fileBuffer = await readFile(filePath);

  // Check if file is an image
  const isImage = file.mime_type?.startsWith("image/");

  if (isImage) {
    // Convert image to base64 and create image content part
    const base64Data = fileBuffer.toString("base64");
    return {
      type: "image",
      image: `data:${file.mime_type};base64,${base64Data}`,
    };
  }

  // For non-image files, just include filename and content as text
  // (Future: could implement PDF/document text extraction)
  return {
    type: "text",
    text: `[Attached file: ${file.filename}]`,
  };
}

/**
 * Apply Anthropic prompt caching to messages
 *
 * Strategy:
 * - Cache system prompt (rarely changes, ~1024+ tokens)
 * - Cache last 2 conversation messages (recent context)
 *
 * Benefits:
 * - Reduces latency (faster responses)
 * - Reduces cost (90% discount on cached tokens)
 * - Cache valid for 5 minutes (ephemeral)
 *
 * Only applies to Claude models - other providers ignore this metadata
 *
 * @param {Array} messages - Model messages
 * @param {string} modelId - Model identifier
 * @returns {Array} Messages with cache control metadata
 */
function applyCacheControl(messages, modelId) {
  // Only apply caching for Anthropic/Claude models
  if (!MODEL_FEATURES.SUPPORTS_PROMPT_CACHING(modelId)) {
    return messages;
  }

  return messages.map((msg, idx, arr) => {
    // Cache system prompt (first message)
    if (msg.role === "system") {
      return {
        ...msg,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: MODEL_FEATURES.CACHE_TYPE } },
        },
      };
    }

    // Cache recent conversation messages
    const isRecentMessage = idx >= arr.length - MODEL_FEATURES.CACHE_LAST_N_MESSAGES;
    if (isRecentMessage && idx > 0) {
      // Skip if it's only the system message
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
 * Convert chat messages to model messages format
 * @param {Array} messages
 * @param {string} systemPrompt
 * @param {Array} fileIds - File IDs for the last user message
 */
/**
 * Add system message to result array if system prompt is provided
 */
function addSystemMessage(systemPrompt) {
  return systemPrompt ? [{ role: "system", content: systemPrompt }] : [];
}

/**
 * Check if this is the last user message with file attachments
 */
function isLastUserMessageWithFiles(index, messages, fileIds) {
  return index === messages.length - 1 && messages[index].role === "user" && fileIds.length > 0;
}

/**
 * Create multimodal content array with text and file attachments
 */
async function createMultimodalContent(message, fileIds) {
  const content = [];

  // Add text content if present
  if (message.content.trim()) {
    content.push({ type: "text", text: message.content });
  }

  // Fetch and add file content parts
  const files = dbUtils.getFilesByIds(fileIds);
  for (const file of files) {
    try {
      const contentPart = await fileToContentPart(file);
      content.push(contentPart);
    } catch (error) {
      console.error(`Failed to process file ${file.id}:`, error);
      // Continue with other files
    }
  }

  return content;
}

async function convertToModelMessages(messages, systemPrompt, fileIds = []) {
  const result = addSystemMessage(systemPrompt);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "system") continue;

    if (isLastUserMessageWithFiles(i, messages, fileIds)) {
      const content = await createMultimodalContent(msg, fileIds);
      result.push({ role: msg.role, content });
    } else {
      result.push({ role: msg.role, content: msg.content });
    }
  }

  return result;
}

// Main chat endpoint
chatRouter.post("/chat", async (c) => {
  try {
    const body = await c.req.json();
    const validated = ChatRequestSchema.parse(body);

    const modelId = validated.model;
    const model = getModel(modelId);
    const systemPrompt = getSystemPrompt(validated.systemPromptId);

    let messages = await convertToModelMessages(
      validated.messages,
      systemPrompt.content,
      validated.fileIds || []
    );

    // Apply prompt caching for Claude models
    messages = applyCacheControl(messages, modelId);

    const stream = await streamText({
      model,
      messages,
      maxTokens: 4096,
    });

    // Return the stream as a response
    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return c.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

// Resume endpoint (stub for now)
chatRouter.get("/chat/:id/stream", async (c) => {
  // Return 204 No Content for now
  // TODO: Implement real resume functionality with persistence
  return c.body(null, 204);
});
