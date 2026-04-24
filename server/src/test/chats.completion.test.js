import { describe, test, expect, beforeAll, mock } from "bun:test";

// Capture streamText calls before any module that imports `ai` is loaded.
const streamTextCalls = [];
const aiActual = await import("ai");
mock.module("ai", () => ({
  ...aiActual,
  streamText: (opts) => {
    streamTextCalls.push(opts);
    return {
      text: Promise.resolve(""),
      toUIMessageStreamResponse: () =>
        new Response("data: [DONE]\n\n", {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    };
  },
}));

// Stub provider factory so getModel() doesn't try to talk to a real LLM.
mock.module("../lib/providerFactory.js", () => ({
  createProviderInstance: () => ({}),
  getModelInstance: () => ({ modelId: "stub-model" }),
}));

const { createTestApp, resetDatabase, seedAdminUser, makeRequest } = await import("./helpers.js");
const { dbUtils } = await import("../lib/db.js");
const { encryptApiKey } = await import("../lib/encryption.js");
const fsPromises = await import("fs/promises");
const { writeFile, mkdir } = fsPromises;
const pathMod = await import("path");
const path = pathMod.default || pathMod;
const { FILE_CONFIG } = await import("../lib/fileUtils.js");

describe("chat completion - file history preservation", () => {
  let app, adminCookie, adminUserId, chatId, fileId, msg1Id, msg2Id;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUserId = admin.user.id;

    // Seed provider + enabled model so getModel(modelId) succeeds.
    const { encryptedKey, iv, authTag } = encryptApiKey("sk-test-key");
    const providerId = dbUtils.createProvider(
      "test-provider",
      "Test Provider",
      "official",
      null,
      encryptedKey,
      iv,
      authTag
    );
    dbUtils.createModel(providerId, "stub-model", "Stub Model", true, "text");

    // Create a chat.
    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "File history chat" },
      cookie: adminCookie,
    });
    chatId = (await chatRes.json()).id;

    // Materialize a tiny PNG on disk and register it as a file owned by admin.
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });
    fileId = `test-file-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.png`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    // 1x1 transparent PNG bytes
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
      "base64"
    );
    await writeFile(filePath, pngBytes);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "tiny.png",
      storedFilename,
      filePath,
      "image/png",
      pngBytes.length,
      null,
      null
    );

    // Persist message 1 (with file attached) and message 2 (follow-up, no file).
    const m1Res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "analyze this", fileIds: [fileId] },
      cookie: adminCookie,
    });
    msg1Id = (await m1Res.json()).id;

    const m2Res = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "follow up question", fileIds: [] },
      cookie: adminCookie,
    });
    msg2Id = (await m2Res.json()).id;
  });

  test("historic user message with fileIds is sent to model as multimodal content", async () => {
    streamTextCalls.length = 0;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msg1Id,
            role: "user",
            content: "analyze this",
            fileIds: [fileId],
          },
          {
            id: msg2Id,
            role: "user",
            content: "follow up question",
            fileIds: [],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    expect(streamTextCalls.length).toBe(1);

    const sent = streamTextCalls[0].messages;
    // Find the historic message 1 ("analyze this") in the messages passed to streamText.
    const historicUserMsg = sent.find(
      (m) =>
        m.role === "user" &&
        Array.isArray(m.content) &&
        m.content.some((p) => p.type === "text" && p.text === "analyze this")
    );
    expect(historicUserMsg).toBeDefined();

    // It must carry a multimodal part for the file (image or file), not just text.
    const fileParts = historicUserMsg.content.filter(
      (p) => p.type === "image" || p.type === "file"
    );
    expect(fileParts.length).toBeGreaterThan(0);
  });
});
