import { Hono } from "hono";
import { dbUtils } from "../lib/db.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { IMPORT_CONSTANTS } from "@faster-chat/shared";
import {
  parseChatGPTExport,
  validateChatGPTExport,
  getImportStats,
} from "../lib/chatgptImporter.js";

export const importRouter = new Hono();

importRouter.use("/*", ensureSession);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate that request body contains the required 'data' field
 */
function validateRequestBody(body) {
  if (!body?.data) {
    return { valid: false, error: "Missing 'data' field in request body" };
  }
  return { valid: true };
}

/**
 * Validate and parse ChatGPT export data
 * Returns either parsed conversations or validation errors
 */
function validateAndParseExport(data) {
  const validation = validateChatGPTExport(data);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
    };
  }

  const conversations = parseChatGPTExport(data);
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

/**
 * Import a single conversation into the database
 * Returns the chat ID on success, throws on failure
 */
function importConversation(conversation, userId) {
  const chatId = crypto.randomUUID();
  dbUtils.createChat(chatId, userId, conversation.title);

  let messageCount = 0;
  for (const message of conversation.messages) {
    const messageId = crypto.randomUUID();
    dbUtils.createMessage(
      messageId,
      chatId,
      userId,
      message.role,
      message.content,
      message.model,
      null // No file attachments from ChatGPT imports
    );
    messageCount++;
  }

  // Preserve original timestamp
  if (conversation.updatedAt) {
    dbUtils.updateChatTimestampTo(chatId, conversation.updatedAt);
  }

  return { chatId, messageCount };
}

/**
 * Build preview data for validation response
 */
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

/**
 * POST /api/import/chatgpt
 * Import conversations from ChatGPT export JSON
 */
importRouter.post("/chatgpt", requireRole("admin", "member"), async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Validate request body
    const bodyValidation = validateRequestBody(body);
    if (!bodyValidation.valid) {
      return c.json({ error: bodyValidation.error }, HTTP_STATUS.BAD_REQUEST);
    }

    // Validate and parse export
    const parseResult = validateAndParseExport(body.data);
    if (!parseResult.success) {
      return c.json(
        { error: "Invalid ChatGPT export format", details: parseResult.errors },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Import each conversation
    const importedChatIds = [];
    let totalMessages = 0;

    for (const conversation of parseResult.conversations) {
      try {
        const { chatId, messageCount } = importConversation(conversation, user.id);
        importedChatIds.push(chatId);
        totalMessages += messageCount;
      } catch (error) {
        console.error("[Import] Failed to import conversation:", {
          title: conversation.title,
          originalId: conversation.originalId,
          messageCount: conversation.messages.length,
          error: error.message,
        });
        // Continue with remaining conversations
      }
    }

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
  } catch (error) {
    console.error("[Import] ChatGPT import failed:", {
      error: error.message,
      stack: error.stack,
    });
    return c.json(
      { error: "Failed to import conversations", details: error.message },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /api/import/validate
 * Validate a ChatGPT export file without importing
 */
importRouter.post("/validate", requireRole("admin", "member"), async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const bodyValidation = validateRequestBody(body);
    if (!bodyValidation.valid) {
      return c.json({ error: bodyValidation.error }, HTTP_STATUS.BAD_REQUEST);
    }

    // Validate and parse export
    const parseResult = validateAndParseExport(body.data);
    if (!parseResult.success) {
      return c.json({ valid: false, errors: parseResult.errors }, HTTP_STATUS.OK);
    }

    return c.json({
      valid: true,
      conversationCount: parseResult.conversationCount,
      stats: getImportStats(parseResult.conversations),
      preview: buildPreview(parseResult.conversations),
    });
  } catch (error) {
    console.error("[Import] Validation failed:", {
      error: error.message,
      stack: error.stack,
    });
    return c.json(
      { valid: false, errors: ["Failed to validate file: " + error.message] },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /api/import/formats
 * List supported import formats
 */
importRouter.get("/formats", async (c) => {
  return c.json({
    formats: [
      {
        id: IMPORT_CONSTANTS.SOURCES.CHATGPT,
        name: "ChatGPT",
        description: "Import conversations from ChatGPT export (JSON)",
        fileType: IMPORT_CONSTANTS.SUPPORTED_EXTENSION,
        endpoint: IMPORT_CONSTANTS.ENDPOINTS.CHATGPT,
      },
    ],
  });
});
