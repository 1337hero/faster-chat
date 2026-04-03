import { describe, test, expect, beforeAll } from "bun:test";
import { randomUUID } from "crypto";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";
import { dbUtils } from "../lib/db.js";

describe("folder routes", () => {
  let app, adminCookie, adminUser, memberCookie, memberUser;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUser = admin.user;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
    memberUser = member.user;
  });

  describe("access control", () => {
    test("GET /api/folders returns 401 without session", async () => {
      const res = await makeRequest(app, "GET", "/api/folders");
      expect(res.status).toBe(401);
    });

    test("POST /api/folders returns 401 without session", async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Test" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/folders", () => {
    test("creates folder with name (returns 201)", async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Work" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.folder).toBeDefined();
      expect(data.folder.name).toBe("Work");
      expect(data.folder.id).toBeDefined();
    });

    test("creates folder with name and color", async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Personal", color: "#ef4444" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.folder.name).toBe("Personal");
      expect(data.folder.color).toBe("#ef4444");
    });

    test("missing name returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: {},
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });

    test("invalid hex color returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Bad Color", color: "red" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/folders", () => {
    test("returns user's folders", async () => {
      const res = await makeRequest(app, "GET", "/api/folders", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.folders)).toBe(true);
      expect(data.folders.length).toBeGreaterThanOrEqual(2);
    });

    test("member sees only their own folders", async () => {
      await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Member Folder" },
        cookie: memberCookie,
      });
      const res = await makeRequest(app, "GET", "/api/folders", { cookie: memberCookie });
      const data = await res.json();
      expect(data.folders.length).toBe(1);
      expect(data.folders[0].name).toBe("Member Folder");
    });
  });

  describe("GET /api/folders/:id", () => {
    let folderId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Specific Folder" },
        cookie: adminCookie,
      });
      const data = await res.json();
      folderId = data.folder.id;
    });

    test("returns specific folder", async () => {
      const res = await makeRequest(app, "GET", `/api/folders/${folderId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.folder.name).toBe("Specific Folder");
    });

    test("other user gets 404", async () => {
      const res = await makeRequest(app, "GET", `/api/folders/${folderId}`, {
        cookie: memberCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/folders/:id", () => {
    let folderId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Update Me", color: "#3b82f6" },
        cookie: adminCookie,
      });
      const data = await res.json();
      folderId = data.folder.id;
    });

    test("updates name", async () => {
      const res = await makeRequest(app, "PUT", `/api/folders/${folderId}`, {
        body: { name: "Updated Name" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.folder.name).toBe("Updated Name");
    });

    test("updates color", async () => {
      const res = await makeRequest(app, "PUT", `/api/folders/${folderId}`, {
        body: { color: "#22c55e" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.folder.color).toBe("#22c55e");
    });

    test("updates position", async () => {
      const res = await makeRequest(app, "PUT", `/api/folders/${folderId}`, {
        body: { position: 5 },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.folder.position).toBe(5);
    });

    test("non-existent folder returns 404", async () => {
      const res = await makeRequest(app, "PUT", `/api/folders/${randomUUID()}`, {
        body: { name: "Nope" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/folders/:id", () => {
    let folderId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Delete Me" },
        cookie: adminCookie,
      });
      const data = await res.json();
      folderId = data.folder.id;
    });

    test("deletes folder", async () => {
      const res = await makeRequest(app, "DELETE", `/api/folders/${folderId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("non-existent folder returns 404", async () => {
      const res = await makeRequest(app, "DELETE", `/api/folders/${randomUUID()}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("chat organization", () => {
    let folderId, chatId;

    beforeAll(async () => {
      const folderRes = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Chat Folder" },
        cookie: adminCookie,
      });
      folderId = (await folderRes.json()).folder.id;

      chatId = randomUUID();
      dbUtils.createChat(chatId, adminUser.id, "Test Chat");
    });

    test("PUT /api/folders/:folderId/chats/:chatId moves chat to folder", async () => {
      const res = await makeRequest(app, "PUT", `/api/folders/${folderId}/chats/${chatId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.chat).toBeDefined();
      expect(data.chat.folder_id).toBe(folderId);
    });

    test("GET /api/folders/:id/chats returns chats in folder", async () => {
      const res = await makeRequest(app, "GET", `/api/folders/${folderId}/chats`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.chats)).toBe(true);
      expect(data.chats.length).toBe(1);
      expect(data.chats[0].id).toBe(chatId);
    });
  });

  describe("POST /api/folders/:id/toggle", () => {
    let folderId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/folders", {
        body: { name: "Toggle Folder" },
        cookie: adminCookie,
      });
      folderId = (await res.json()).folder.id;
    });

    test("flips collapsed state", async () => {
      const res1 = await makeRequest(app, "POST", `/api/folders/${folderId}/toggle`, {
        cookie: adminCookie,
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.folder.is_collapsed).toBe(1);

      const res2 = await makeRequest(app, "POST", `/api/folders/${folderId}/toggle`, {
        cookie: adminCookie,
      });
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2.folder.is_collapsed).toBe(0);
    });

    test("non-existent folder returns 404", async () => {
      const res = await makeRequest(app, "POST", `/api/folders/${randomUUID()}/toggle`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });
});
