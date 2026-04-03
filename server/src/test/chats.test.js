import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";

describe("chat routes", () => {
  let app, adminCookie, memberCookie;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
  });

  describe("auth guard", () => {
    test("GET /api/chats returns 401 without cookie", async () => {
      const res = await makeRequest(app, "GET", "/api/chats");
      expect(res.status).toBe(401);
    });

    test("POST /api/chats returns 401 without cookie", async () => {
      const res = await makeRequest(app, "POST", "/api/chats", {
        body: { title: "test" },
      });
      expect(res.status).toBe(401);
    });

    test("GET /api/chats/:chatId returns 401 without cookie", async () => {
      const res = await makeRequest(app, "GET", "/api/chats/some-id");
      expect(res.status).toBe(401);
    });
  });

  describe("chat CRUD", () => {
    let chatId;

    test("POST /api/chats creates chat with 201", async () => {
      const res = await makeRequest(app, "POST", "/api/chats", {
        body: {},
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.createdAt).toBeDefined();
      chatId = data.id;
    });

    test("POST /api/chats with title sets the title", async () => {
      const res = await makeRequest(app, "POST", "/api/chats", {
        body: { title: "My Chat" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.title).toBe("My Chat");
    });

    test("GET /api/chats returns user's chats", async () => {
      const res = await makeRequest(app, "GET", "/api/chats", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.chats)).toBe(true);
      expect(data.chats.length).toBeGreaterThanOrEqual(1);
    });

    test("GET /api/chats does NOT return other user's chats", async () => {
      // Admin already has chats; member should see none
      const res = await makeRequest(app, "GET", "/api/chats", {
        cookie: memberCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.chats.length).toBe(0);
    });

    test("GET /api/chats/:chatId returns specific chat", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chatId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(chatId);
    });

    test("GET /api/chats/:chatId for other user's chat returns 404", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chatId}`, {
        cookie: memberCookie,
      });
      expect(res.status).toBe(404);
    });

    test("PATCH /api/chats/:chatId updates title", async () => {
      const res = await makeRequest(app, "PATCH", `/api/chats/${chatId}`, {
        body: { title: "Updated Title" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.title).toBe("Updated Title");
    });

    test("DELETE /api/chats/:chatId soft-deletes", async () => {
      // Create a chat to delete
      const createRes = await makeRequest(app, "POST", "/api/chats", {
        body: { title: "To Delete" },
        cookie: adminCookie,
      });
      const { id: deleteId } = await createRes.json();

      const delRes = await makeRequest(app, "DELETE", `/api/chats/${deleteId}`, {
        cookie: adminCookie,
      });
      expect(delRes.status).toBe(200);

      // Should no longer appear in list
      const listRes = await makeRequest(app, "GET", "/api/chats", {
        cookie: adminCookie,
      });
      const listData = await listRes.json();
      const found = listData.chats.find((c) => c.id === deleteId);
      expect(found).toBeUndefined();
    });
  });

  describe("messages", () => {
    let chatId, messageId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/chats", {
        body: { title: "Message Test Chat" },
        cookie: adminCookie,
      });
      const data = await res.json();
      chatId = data.id;
    });

    test("POST /api/chats/:chatId/messages adds message with 201", async () => {
      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
        body: { role: "user", content: "Hello world" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.role).toBe("user");
      expect(data.content).toBe("Hello world");
      messageId = data.id;
    });

    test("POST /api/chats/:chatId/messages accepts assistant message with null metadata", async () => {
      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
        body: { role: "assistant", content: "Sure, here you go.", model: "gpt-4o", metadata: null },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.role).toBe("assistant");
      expect(data.metadata).toBeNull();
    });

    test("POST /api/chats/:chatId/messages accepts assistant message with metadata object", async () => {
      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
        body: {
          role: "assistant",
          content: "Search results below.",
          model: "gpt-4o",
          metadata: { toolParts: [{ type: "tool-invocation", toolName: "web_search" }] },
        },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.metadata).toEqual({
        toolParts: [{ type: "tool-invocation", toolName: "web_search" }],
      });
    });

    test("GET /api/chats/:chatId/messages returns messages", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chatId}/messages`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.messages)).toBe(true);
      expect(data.messages.length).toBeGreaterThanOrEqual(1);
      expect(data.messages[0].content).toBe("Hello world");
    });

    test("DELETE /api/chats/:chatId/messages/:messageId removes message", async () => {
      const delRes = await makeRequest(
        app,
        "DELETE",
        `/api/chats/${chatId}/messages/${messageId}`,
        {
          cookie: adminCookie,
        }
      );
      expect(delRes.status).toBe(200);

      const listRes = await makeRequest(app, "GET", `/api/chats/${chatId}/messages`, {
        cookie: adminCookie,
      });
      const listData = await listRes.json();
      const found = listData.messages.find((m) => m.id === messageId);
      expect(found).toBeUndefined();
    });
  });

  describe("pin/archive", () => {
    let chatId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/chats", {
        body: { title: "Pin Archive Test" },
        cookie: adminCookie,
      });
      const data = await res.json();
      chatId = data.id;
    });

    test("POST /api/chats/:chatId/pin pins the chat", async () => {
      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/pin`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
    });

    test("DELETE /api/chats/:chatId/pin unpins the chat", async () => {
      const res = await makeRequest(app, "DELETE", `/api/chats/${chatId}/pin`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
    });

    test("POST /api/chats/:chatId/archive archives the chat", async () => {
      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/archive`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
    });

    test("DELETE /api/chats/:chatId/archive unarchives the chat", async () => {
      const res = await makeRequest(app, "DELETE", `/api/chats/${chatId}/archive`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
    });
  });

  describe("cross-user access", () => {
    let adminChatId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/chats", {
        body: { title: "Admin Only Chat" },
        cookie: adminCookie,
      });
      const data = await res.json();
      adminChatId = data.id;

      await makeRequest(app, "POST", `/api/chats/${adminChatId}/messages`, {
        body: { role: "user", content: "Secret message" },
        cookie: adminCookie,
      });
    });

    test("member cannot get admin's chat messages", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${adminChatId}/messages`, {
        cookie: memberCookie,
      });
      expect(res.status).toBe(404);
    });

    test("member cannot delete admin's chat", async () => {
      const res = await makeRequest(app, "DELETE", `/api/chats/${adminChatId}`, {
        cookie: memberCookie,
      });
      expect(res.status).toBe(404);
    });

    test("member cannot delete admin's message", async () => {
      const messagesRes = await makeRequest(app, "GET", `/api/chats/${adminChatId}/messages`, {
        cookie: adminCookie,
      });
      const messages = await messagesRes.json();
      const messageId = messages.messages[0].id;

      const res = await makeRequest(
        app,
        "DELETE",
        `/api/chats/${adminChatId}/messages/${messageId}`,
        {
          cookie: memberCookie,
        }
      );
      expect(res.status).toBe(404);
    });
  });

  describe("memory toggle", () => {
    let chatId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/chats", {
        body: { title: "Memory Test" },
        cookie: adminCookie,
      });
      chatId = (await res.json()).id;
    });

    test("PUT /api/chats/:chatId/memory disables memory", async () => {
      const res = await makeRequest(app, "PUT", `/api/chats/${chatId}/memory`, {
        body: { disabled: true },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.disabled).toBe(true);
    });

    test("PUT /api/chats/:chatId/memory re-enables memory", async () => {
      const res = await makeRequest(app, "PUT", `/api/chats/${chatId}/memory`, {
        body: { disabled: false },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.disabled).toBe(false);
    });

    test("PUT /api/chats/:chatId/memory rejects non-boolean", async () => {
      const res = await makeRequest(app, "PUT", `/api/chats/${chatId}/memory`, {
        body: { disabled: "yes" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });

    test("PUT /api/chats/:chatId/memory returns 404 for other user's chat", async () => {
      const res = await makeRequest(app, "PUT", `/api/chats/${chatId}/memory`, {
        body: { disabled: true },
        cookie: memberCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("pagination", () => {
    test("GET /api/chats supports limit and offset", async () => {
      const res = await makeRequest(app, "GET", "/api/chats?limit=2&offset=0", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.limit).toBe(2);
      expect(data.offset).toBe(0);
      expect(data.chats.length).toBeLessThanOrEqual(2);
    });
  });
});
