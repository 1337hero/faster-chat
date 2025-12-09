/**
 * ChatGPT Export Format Reference:
 * - conversations.json: Array of conversation objects
 * - Each conversation: { id, title, create_time, mapping }
 * - mapping: Object with message IDs as keys
 * - message node: { id, message, parent, children }
 * - content: message.content.parts contains text
 */

import { IMPORT_VALID_ROLES, IMPORT_DEFAULT_ROLE, unixToMs } from "@faster-chat/shared";

/**
 * Parse ChatGPT export JSON and extract conversations
 */
export function parseChatGPTExport(chatGptData) {
  const conversationList = Array.isArray(chatGptData) ? chatGptData : [chatGptData];

  return conversationList
    .filter((conv) => conv.mapping && Object.keys(conv.mapping).length > 0)
    .map((conv) => {
      try {
        return parseConversation(conv);
      } catch (error) {
        console.error(`Failed to parse conversation ${conv.id}:`, error);
        return null;
      }
    })
    .filter((parsed) => parsed && parsed.messages.length > 0);
}

function parseConversation(conv) {
  const { id, title, create_time, update_time, mapping } = conv;
  const messages = extractMessagesFromMapping(mapping);

  if (messages.length === 0) return null;

  return {
    originalId: id,
    title: title || "Imported from ChatGPT",
    createdAt: unixToMs(create_time),
    updatedAt: unixToMs(update_time),
    messages,
  };
}

/**
 * Extract linear message list from ChatGPT's tree structure.
 * Follows the main conversation thread (first child at each branch).
 */
function extractMessagesFromMapping(mapping) {
  if (!mapping) return [];

  const nodes = Object.values(mapping);
  const rootNode = nodes.find((node) => !node.parent);
  if (!rootNode) return [];

  const messages = [];
  const visited = new Set();
  let currentNode = rootNode;

  while (currentNode && !visited.has(currentNode.id)) {
    visited.add(currentNode.id);

    if (currentNode.message) {
      const message = extractMessage(currentNode.message);
      if (message) messages.push(message);
    }

    // Follow first child (main thread)
    const nextChildId = currentNode.children?.[0];
    currentNode = nextChildId ? mapping[nextChildId] : null;
  }

  return messages;
}

function extractMessage(messageObj) {
  if (!messageObj?.content) return null;

  const { author, create_time, content, metadata } = messageObj;

  // Normalize role - use directly if valid, otherwise default to 'user'
  const role = IMPORT_VALID_ROLES.has(author?.role) ? author.role : IMPORT_DEFAULT_ROLE;

  // Extract text from parts array or direct string
  const text = Array.isArray(content.parts)
    ? content.parts.filter((part) => typeof part === "string").join("\n")
    : typeof content === "string"
      ? content
      : "";

  if (!text.trim()) return null;

  return {
    role,
    content: text,
    createdAt: unixToMs(create_time),
    model: metadata?.model_slug || null,
  };
}

/**
 * Validate ChatGPT export structure
 */
export function validateChatGPTExport(data) {
  if (!data) {
    return { valid: false, errors: ["Import data is empty"] };
  }

  const conversations = Array.isArray(data) ? data : [data];

  if (conversations.length === 0) {
    return { valid: false, errors: ["No conversations found in import file"] };
  }

  const validCount = conversations.filter(
    (conv) => conv.mapping && Object.keys(conv.mapping).length > 0
  ).length;

  if (validCount === 0) {
    return {
      valid: false,
      errors: ["No valid conversations found (all are empty or missing mapping data)"],
    };
  }

  return { valid: true, errors: [], conversationCount: validCount };
}

/**
 * Get import statistics from parsed conversations
 */
export function getImportStats(parsedConversations) {
  return parsedConversations.reduce(
    (stats, conv) => {
      stats.totalMessages += conv.messages.length;
      for (const msg of conv.messages) {
        if (msg.role === "user") stats.userMessages++;
        else if (msg.role === "assistant") stats.assistantMessages++;
        else if (msg.role === "system") stats.systemMessages++;
      }
      return stats;
    },
    {
      conversationCount: parsedConversations.length,
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      systemMessages: 0,
    }
  );
}
