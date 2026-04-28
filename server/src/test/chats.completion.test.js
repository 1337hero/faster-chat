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

describe("chat completion - Phase 3 text-like attachment inlining", () => {
  let app, adminCookie, adminUserId, chatId;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUserId = admin.user.id;

    // Seed provider + enabled model.
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
      body: { title: "Text attachment test chat" },
      cookie: adminCookie,
    });
    chatId = (await chatRes.json()).id;
  });

  test("Markdown attachment creates a text part, not a file part", async () => {
    streamTextCalls.length = 0;
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

    const fileId = `test-md-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.md`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    const mdContent = "# Test\n\nThis is a **markdown** file.";
    await writeFile(filePath, mdContent);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "test.md",
      storedFilename,
      filePath,
      "text/markdown",
      mdContent.length,
      null,
      null
    );

    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "analyze markdown", fileIds: [fileId] },
      cookie: adminCookie,
    });
    const msgId = (await msgRes.json()).id;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msgId,
            role: "user",
            content: "analyze markdown",
            fileIds: [fileId],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    expect(streamTextCalls.length).toBe(1);

    const sent = streamTextCalls[0].messages;
    const userMsg = sent.find((m) => m.role === "user" && Array.isArray(m.content));
    expect(userMsg).toBeDefined();

    // Should contain text parts, not file parts
    const textParts = userMsg.content.filter((p) => p.type === "text");
    expect(textParts.length).toBeGreaterThan(1); // message text + formatted attachment text

    const fileParts = userMsg.content.filter((p) => p.type === "file");
    expect(fileParts.length).toBe(0); // Should NOT have file parts for text-like

    // The attachment text should contain the filename and content
    const attachmentText = textParts.find((p) => p.text.includes("test.md"));
    expect(attachmentText).toBeDefined();
    expect(attachmentText.text).toContain("Attached file:");
    expect(attachmentText.text).toContain("Content-Type:");
    expect(attachmentText.text).toContain("```markdown");
  });

  test("JSON attachment creates a text part with proper framing", async () => {
    streamTextCalls.length = 0;
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

    const fileId = `test-json-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.json`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    const jsonContent = JSON.stringify({ key: "value", number: 42 });
    await writeFile(filePath, jsonContent);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "data.json",
      storedFilename,
      filePath,
      "application/json",
      jsonContent.length,
      null,
      null
    );

    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "parse json", fileIds: [fileId] },
      cookie: adminCookie,
    });
    const msgId = (await msgRes.json()).id;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msgId,
            role: "user",
            content: "parse json",
            fileIds: [fileId],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const sent = streamTextCalls[0].messages;
    const userMsg = sent.find((m) => m.role === "user" && Array.isArray(m.content));

    const attachmentText = userMsg.content.find((p) => p.text?.includes("data.json"));
    expect(attachmentText).toBeDefined();
    expect(attachmentText.text).toContain("application/json");
    expect(attachmentText.text).toContain("```json");
  });

  test("CSV attachment creates a text part with CSV fence", async () => {
    streamTextCalls.length = 0;
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

    const fileId = `test-csv-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.csv`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    const csvContent = "name,age\nAlice,30\nBob,25";
    await writeFile(filePath, csvContent);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "data.csv",
      storedFilename,
      filePath,
      "text/csv",
      csvContent.length,
      null,
      null
    );

    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "analyze csv", fileIds: [fileId] },
      cookie: adminCookie,
    });
    const msgId = (await msgRes.json()).id;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msgId,
            role: "user",
            content: "analyze csv",
            fileIds: [fileId],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const sent = streamTextCalls[0].messages;
    const userMsg = sent.find((m) => m.role === "user" && Array.isArray(m.content));

    const attachmentText = userMsg.content.find((p) => p.text?.includes("data.csv"));
    expect(attachmentText).toBeDefined();
    expect(attachmentText.text).toContain("text/csv");
    expect(attachmentText.text).toContain("```csv");
    expect(attachmentText.text).toContain("name,age");
  });

  test("HTML attachment creates a text part after MIME normalization", async () => {
    streamTextCalls.length = 0;
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

    const fileId = `test-html-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.html`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    const htmlContent = "<html><body>Hello</body></html>";
    await writeFile(filePath, htmlContent);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "page.html",
      storedFilename,
      filePath,
      "text/html;charset=utf-8", // MIME type with charset parameter
      htmlContent.length,
      null,
      null
    );

    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "parse html", fileIds: [fileId] },
      cookie: adminCookie,
    });
    const msgId = (await msgRes.json()).id;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msgId,
            role: "user",
            content: "parse html",
            fileIds: [fileId],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const sent = streamTextCalls[0].messages;
    const userMsg = sent.find((m) => m.role === "user" && Array.isArray(m.content));

    const attachmentText = userMsg.content.find((p) => p.text?.includes("page.html"));
    expect(attachmentText).toBeDefined();
    expect(attachmentText.text).toContain("text/html");
    expect(attachmentText.text).toContain("```html");
  });

  test("Image attachment still creates native image part (not text)", async () => {
    streamTextCalls.length = 0;
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

    const fileId = `test-img-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.png`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
      "base64"
    );
    await writeFile(filePath, pngBytes);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "image.png",
      storedFilename,
      filePath,
      "image/png",
      pngBytes.length,
      null,
      null
    );

    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "describe image", fileIds: [fileId] },
      cookie: adminCookie,
    });
    const msgId = (await msgRes.json()).id;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msgId,
            role: "user",
            content: "describe image",
            fileIds: [fileId],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const sent = streamTextCalls[0].messages;
    const userMsg = sent.find((m) => m.role === "user" && Array.isArray(m.content));

    // Should have image part
    const imageParts = userMsg.content.filter((p) => p.type === "image");
    expect(imageParts.length).toBe(1);
    expect(imageParts[0].image).toContain("data:image/png;base64,");
  });

  test("PDF attachment still creates native file part (not text)", async () => {
    streamTextCalls.length = 0;
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

    const fileId = `test-pdf-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.pdf`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    // Minimal PDF stub
    const pdfBytes = Buffer.from("%PDF-1.4\n%EOF");
    await writeFile(filePath, pdfBytes);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "doc.pdf",
      storedFilename,
      filePath,
      "application/pdf",
      pdfBytes.length,
      null,
      null
    );

    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "read pdf", fileIds: [fileId] },
      cookie: adminCookie,
    });
    const msgId = (await msgRes.json()).id;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msgId,
            role: "user",
            content: "read pdf",
            fileIds: [fileId],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const sent = streamTextCalls[0].messages;
    const userMsg = sent.find((m) => m.role === "user" && Array.isArray(m.content));

    // Should have file part for PDF
    const fileParts = userMsg.content.filter((p) => p.type === "file");
    expect(fileParts.length).toBe(1);
    expect(fileParts[0].mediaType).toBe("application/pdf");
  });

  test("Large text attachment is truncated with notice", async () => {
    streamTextCalls.length = 0;
    await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });

    const fileId = `test-large-${crypto.randomUUID()}`;
    const storedFilename = `${fileId}.txt`;
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
    // Create content larger than MAX_INLINE_TEXT_ATTACHMENT_CHARS
    const { MAX_INLINE_TEXT_ATTACHMENT_CHARS } = await import("../lib/fileUtils.js");
    const largeContent = "x".repeat(MAX_INLINE_TEXT_ATTACHMENT_CHARS + 1000);
    await writeFile(filePath, largeContent);
    dbUtils.createFile(
      fileId,
      adminUserId,
      "large.txt",
      storedFilename,
      filePath,
      "text/plain",
      largeContent.length,
      null,
      null
    );

    const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
      body: { role: "user", content: "read large", fileIds: [fileId] },
      cookie: adminCookie,
    });
    const msgId = (await msgRes.json()).id;

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [
          {
            id: msgId,
            role: "user",
            content: "read large",
            fileIds: [fileId],
          },
        ],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const sent = streamTextCalls[0].messages;
    const userMsg = sent.find((m) => m.role === "user" && Array.isArray(m.content));

    const attachmentText = userMsg.content.find((p) => p.text?.includes("large.txt"));
    expect(attachmentText).toBeDefined();
    expect(attachmentText.text).toContain("[Attachment truncated:");
    expect(attachmentText.text).toContain(`showing first ${MAX_INLINE_TEXT_ATTACHMENT_CHARS}`);
  });
});
