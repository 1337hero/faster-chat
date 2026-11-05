import { describe, test, expect, beforeAll, beforeEach } from "bun:test";
import claudeExport from "./fixtures/claude-export.json";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
  db,
} from "./helpers.js";
import { parseClaudeExport, validateClaudeExport } from "../lib/claudeImporter.js";

function countRows(table) {
  return db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
}

describe("claudeImporter", () => {
  test("parses titles, roles, and message order from a real-shaped export", () => {
    const conversations = parseClaudeExport(claudeExport);

    expect(conversations.map((c) => c.title)).toEqual([
      "Planning a trip to Lisbon",
      "Imported from Claude",
    ]);

    const lisbon = conversations[0];
    expect(lisbon.messages.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(lisbon.messages[0].content).toBe("Help me plan three days in Lisbon in April.");
    expect(lisbon.messages[1].content).toContain("```text");
    expect(lisbon.createdAt).toBe(Date.parse("2025-03-10T14:02:11.512345Z"));
    expect(lisbon.messages[2].createdAt).toBe(Date.parse("2025-03-10T14:08:00.000000Z"));
  });

  test("unsupported blocks become placeholders and the message still imports", () => {
    const [lisbon] = parseClaudeExport(claudeExport);
    const last = lisbon.messages[3].content;

    expect(last).toContain("[Unsupported content: tool_use]");
    expect(last).toContain("[Unsupported content: tool_result]");
    expect(last).toContain("Mild: around 18°C by day, with some rain.");
  });

  test("attachments are flagged, not imported", () => {
    const [, report] = parseClaudeExport(claudeExport);
    expect(report.messages[0].content).toContain("[Attachment not imported: q4-report.pdf]");
  });

  test("falls back to the text field when content blocks are missing", () => {
    const [conv] = parseClaudeExport([
      {
        uuid: "x",
        name: "Old shape",
        created_at: "2024-01-01T00:00:00Z",
        chat_messages: [
          { sender: "human", text: "plain text only", created_at: "2024-01-01T00:00:00Z" },
        ],
      },
    ]);
    expect(conv.messages[0].content).toBe("plain text only");
  });

  test("validation rejects data without chat_messages", () => {
    expect(validateClaudeExport([{ uuid: "a", name: "no messages" }]).valid).toBe(false);
    expect(validateClaudeExport(null).valid).toBe(false);
    expect(validateClaudeExport(claudeExport)).toEqual({
      valid: true,
      errors: [],
      conversationCount: 2,
    });
  });
});

describe("import routes (Claude)", () => {
  let app, adminCookie, memberCookie;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
  });

  beforeEach(() => {
    db.exec("DELETE FROM messages");
    db.exec("DELETE FROM chats");
  });

  test("validate detects the Claude format and previews it", async () => {
    const res = await makeRequest(app, "POST", "/api/import/validate", {
      body: { data: claudeExport },
      cookie: memberCookie,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.format).toBe("claude");
    expect(data.conversationCount).toBe(2);
    expect(data.preview[0].title).toBe("Planning a trip to Lisbon");
    expect(data.stats.totalMessages).toBe(6);
    expect(countRows("chats")).toBe(0);
  });

  test("validate still reports chatgpt for a ChatGPT export", async () => {
    const res = await makeRequest(app, "POST", "/api/import/validate", {
      body: {
        data: [
          {
            title: "gpt",
            mapping: {
              a: {
                message: { author: { role: "user" }, content: { parts: ["hi"] } },
                children: [],
              },
            },
          },
        ],
      },
      cookie: memberCookie,
    });
    const data = await res.json();
    expect(data.valid).toBe(true);
    expect(data.format).toBe("chatgpt");
  });

  test("POST /api/import/claude imports with correct titles, order, and roles", async () => {
    const res = await makeRequest(app, "POST", "/api/import/claude", {
      body: { data: claudeExport },
      cookie: memberCookie,
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.imported).toEqual({ conversations: 2, messages: 6 });

    const chatRes = await makeRequest(app, "GET", `/api/chats/${data.chatIds[0]}`, {
      cookie: memberCookie,
    });
    const chat = await chatRes.json();
    expect(chat.title).toBe("Planning a trip to Lisbon");
    expect(chat.createdAt).toBe(Date.parse("2025-03-10T14:02:11.512345Z"));

    const messagesRes = await makeRequest(app, "GET", `/api/chats/${data.chatIds[0]}/messages`, {
      cookie: memberCookie,
    });
    const { messages } = await messagesRes.json();
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(messages[0].content).toBe("Help me plan three days in Lisbon in April.");
    expect(messages[3].content).toContain("[Unsupported content: tool_use]");
  });

  test("imported messages keep their original timestamps in order", async () => {
    const res = await makeRequest(app, "POST", "/api/import/claude", {
      body: { data: [claudeExport[0]] },
      cookie: memberCookie,
    });
    const { chatIds } = await res.json();
    const rows = db
      .prepare("SELECT created_at FROM messages WHERE chat_id = ? ORDER BY created_at")
      .all(chatIds[0]);
    expect(rows.map((r) => r.created_at)).toEqual([
      Date.parse("2025-03-10T14:02:11.512345Z"),
      Date.parse("2025-03-10T14:02:30.100000Z"),
      Date.parse("2025-03-10T14:08:00.000000Z"),
      Date.parse("2025-03-10T14:09:48.001234Z"),
    ]);
  });

  test("malformed file is rejected before any DB write", async () => {
    const res = await makeRequest(app, "POST", "/api/import/claude", {
      body: { data: [{ uuid: "broken", name: "no messages" }] },
      cookie: memberCookie,
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid Claude export format");
    expect(countRows("chats")).toBe(0);
    expect(countRows("messages")).toBe(0);
  });

  test("returns 401 without auth", async () => {
    const res = await makeRequest(app, "POST", "/api/import/claude", {
      body: { data: claudeExport },
    });
    expect(res.status).toBe(401);
  });

  test("GET /api/import/formats lists both formats", async () => {
    const res = await makeRequest(app, "GET", "/api/import/formats", { cookie: memberCookie });
    const { formats } = await res.json();
    expect(formats.map((f) => f.id)).toEqual(["chatgpt", "claude"]);
    expect(formats[1].endpoint).toBe("/api/import/claude");
  });
});
