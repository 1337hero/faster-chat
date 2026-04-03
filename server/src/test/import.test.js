import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";

const validConversation = {
  title: "My conversation",
  create_time: 1700000000,
  update_time: 1700001000,
  mapping: {
    "node-1": {
      message: {
        author: { role: "user" },
        content: { parts: ["Hello there"] },
        create_time: 1700000000,
      },
      parent: null,
      children: ["node-2"],
    },
    "node-2": {
      message: {
        author: { role: "assistant" },
        content: { parts: ["Hi! How can I help?"] },
        create_time: 1700000500,
      },
      parent: "node-1",
      children: [],
    },
  },
};

const secondConversation = {
  title: "Another chat",
  create_time: 1700002000,
  update_time: 1700003000,
  mapping: {
    "node-a": {
      message: {
        author: { role: "user" },
        content: { parts: ["What is 2+2?"] },
        create_time: 1700002000,
      },
      parent: null,
      children: ["node-b"],
    },
    "node-b": {
      message: {
        author: { role: "assistant" },
        content: { parts: ["4"] },
        create_time: 1700002500,
      },
      parent: "node-a",
      children: [],
    },
  },
};

describe("import routes", () => {
  let app, adminCookie, memberCookie;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
  });

  describe("POST /api/import/validate", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "POST", "/api/import/validate", {
        body: { data: [validConversation] },
      });
      expect(res.status).toBe(401);
    });

    test("missing data field returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/import/validate", {
        body: {},
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });

    test("valid ChatGPT export returns valid=true with conversationCount and preview", async () => {
      const res = await makeRequest(app, "POST", "/api/import/validate", {
        body: { data: [validConversation] },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
      expect(data.conversationCount).toBe(1);
      expect(Array.isArray(data.preview)).toBe(true);
      expect(data.preview.length).toBe(1);
      expect(data.preview[0].title).toBe("My conversation");
      expect(data.preview[0].messageCount).toBeGreaterThanOrEqual(1);
      expect(data.stats).toBeDefined();
    });

    test("invalid/malformed data returns valid=false with errors", async () => {
      const res = await makeRequest(app, "POST", "/api/import/validate", {
        body: { data: "not-an-array" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(Array.isArray(data.errors)).toBe(true);
      expect(data.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("POST /api/import/chatgpt", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "POST", "/api/import/chatgpt", {
        body: { data: [validConversation] },
      });
      expect(res.status).toBe(401);
    });

    test("valid data returns 201 with imported conversation/message counts", async () => {
      const res = await makeRequest(app, "POST", "/api/import/chatgpt", {
        body: { data: [validConversation] },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.imported.conversations).toBe(1);
      expect(data.imported.messages).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.chatIds)).toBe(true);
      expect(data.chatIds.length).toBe(1);
      expect(data.stats).toBeDefined();
    });

    test("multiple conversations imports all of them", async () => {
      const res = await makeRequest(app, "POST", "/api/import/chatgpt", {
        body: { data: [validConversation, secondConversation] },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.imported.conversations).toBe(2);
      expect(data.chatIds.length).toBe(2);
    });

    test("missing data field returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/import/chatgpt", {
        body: {},
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/import/formats", () => {
    test("returns array of supported formats including chatgpt", async () => {
      const res = await makeRequest(app, "GET", "/api/import/formats", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.formats)).toBe(true);
      expect(data.formats.length).toBeGreaterThanOrEqual(1);
      const chatgptFormat = data.formats.find((f) => f.id === "chatgpt");
      expect(chatgptFormat).toBeDefined();
      expect(chatgptFormat.name).toBe("ChatGPT");
      expect(chatgptFormat.fileType).toBeDefined();
      expect(chatgptFormat.endpoint).toBeDefined();
    });
  });

  describe("member access", () => {
    test("member can validate imports", async () => {
      const res = await makeRequest(app, "POST", "/api/import/validate", {
        body: { data: [validConversation] },
        cookie: memberCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.valid).toBe(true);
    });

    test("member can import conversations", async () => {
      const res = await makeRequest(app, "POST", "/api/import/chatgpt", {
        body: { data: [validConversation] },
        cookie: memberCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.imported.conversations).toBe(1);
    });
  });
});
