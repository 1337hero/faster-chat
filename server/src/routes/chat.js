import { config } from 'dotenv';
import { Hono } from 'hono';
import { z } from 'zod';
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { ollama } from 'ollama-ai-provider';
import {
  ModelRegistry,
  getSystemPrompt,
} from '@faster-chat/shared';

// Ensure environment variables are loaded even when this module is imported before index config()
config();

// Request validation schema
const ChatRequestSchema = z.object({
  model: z.string(),
  systemPromptId: z.string().default('default'),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
});

// Initialize providers
const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const chatRouter = new Hono();

/**
 * Get the appropriate model based on provider
 * @param {string} modelId
 */
function getModel(modelId) {
  const config = ModelRegistry[modelId];
  if (!config) {
    throw new Error(`Model ${modelId} not found`);
  }

  const actualModelId = config.modelId || modelId;

  switch (config.provider) {
    case 'anthropic':
      return anthropic(actualModelId);
    case 'openai':
      return openai(actualModelId);
    case 'ollama':
      return ollama(actualModelId);
    default:
      throw new Error(`Provider ${config.provider} not supported`);
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
    result.push({ role: 'system', content: systemPrompt });
  }

  // Add conversation messages
  messages.forEach(msg => {
    if (msg.role !== 'system') {
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }
  });

  return result;
}

// Main chat endpoint
chatRouter.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const validated = ChatRequestSchema.parse(body);

    const modelId = validated.model;
    const model = getModel(modelId);
    const systemPrompt = getSystemPrompt(validated.systemPromptId);

    const messages = convertToModelMessages(
      validated.messages,
      systemPrompt.content
    );

    const stream = await streamText({
      model,
      messages,
      maxTokens: 4096,
    });

    // Return the stream as a response
    return stream.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat error:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500
    );
  }
});

// Resume endpoint (stub for now)
chatRouter.get('/chat/:id/stream', async (c) => {
  // Return 204 No Content for now
  // TODO: Implement real resume functionality with persistence
  return c.body(null, 204);
});
