import { wrapLanguageModel, generateText } from "ai";
import { MEMORY_EXTRACTION_MAX_FACTS_PER_TURN } from "@faster-chat/shared";
import { getModelInstance } from "./providerFactory.js";

export const MEMORY_EXTRACTION_PROMPT = `Extract factual information about the user from this conversation. Return ONLY a JSON array of short factual strings. Focus on: preferences, personal details, projects, technical stack, communication style, and stated goals. If nothing worth remembering, return an empty array []. Do not include conversation-specific details that won't be relevant in future conversations. Examples: ["prefers Python over JavaScript", "works on a project called FasterChat", "uses Arch Linux", "name is Mike"]. Return ONLY the JSON array, no other text.`;

export const MEMORY_CONTEXT_TEMPLATE = `[Memory - What you remember about this user from previous conversations]
{memories}
[End Memory]
Do not explicitly mention that you have a memory system unless the user asks. Use these memories naturally to personalize your responses.`;

export function formatMemoryContext(memories) {
  const bullets = memories.map((m) => `- ${m.fact}`).join("\n");
  return MEMORY_CONTEXT_TEMPLATE.replace("{memories}", bullets);
}

export function isMemoryEnabledForRequest({
  dbUtils,
  userId,
  chatId = null,
  requestEnabled = true,
}) {
  if (!requestEnabled || !userId) return false;
  if (dbUtils.getMemoryGlobalEnabled() !== "true") return false;
  if (!dbUtils.getUserMemoryEnabled(userId)) return false;
  if (chatId && dbUtils.getChatMemoryDisabled(chatId)) return false;
  return true;
}

export function createMemoryMiddleware(dbUtils) {
  return {
    transformParams: async ({ params }) => {
      const userId = params.providerOptions?.memory?.userId;
      const chatId = params.providerOptions?.memory?.chatId;
      const requestEnabled = params.providerOptions?.memory?.enabled !== false;
      if (!isMemoryEnabledForRequest({ dbUtils, userId, chatId, requestEnabled })) return params;

      const memories = dbUtils.getMemoriesForUser(userId);
      if (!memories.length) return params;

      const memoryBlock = formatMemoryContext(memories);
      const system = params.system ? `${params.system}\n\n${memoryBlock}` : memoryBlock;

      return { ...params, system };
    },
  };
}

export function wrapModelWithMemory(model, dbUtils) {
  return wrapLanguageModel({
    model,
    middleware: createMemoryMiddleware(dbUtils),
  });
}

export async function extractMemories({
  model,
  userMessage,
  assistantMessage,
  userId,
  chatId,
  dbUtils,
}) {
  try {
    const { text } = await generateText({
      model,
      messages: [
        { role: "system", content: MEMORY_EXTRACTION_PROMPT },
        {
          role: "user",
          content: `User message: ${userMessage}\n\nAssistant response: ${assistantMessage}`,
        },
      ],
      maxTokens: 1000,
    });

    const cleaned = text
      .trim()
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "");
    const facts = JSON.parse(cleaned);

    if (Array.isArray(facts) && facts.length > 0) {
      const validFacts = facts.filter((f) => typeof f === "string" && f.trim().length > 0);
      const cappedFacts = validFacts.slice(0, MEMORY_EXTRACTION_MAX_FACTS_PER_TURN);
      if (cappedFacts.length > 0) {
        dbUtils.upsertMemories(userId, cappedFacts, chatId);
      }
    }
  } catch (err) {
    console.warn("Memory extraction failed:", err.message);
  }
}

export function getExtractionModel(dbUtils, decryptApiKey) {
  try {
    const modelId = dbUtils.getMemoryExtractionModel();
    if (!modelId) return null;

    const modelRecord = dbUtils.getEnabledModelWithProvider(modelId);
    if (!modelRecord) return null;

    return getModelInstance(modelRecord, decryptApiKey);
  } catch (err) {
    console.warn("Failed to get extraction model:", err.message);
    return null;
  }
}
