import { Hono } from "hono";
import db, { dbUtils } from "../lib/db.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { IMPORT_CONSTANTS } from "@faster-chat/shared";
import {
  parseChatGPTExport,
  validateChatGPTExport,
  getImportStats,
} from "../lib/chatgptImporter.js";
import { isClaudeExport, parseClaudeExport, validateClaudeExport } from "../lib/claudeImporter.js";

const FORMATS = {
  [IMPORT_CONSTANTS.SOURCES.CHATGPT]: {
    name: "ChatGPT",
    validate: validateChatGPTExport,
    parse: parseChatGPTExport,
    endpoint: IMPORT_CONSTANTS.ENDPOINTS.CHATGPT,
  },
  [IMPORT_CONSTANTS.SOURCES.CLAUDE]: {
    name: "Claude",
    validate: validateClaudeExport,
    parse: parseClaudeExport,
    endpoint: IMPORT_CONSTANTS.ENDPOINTS.CLAUDE,
  },
};

function detectFormat(data) {
  return isClaudeExport(data) ? IMPORT_CONSTANTS.SOURCES.CLAUDE : IMPORT_CONSTANTS.SOURCES.CHATGPT;
}

export const importRouter = new Hono();

importRouter.use("/*", ensureSession);

// ============================================================================
// Helper Functions
// ============================================================================

function validateRequestBody(body) {
  if (!body?.data) {
    return { valid: false, error: "Missing 'data' field in request body" };
  }
  return { valid: true };
}

function validateAndParseExport(data, format) {
  const validation = FORMATS[format].validate(data);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const conversations = FORMATS[format].parse(data);
  if (conversations.length === 0) {
    return {
      success: false,
      errors: ["No valid conversations found to import"],
    };
  }

  return {
    success: true,
    conversations,
    conversationCount: validation.conversationCount,
  };
}

function importConversation(conversation, userId) {
  const chatId = crypto.randomUUID();
  dbUtils.createChat(
    chatId,
    userId,
    conversation.title,
    null,
    conversation.createdAt || Date.now()
  );

  let messageCount = 0;
  let lastCreatedAt = 0;
  for (const message of conversation.messages) {
    const messageId = crypto.randomUUID();
    lastCreatedAt = Math.max(message.createdAt || Date.now(), lastCreatedAt + 1);
    dbUtils.createMessage(
      messageId,
      chatId,
      userId,
      message.role,
      message.content,
      message.model,
      null,
      null,
      lastCreatedAt
    );
    messageCount++;
  }

  if (conversation.updatedAt) {
    dbUtils.updateChatTimestampTo(chatId, conversation.updatedAt);
  }

  return { chatId, messageCount };
}

function buildPreview(conversations) {
  return conversations.map((conv) => ({
    title: conv.title,
    messageCount: conv.messages.length,
    createdAt: conv.createdAt,
    firstMessage:
      conv.messages.length > 0
        ? conv.messages[0].content.substring(0, IMPORT_CONSTANTS.PREVIEW_LENGTH) + "..."
        : "",
  }));
}

// ============================================================================
// Routes
// ============================================================================

function importHandler(format) {
  return async (c) => {
    const user = c.get("user");
    const body = await c.req.json();

    const bodyValidation = validateRequestBody(body);
    if (!bodyValidation.valid) {
      return c.json({ error: bodyValidation.error }, HTTP_STATUS.BAD_REQUEST);
    }

    const parseResult = validateAndParseExport(body.data, format);
    if (!parseResult.success) {
      return c.json(
        { error: `Invalid ${FORMATS[format].name} export format`, details: parseResult.errors },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const importedChatIds = [];
    let totalMessages = 0;

    const importAll = db.transaction(() => {
      for (const conversation of parseResult.conversations) {
        const { chatId, messageCount } = importConversation(conversation, user.id);
        importedChatIds.push(chatId);
        totalMessages += messageCount;
      }
    });
    importAll();

    return c.json(
      {
        success: true,
        imported: {
          conversations: importedChatIds.length,
          messages: totalMessages,
        },
        stats: getImportStats(parseResult.conversations),
        chatIds: importedChatIds,
      },
      HTTP_STATUS.CREATED
    );
  };
}

importRouter.post(
  "/chatgpt",
  requireRole("admin", "member"),
  importHandler(IMPORT_CONSTANTS.SOURCES.CHATGPT)
);

importRouter.post(
  "/claude",
  requireRole("admin", "member"),
  importHandler(IMPORT_CONSTANTS.SOURCES.CLAUDE)
);

importRouter.post("/validate", requireRole("admin", "member"), async (c) => {
  const body = await c.req.json();

  const bodyValidation = validateRequestBody(body);
  if (!bodyValidation.valid) {
    return c.json({ error: bodyValidation.error }, HTTP_STATUS.BAD_REQUEST);
  }

  const format = detectFormat(body.data);
  const parseResult = validateAndParseExport(body.data, format);
  if (!parseResult.success) {
    return c.json({ valid: false, errors: parseResult.errors }, HTTP_STATUS.OK);
  }

  return c.json({
    valid: true,
    format,
    conversationCount: parseResult.conversationCount,
    stats: getImportStats(parseResult.conversations),
    preview: buildPreview(parseResult.conversations),
  });
});

importRouter.get("/formats", async (c) => {
  return c.json({
    formats: Object.entries(FORMATS).map(([id, format]) => ({
      id,
      name: format.name,
      description: `Import conversations from ${format.name} export (JSON)`,
      fileType: IMPORT_CONSTANTS.SUPPORTED_EXTENSION,
      endpoint: format.endpoint,
    })),
  });
});
