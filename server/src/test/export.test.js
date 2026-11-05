import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestApp,
  resetDatabase,
  createTestUser,
  getAuthCookie,
  makeRequest,
} from "./helpers.js";
import { dbUtils } from "../lib/db.js";

const CODE_CONTENT = "Here you go:\n\n```js\nconsole.log('hi');\n```\n\nAnd $E = mc^2$.";

describe("chat export", () => {
  let app, alice, aliceCookie, bob, bobCookie, reader, readerCookie;
  let folder, chat, archivedChat, readerChat, fileId;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();

    alice = await createTestUser({ username: "alice", password: "alicepass123" });
    aliceCookie = await getAuthCookie(app, alice);
    bob = await createTestUser({ username: "bob", password: "bobpass12345" });
    bobCookie = await getAuthCookie(app, bob);
    reader = await createTestUser({
      username: "reader",
      password: "readerpass123",
      role: "readonly",
    });
    readerCookie = await getAuthCookie(app, reader);

    folder = dbUtils.createFolder("folder-1", alice.id, "Work", "#ff0000", 2);
    chat = dbUtils.createChat("chat-1", alice.id, "Code chat", folder.id);
    dbUtils.pinChat(chat.id, alice.id);
    dbUtils.createMessage("m-1", chat.id, alice.id, "user", "Show me code", "gpt-4o");
    fileId = "file-1";
    dbUtils.createFile(fileId, alice.id, "notes.txt", "stored.txt", "/tmp/x", "text/plain", 42);
    dbUtils.createMessage("m-2", chat.id, alice.id, "assistant", CODE_CONTENT, "gpt-4o", [fileId], {
      tokens: 12,
    });

    archivedChat = dbUtils.createChat("chat-2", alice.id, "Old chat");
    dbUtils.archiveChat(archivedChat.id, alice.id);
    dbUtils.createMessage("m-3", archivedChat.id, alice.id, "user", "old");

    const deleted = dbUtils.createChat("chat-3", alice.id, "Gone");
    dbUtils.softDeleteChatByUser(deleted.id, alice.id);

    dbUtils.createChat("chat-bob", bob.id, "Bob's chat");

    readerChat = dbUtils.createChat("chat-reader", reader.id, "Reader chat");
    dbUtils.createMessage("m-r", readerChat.id, reader.id, "user", "hello");
  });

  describe("single chat JSON", () => {
    test("returns versioned shape with folder, state, and attachment manifest", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chat.id}/export?format=json`, {
        cookie: aliceCookie,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
      expect(res.headers.get("content-disposition")).toBe(
        "attachment; filename=\"code-chat.json\"; filename*=UTF-8''Code%20chat.json"
      );

      const data = await res.json();
      expect(data.version).toBe(1);
      expect(data.source).toBe("faster-chat");
      expect(typeof data.exportedAt).toBe("number");
      expect(data.folders).toEqual([
        { id: "folder-1", name: "Work", color: "#ff0000", position: 2 },
      ]);
      expect(data.chats).toHaveLength(1);

      const exported = data.chats[0];
      expect(exported.id).toBe(chat.id);
      expect(exported.title).toBe("Code chat");
      expect(exported.folderId).toBe(folder.id);
      expect(exported.pinnedAt).toBeGreaterThan(0);
      expect(exported.archivedAt).toBeNull();
      expect(exported.memoryDisabled).toBe(false);
      expect(exported.messages.map((m) => m.id)).toEqual(["m-1", "m-2"]);

      const [first, second] = exported.messages;
      expect(first.attachments).toEqual([]);
      expect(first.metadata).toBeNull();
      expect(second.role).toBe("assistant");
      expect(second.content).toBe(CODE_CONTENT);
      expect(second.model).toBe("gpt-4o");
      expect(second.metadata).toEqual({ tokens: 12 });
      expect(second.attachments).toEqual([
        { fileId, filename: "notes.txt", mimeType: "text/plain", size: 42 },
      ]);
    });

    test("defaults to json when no format is given", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chat.id}/export`, {
        cookie: aliceCookie,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");
    });

    test("keeps a non-latin title in the filename* parameter", async () => {
      const jp = dbUtils.createChat("chat-jp", alice.id, "日本語");
      dbUtils.createMessage("m-jp", jp.id, alice.id, "user", "こんにちは");
      const res = await makeRequest(app, "GET", `/api/chats/${jp.id}/export`, {
        cookie: aliceCookie,
      });
      expect(res.headers.get("content-disposition")).toBe(
        "attachment; filename=\"chat.json\"; filename*=UTF-8''%E6%97%A5%E6%9C%AC%E8%AA%9E.json"
      );
      dbUtils.softDeleteChatByUser(jp.id, alice.id);
    });

    test("truncates the filename* title by code point, not UTF-16 unit", async () => {
      const emoji = dbUtils.createChat("chat-emoji", alice.id, "a".repeat(59) + "😀 tail");
      dbUtils.createMessage("m-emoji", emoji.id, alice.id, "user", "hi");
      const res = await makeRequest(app, "GET", `/api/chats/${emoji.id}/export?format=markdown`, {
        cookie: aliceCookie,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-disposition")).toBe(
        `attachment; filename="${"a".repeat(59)}.md"; filename*=UTF-8''${"a".repeat(59)}%F0%9F%98%80.md`
      );
      dbUtils.softDeleteChatByUser(emoji.id, alice.id);
    });

    test("a chat with no messages is 404 in both formats", async () => {
      const empty = dbUtils.createChat("chat-empty-single", alice.id, "Draft");
      const json = await makeRequest(app, "GET", `/api/chats/${empty.id}/export`, {
        cookie: aliceCookie,
      });
      expect(json.status).toBe(404);
      expect((await json.json()).error).toBe("Chat has no messages");
      const md = await makeRequest(app, "GET", `/api/chats/${empty.id}/export?format=markdown`, {
        cookie: aliceCookie,
      });
      expect(md.status).toBe(404);
      dbUtils.softDeleteChatByUser(empty.id, alice.id);
    });

    test("rejects unknown formats", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chat.id}/export?format=csv`, {
        cookie: aliceCookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("single chat Markdown", () => {
    test("renders title, header, turns, and keeps code fences intact", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chat.id}/export?format=markdown`, {
        cookie: aliceCookie,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/markdown");
      expect(res.headers.get("content-disposition")).toBe(
        "attachment; filename=\"code-chat.md\"; filename*=UTF-8''Code%20chat.md"
      );

      const md = await res.text();
      expect(md.startsWith("# Code chat\n")).toBe(true);
      expect(md).toContain("- Model: gpt-4o");
      expect(md).toContain("## User\n");
      expect(md).toContain("## Assistant\n");
      expect(md).toContain(CODE_CONTENT);
      expect(md.indexOf("## User")).toBeLessThan(md.indexOf("## Assistant"));
      expect(md.split("\n---\n")).toHaveLength(3);
      expect(md).toContain("Show me code\n\n---\n");
      expect(md).not.toMatch(/[^\n]\n---/);
    });
  });

  describe("ownership", () => {
    test("another user's chat is 404", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chat.id}/export`, {
        cookie: bobCookie,
      });
      expect(res.status).toBe(404);
    });

    test("requires a session", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chat.id}/export`);
      expect(res.status).toBe(401);
      const all = await makeRequest(app, "GET", "/api/export");
      expect(all.status).toBe(401);
    });

    test("readonly user can export their own chat", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${readerChat.id}/export`, {
        cookie: readerCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.chats[0].id).toBe(readerChat.id);

      const md = await makeRequest(
        app,
        "GET",
        `/api/chats/${readerChat.id}/export?format=markdown`,
        {
          cookie: readerCookie,
        }
      );
      expect(md.status).toBe(200);
    });

    test("readonly user gets 404 for another user's chat", async () => {
      const res = await makeRequest(app, "GET", `/api/chats/${chat.id}/export`, {
        cookie: readerCookie,
      });
      expect(res.status).toBe(404);
      const md = await makeRequest(app, "GET", `/api/chats/${chat.id}/export?format=markdown`, {
        cookie: readerCookie,
      });
      expect(md.status).toBe(404);
    });
  });

  describe("all chats", () => {
    test("returns only the caller's live chats, including archived and foldered", async () => {
      dbUtils.createChat("chat-empty", alice.id, null);
      const res = await makeRequest(app, "GET", "/api/export?format=json", {
        cookie: aliceCookie,
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-disposition")).toMatch(
        /^attachment; filename="faster-chat-export-\d{4}-\d{2}-\d{2}\.json"$/
      );

      const data = await res.json();
      expect(data.version).toBe(1);
      expect(data.folders.map((f) => f.id)).toEqual(["folder-1"]);
      expect(data.chats.map((c) => c.id).sort()).toEqual(["chat-1", "chat-2"]);

      const archived = data.chats.find((c) => c.id === "chat-2");
      expect(archived.archivedAt).toBeGreaterThan(0);
      expect(archived.messages).toHaveLength(1);
    });

    test("readonly user gets their own chats only", async () => {
      const res = await makeRequest(app, "GET", "/api/export", { cookie: readerCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.chats.map((c) => c.id)).toEqual(["chat-reader"]);
      expect(data.folders).toEqual([]);
    });

    test("rejects markdown for all-chats export", async () => {
      const res = await makeRequest(app, "GET", "/api/export?format=markdown", {
        cookie: aliceCookie,
      });
      expect(res.status).toBe(400);
    });
  });
});
