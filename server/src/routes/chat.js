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
});

export const chatRouter = new Hono();

/**
 * Get the appropriate model from database
 * @param {string} modelId - The model_id from the database
 */
function getModel(modelId) {
  // Query database for model and provider
  const models = dbUtils.getAllModels();
  const model = models.find((m) => m.model_id === modelId);

  if (!model) {
    throw new Error(`Model ${modelId} not found in database`);
  }

  // Get provider details
  const provider = dbUtils.getProviderById(model.provider_id);
  if (!provider) {
    throw new Error(`Provider for model ${modelId} not found`);
  }

  if (!provider.enabled) {
    throw new Error(`Provider ${provider.name} is disabled`);
  }

  // Decrypt API key
  const apiKey = provider.encrypted_key
    ? decryptApiKey(provider.encrypted_key, provider.iv, provider.auth_tag)
    : "";

  // Create provider instance and return model
  switch (provider.name) {
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model.model_id);
    }
    case "openai": {
      const openai = createOpenAI({ apiKey });
      return openai(model.model_id);
    }
    case "ollama": {
      // Ollama uses OpenAI-compatible API
      const ollamaProvider = createOpenAI({
        baseURL: provider.base_url || "http://localhost:11434/v1",
        apiKey: apiKey || "ollama", // Dummy key for local
      });
      return ollamaProvider(model.model_id);
    }
    default:
      throw new Error(`Provider ${provider.name} not supported`);
  }
}

/**
 * Convert chat messages to model messages format
 * @param {Array} messages
 * @param {string} systemPrompt
 */
function convertToModelMessages(messages, systemPrompt) {
  const result = [];

  // Add system message if present
  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  // Add conversation messages
  messages.forEach((msg) => {
    if (msg.role !== "system") {
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }
  });

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

    const messages = convertToModelMessages(validated.messages, systemPrompt.content);

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
