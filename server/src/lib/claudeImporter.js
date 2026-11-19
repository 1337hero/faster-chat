/**
 * Claude Data Export Format Reference (conversations.json from Anthropic's official export):
 * - Array of conversation objects
 * - Each conversation: { uuid, name, created_at, updated_at, chat_messages }
 * - chat_messages: ordered array of { uuid, text, sender, created_at, content, attachments, files }
 * - sender: "human" | "assistant"
 * - content: array of blocks; { type: "text", text } carries the message text,
 *   other block types (tool_use, tool_result, ...) are not supported here
 */

import { IMPORT_DEFAULT_ROLE } from "@faster-chat/shared";

const SENDER_ROLES = { human: "user", assistant: "assistant" };

export function isClaudeExport(data) {
  const conversations = Array.isArray(data) ? data : [data];
  return conversations.some((conv) => Array.isArray(conv?.chat_messages));
}

export function validateClaudeExport(data) {
  if (!data) {
    return { valid: false, errors: ["Import data is empty"] };
  }

  const conversations = Array.isArray(data) ? data : [data];

  if (conversations.length === 0) {
    return { valid: false, errors: ["No conversations found in import file"] };
  }

  const validCount = conversations.filter((conv) => conv?.chat_messages?.length > 0).length;

  if (validCount === 0) {
    return {
      valid: false,
      errors: ["No valid conversations found (all are empty or missing chat_messages)"],
    };
  }

  return { valid: true, errors: [], conversationCount: validCount };
}

export function parseClaudeExport(data) {
  const conversations = Array.isArray(data) ? data : [data];

  return conversations
    .filter((conv) => conv?.chat_messages?.length > 0)
    .map((conv) => {
      try {
        return parseConversation(conv);
      } catch (error) {
        console.error(`Failed to parse Claude conversation ${conv.uuid}:`, error);
        return null;
      }
    })
    .filter((parsed) => parsed && parsed.messages.length > 0);
}

function parseConversation(conv) {
  let previousCreatedAt = isoToMs(conv.created_at);
  const messages = conv.chat_messages
    .map((message) => {
      previousCreatedAt = parseIsoMs(message.created_at) ?? previousCreatedAt;
      return extractMessage(message, previousCreatedAt);
    })
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt);

  return {
    originalId: conv.uuid,
    title: conv.name?.trim() || "Imported from Claude",
    createdAt: isoToMs(conv.created_at),
    updatedAt: isoToMs(conv.updated_at),
    messages,
  };
}

function extractMessage(message, createdAt) {
  const role = SENDER_ROLES[message.sender] || IMPORT_DEFAULT_ROLE;
  const text = extractText(message);

  if (!text.trim()) {
    return null;
  }

  return {
    role,
    content: text,
    createdAt,
    model: null,
  };
}

function extractText(message) {
  const parts = Array.isArray(message.content)
    ? message.content.map(blockToText).filter(Boolean)
    : [];

  if (parts.length === 0 && typeof message.text === "string") {
    parts.push(message.text);
  }

  for (const attachment of [...(message.attachments || []), ...(message.files || [])]) {
    const name = attachment?.file_name || attachment?.name;
    if (name) {
      parts.push(`[Attachment not imported: ${name}]`);
    }
  }

  return parts.join("\n\n");
}

function blockToText(block) {
  if (block?.type === "text") {
    return typeof block.text === "string" ? block.text : "";
  }
  return `[Unsupported content: ${block?.type || "unknown"}]`;
}

function parseIsoMs(value) {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function isoToMs(value) {
  return parseIsoMs(value) ?? Date.now();
}
