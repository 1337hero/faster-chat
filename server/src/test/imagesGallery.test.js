import { describe, test, expect, beforeEach } from "bun:test";
import db, { dbUtils } from "../lib/db.js";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";

function seedFile({
  userId,
  prompt,
  model = "flux",
  metaType = "generated",
  createdAt,
  chatId = null,
}) {
  const id = `file-${Math.random().toString(36).slice(2)}`;
  dbUtils.createFile(
    id,
    userId,
    `gen_${Date.now()}.png`,
    "uploads/generated/x.png",
    "server/data/uploads/generated/x.png",
    "image/png",
    1024,
    null,
    metaType === "generated"
      ? {
          type: "generated",
          prompt,
          model,
          modelDisplayName: "FLUX",
          aspectRatio: "1:1",
          source: "replicate",
          generatedAt: createdAt ?? Date.now(),
          chatId,
        }
      : { type: metaType, attachmentCategory: "image" }
  );
  db.prepare("UPDATE files SET created_at = ? WHERE id = ?").run(createdAt ?? Date.now(), id);
  return id;
}

describe("getGeneratedFiles", () => {
  let adminId;

  beforeEach(async () => {
    resetDatabase();
    const app = createTestApp();
    const { user } = await seedAdminUser(app);
    adminId = user.id;
  });

  test("returns only generated rows, newest first", () => {
    const old = seedFile({ userId: adminId, prompt: "old cube", createdAt: 1000 });
    const upload = seedFile({ userId: adminId, prompt: "an upload", metaType: "upload" });
    const newest = seedFile({ userId: adminId, prompt: "new cube", createdAt: 3000 });
    const middle = seedFile({ userId: adminId, prompt: "middle cube", createdAt: 2000 });

    const generated = dbUtils.getGeneratedFiles(adminId);

    expect(generated.map((f) => f.id)).toEqual([newest, middle, old]);
    expect(generated.map((f) => f.meta.type)).toEqual(["generated", "generated", "generated"]);
    expect(generated).not.toContainEqual(expect.objectContaining({ id: upload }));
  });

  test("returns only the requesting user's rows", () => {
    const otherId = dbUtils.createUser("otheruser", "hash", "member");
    const mine = seedFile({ userId: adminId, prompt: "mine", createdAt: 2000 });
    const theirs = seedFile({ userId: otherId, prompt: "theirs", createdAt: 1000 });

    const generated = dbUtils.getGeneratedFiles(adminId);

    expect(generated.map((f) => f.id)).toEqual([mine]);
    expect(generated).not.toContainEqual(expect.objectContaining({ id: theirs }));
  });
});

describe("GET /api/images/gallery", () => {
  let app, adminId, adminCookie;

  beforeEach(async () => {
    resetDatabase();
    app = createTestApp();
    const { user, cookie } = await seedAdminUser(app);
    adminId = user.id;
    adminCookie = cookie;
  });

  test("returns 401 without a session", async () => {
    const res = await makeRequest(app, "GET", "/api/images/gallery");
    expect(res.status).toBe(401);
  });

  test("returns generated images with metadata fields from meta", async () => {
    const chatId = `chat-${Math.random().toString(36).slice(2)}`;
    dbUtils.createChat(chatId, adminId, "Art chat");
    seedFile({
      userId: adminId,
      prompt: "a red cube",
      model: "flux-1.1",
      createdAt: 2000,
      chatId,
    });
    seedFile({ userId: adminId, prompt: "an upload", metaType: "upload", createdAt: 1000 });

    const res = await makeRequest(app, "GET", "/api/images/gallery", { cookie: adminCookie });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.images).toHaveLength(1);
    expect(body.images[0]).toEqual({
      id: expect.any(String),
      filename: expect.stringContaining("gen_"),
      mimeType: "image/png",
      createdAt: 2000,
      isFavorite: false,
      size: 1024,
      prompt: "a red cube",
      model: "flux-1.1",
      modelDisplayName: "FLUX",
      aspectRatio: "1:1",
      source: "replicate",
      chatId,
      generatedAt: expect.any(Number),
    });
  });
});

describe("POST /api/images/gallery/:fileId/favorite", () => {
  let app, adminId, adminCookie, fileId;

  beforeEach(async () => {
    resetDatabase();
    app = createTestApp();
    const { user, cookie } = await seedAdminUser(app);
    adminId = user.id;
    adminCookie = cookie;
    fileId = seedFile({ userId: adminId, prompt: "a red cube", createdAt: 1000 });
  });

  test("toggles is_favorite false -> true -> false", async () => {
    const first = await makeRequest(app, "POST", `/api/images/gallery/${fileId}/favorite`, {
      cookie: adminCookie,
    });
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ id: fileId, isFavorite: true });

    const second = await makeRequest(app, "POST", `/api/images/gallery/${fileId}/favorite`, {
      cookie: adminCookie,
    });
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ id: fileId, isFavorite: false });

    const gallery = await makeRequest(app, "GET", "/api/images/gallery", { cookie: adminCookie });
    expect((await gallery.json()).images[0].isFavorite).toBe(false);
  });

  test("rejects another user's file with 404", async () => {
    const { cookie: memberCookie } = await seedMemberUser(app, adminCookie);

    const res = await makeRequest(app, "POST", `/api/images/gallery/${fileId}/favorite`, {
      cookie: memberCookie,
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "File not found" });
  });
});

describe("gallery invariants", () => {
  let app, adminId, adminCookie;

  beforeEach(async () => {
    resetDatabase();
    app = createTestApp();
    const { user, cookie } = await seedAdminUser(app);
    adminId = user.id;
    adminCookie = cookie;
  });

  test("favoriting a file never touches chat messages", () => {
    const chatId = `chat-${Math.random().toString(36).slice(2)}`;
    dbUtils.createChat(chatId, adminId, "Art chat");
    const msg1 = `msg-${Math.random().toString(36).slice(2)}`;
    const msg2 = `msg-${Math.random().toString(36).slice(2)}`;
    dbUtils.createMessage(msg1, chatId, adminId, "user", "draw a cube", null, null);
    dbUtils.createMessage(msg2, chatId, adminId, "assistant", "done", null, null);
    const fileId = seedFile({ userId: adminId, prompt: "a red cube", chatId });

    const before = db.prepare("SELECT COUNT(*) AS n FROM messages").get().n;
    const rowsBefore = db.prepare("SELECT * FROM messages ORDER BY id").all();

    dbUtils.toggleFileFavorite(fileId);

    const after = db.prepare("SELECT COUNT(*) AS n FROM messages").get().n;
    const rowsAfter = db.prepare("SELECT * FROM messages ORDER BY id").all();

    expect(after).toBe(before);
    expect(rowsAfter).toEqual(rowsBefore);
  });
});
