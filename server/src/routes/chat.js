import { config } from "dotenv";
import { Hono } from "hono";
import { z } from "zod";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { ollama } from "ollama-ai-provider";
import { getSystemPrompt } from "@faster-chat/shared";
import { dbUtils } from "../lib/db.js";
import { decryptApiKey } from "../lib/encryption.js";
import { readFile } from "fs/promises";
import path from "path";
import { FILE_CONFIG } from "../lib/fileUtils.js";

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

  // Decrypt API key
  const apiKey = modelRecord.provider_encrypted_key
    ? decryptApiKey(
        modelRecord.provider_encrypted_key,
        modelRecord.provider_iv,
        modelRecord.provider_auth_tag
      )
    : "";

  // Create provider instance and return model
  switch (modelRecord.provider_name) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(modelRecord.model_id);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(modelRecord.model_id);
    }
    case "ollama": {
      // Ollama uses OpenAI-compatible Chat Completions API (not Responses API)
      const ollamaProvider = createOpenAI({
        baseURL: modelRecord.provider_base_url || "http://localhost:11434/v1",
        apiKey: apiKey || "ollama", // Dummy key for local
      });
      // Use .chat() to hit /v1/chat/completions instead of /v1/responses
      return ollamaProvider.chat(modelRecord.model_id);
    }
    default: {
      // All other OpenAI-compatible providers (llama.cpp, llamafile, etc.)
      const provider = createOpenAI({
        baseURL: modelRecord.provider_base_url,
        apiKey: apiKey || "local",
      });
      // Use .chat() for OpenAI-compatible endpoints
      return provider.chat(modelRecord.model_id);
    }
  }
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
  if (!modelId.includes('claude')) {
    return messages;
  }

  return messages.map((msg, idx, arr) => {
    // Cache system prompt (first message)
    if (msg.role === 'system') {
      return {
        ...msg,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: 'ephemeral' } }
        }
      };
    }

    // Cache last 2 conversation messages
    const isLastTwo = idx >= arr.length - 2;
    if (isLastTwo && idx > 0) { // Skip if it's only the system message
      return {
        ...msg,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: 'ephemeral' } }
        }
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
async function convertToModelMessages(messages, systemPrompt, fileIds = []) {
  const result = [];

  // Add system message if present
  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  // Add conversation messages
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "system") continue;

    // Check if this is the last user message and has file attachments
    const isLastUserMessage = i === messages.length - 1 && msg.role === "user";
    const hasFiles = isLastUserMessage && fileIds.length > 0;

    if (hasFiles) {
      // Fetch files from database
      const files = dbUtils.getFilesByIds(fileIds);

      // Create multimodal content array
      const content = [];

      // Add text content if present
      if (msg.content.trim()) {
        content.push({ type: "text", text: msg.content });
      }

      // Add file content parts
      for (const file of files) {
        try {
          const contentPart = await fileToContentPart(file);
          content.push(contentPart);
        } catch (error) {
          console.error(`Failed to process file ${file.id}:`, error);
          // Continue with other files
        }
      }

      result.push({
        role: msg.role,
        content,
      });
    } else {
      // Regular text message
      result.push({
        role: msg.role,
        content: msg.content,
      });
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
    return c.json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});

// Resume endpoint (stub for now)
chatRouter.get("/chat/:id/stream", async (c) => {
  // Return 204 No Content for now
  // TODO: Implement real resume functionality with persistence
  return c.body(null, 204);
});
