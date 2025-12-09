import { Hono } from "hono";
import { dbUtils } from "../lib/db.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import {
  parseChatGPTExport,
  validateChatGPTExport,
  getImportStats,
} from "../lib/chatgptImporter.js";

export const importRouter = new Hono();

importRouter.use("/*", ensureSession);

/**
 * POST /api/import/chatgpt
 * Import conversations from ChatGPT export JSON
 *
 * Expected request body:
 * {
 *   data: <ChatGPT export JSON object or array>
 * }
 *
 * Returns:
 * {
 *   success: true,
 *   imported: {
 *     conversations: number,
 *     messages: number
 *   },
 *   chatIds: string[] // IDs of imported chats
 * }
 */
importRouter.post("/chatgpt", requireRole("admin", "member"), async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Validate request
    if (!body.data) {
      return c.json({ error: "Missing 'data' field in request body" }, HTTP_STATUS.BAD_REQUEST);
    }

    // Validate ChatGPT export structure
    const validation = validateChatGPTExport(body.data);
    if (!validation.valid) {
      return c.json(
        {
          error: "Invalid ChatGPT export format",
          details: validation.errors,
        },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Parse conversations
    const parsedConversations = parseChatGPTExport(body.data);

    if (parsedConversations.length === 0) {
      return c.json({ error: "No valid conversations found to import" }, HTTP_STATUS.BAD_REQUEST);
    }

    // Get import statistics
    const stats = getImportStats(parsedConversations);

    // Import conversations into database
    const importedChatIds = [];
    let totalMessages = 0;

    for (const conversation of parsedConversations) {
      try {
        // Create chat with original title
        const chatId = crypto.randomUUID();
        const chat = dbUtils.createChat(chatId, user.id, conversation.title);

        // Import messages
        for (const message of conversation.messages) {
          const messageId = crypto.randomUUID();
          dbUtils.createMessage(
            messageId,
            chatId,
            user.id,
            message.role,
            message.content,
            message.model, // May be null
            null // No file attachments from ChatGPT imports
          );
          totalMessages++;
        }

        // Update chat timestamp to match original
        if (conversation.updatedAt) {
          dbUtils.updateChatTimestampTo(chatId, conversation.updatedAt);
        }

        importedChatIds.push(chatId);
      } catch (error) {
        console.error(`Failed to import conversation "${conversation.title}":`, error);
        // Continue with other conversations
      }
    }

    // Return success response
    return c.json(
      {
        success: true,
        imported: {
          conversations: importedChatIds.length,
          messages: totalMessages,
        },
        stats,
        chatIds: importedChatIds,
      },
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error("ChatGPT import error:", error);
    return c.json(
      {
        error: "Failed to import conversations",
        details: error.message,
      },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * POST /api/import/validate
 * Validate a ChatGPT export file without importing
 *
 * Returns preview of what would be imported
 */
importRouter.post("/validate", requireRole("admin", "member"), async (c) => {
  try {
    const body = await c.req.json();

    if (!body.data) {
      return c.json({ error: "Missing 'data' field in request body" }, HTTP_STATUS.BAD_REQUEST);
    }

    // Validate structure
    const validation = validateChatGPTExport(body.data);
    if (!validation.valid) {
      return c.json(
        {
          valid: false,
          errors: validation.errors,
        },
        HTTP_STATUS.OK
      );
    }

    // Parse to get preview
    const parsedConversations = parseChatGPTExport(body.data);
    const stats = getImportStats(parsedConversations);

    // Return preview of conversations
    const preview = parsedConversations.map((conv) => ({
      title: conv.title,
      messageCount: conv.messages.length,
      createdAt: conv.createdAt,
      firstMessage:
        conv.messages.length > 0 ? conv.messages[0].content.substring(0, 100) + "..." : "",
    }));

    return c.json({
      valid: true,
      conversationCount: validation.conversationCount,
      stats,
      preview,
    });
  } catch (error) {
    console.error("Validation error:", error);
    return c.json(
      {
        valid: false,
        errors: ["Failed to validate file: " + error.message],
      },
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
        id: "chatgpt",
        name: "ChatGPT",
        description: "Import conversations from ChatGPT export (JSON)",
        fileType: ".json",
        endpoint: "/api/import/chatgpt",
      },
    ],
  });
});
