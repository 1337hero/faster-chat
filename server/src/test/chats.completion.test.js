import { describe, test, expect, beforeAll, beforeEach, mock } from "bun:test";
import { readFile } from "fs/promises";
import path from "path";

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

// Stub provider factory so getModelInstance() doesn't talk to a real LLM.
const PROVIDER_PDF_CAPABLE = new Set(["anthropic", "openai", "mistral"]);
const PROVIDER_IMAGE_CAPABLE = new Set([
  "anthropic",
  "openai",
  "mistral",
  "groq",
  "google",
  "google-vertex",
  "xai",
  "deepseek",
  "cerebras",
  "fireworks",
]);
mock.module("../lib/providerFactory.js", () => ({
  createProviderInstance: () => ({}),
  getModelInstance: () => ({ modelId: "stub-model" }),
  providerSupportsNativePdf: (providerName) => PROVIDER_PDF_CAPABLE.has(providerName),
  providerSupportsImages: (providerName) => PROVIDER_IMAGE_CAPABLE.has(providerName),
}));

const { createTestApp, resetDatabase, seedAdminUser, makeRequest } = await import("./helpers.js");
const { dbUtils } = await import("../lib/db.js");
const { encryptApiKey } = await import("../lib/encryption.js");
const { writeFile, mkdir } = await import("fs/promises");
const { FILE_CONFIG } = await import("../lib/fileUtils.js");

async function createFileFixture(ctx, { name, content, mimeType, userMessage }) {
  const { app, chatId, cookie, userId } = ctx;
  await mkdir(FILE_CONFIG.UPLOAD_DIR, { recursive: true });
  const fileId = `test-${crypto.randomUUID()}`;
  const ext = name.slice(name.lastIndexOf("."));
  const storedFilename = `${fileId}${ext}`;
  const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  await writeFile(filePath, buf);
  dbUtils.createFile(
    fileId,
    userId,
    name,
    storedFilename,
    filePath,
    mimeType,
    buf.length,
    null,
    null
  );
  const msgRes = await makeRequest(app, "POST", `/api/chats/${chatId}/messages`, {
    body: { role: "user", content: userMessage, fileIds: [fileId] },
    cookie,
  });
  const msgId = (await msgRes.json()).id;
  return { fileId, msgId };
}

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
    const modelRowId = dbUtils.createModel(providerId, "stub-model", "Stub Model", true, "text");
    // Set model metadata with supports_vision for image tests
    dbUtils.setModelMetadata(modelRowId, { supports_vision: 1 });

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

  beforeEach(() => {
    streamTextCalls.length = 0;
  });

  test("historic user message with fileIds is sent to model as multimodal content", async () => {
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
    const modelRowId = dbUtils.createModel(providerId, "stub-model", "Stub Model", true, "text");
    // Set model metadata with supports_vision for image tests
    dbUtils.setModelMetadata(modelRowId, { supports_vision: 1 });

    // Seed an anthropic provider so the PDF test passes preflight.
    const anthropicProvider = dbUtils.createProvider(
      "anthropic",
      "Anthropic",
      "official",
      null,
      encryptedKey,
      iv,
      authTag
    );
    dbUtils.createModel(anthropicProvider, "anthropic-stub", "Anthropic Stub", true, "text");

    // Create a chat.
    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "Text attachment test chat" },
      cookie: adminCookie,
    });
    chatId = (await chatRes.json()).id;
  });

  beforeEach(() => {
    streamTextCalls.length = 0;
  });

  test("Markdown attachment creates a text part, not a file part", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "test.md",
      content: "# Test\n\nThis is a **markdown** file.",
      mimeType: "text/markdown",
      userMessage: "analyze markdown",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "analyze markdown", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    expect(userMsg.content.filter((p) => p.type === "file")).toHaveLength(0);
    const attachmentText = userMsg.content.find((p) => p.text?.includes("test.md"));
    expect(attachmentText.text).toContain("Attached file:");
    expect(attachmentText.text).toContain("Content-Type:");
    expect(attachmentText.text).toContain("```markdown");
  });

  test("JSON attachment creates a text part with proper framing", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "data.json",
      content: JSON.stringify({ key: "value", number: 42 }),
      mimeType: "application/json",
      userMessage: "parse json",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "parse json", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const attachmentText = userMsg.content.find((p) => p.text?.includes("data.json"));
    expect(attachmentText.text).toContain("application/json");
    expect(attachmentText.text).toContain("```json");
  });

  test("CSV attachment creates a text part with CSV fence", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "data.csv",
      content: "name,age\nAlice,30\nBob,25",
      mimeType: "text/csv",
      userMessage: "analyze csv",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "analyze csv", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const attachmentText = userMsg.content.find((p) => p.text?.includes("data.csv"));
    expect(attachmentText.text).toContain("text/csv");
    expect(attachmentText.text).toContain("```csv");
    expect(attachmentText.text).toContain("name,age");
  });

  test("HTML attachment creates a text part after MIME normalization", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "page.html",
      content: "<html><body>Hello</body></html>",
      mimeType: "text/html;charset=utf-8",
      userMessage: "parse html",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "parse html", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const attachmentText = userMsg.content.find((p) => p.text?.includes("page.html"));
    expect(attachmentText.text).toContain("text/html");
    expect(attachmentText.text).toContain("```html");
  });

  test("Image attachment still creates native image part (not text)", async () => {
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
      "base64"
    );
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "image.png",
      content: pngBytes,
      mimeType: "image/png",
      userMessage: "describe image",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "describe image", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const imageParts = userMsg.content.filter((p) => p.type === "image");
    expect(imageParts).toHaveLength(1);
    expect(imageParts[0].image).toContain("data:image/png;base64,");
  });

  test("PDF attachment still creates native file part (not text)", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "doc.pdf",
      content: Buffer.from("%PDF-1.4\n%EOF"),
      mimeType: "application/pdf",
      userMessage: "read pdf",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "anthropic-stub",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "read pdf", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const fileParts = userMsg.content.filter((p) => p.type === "file");
    expect(fileParts).toHaveLength(1);
    expect(fileParts[0].mediaType).toBe("application/pdf");
  });

  test("Large text attachment is truncated with notice", async () => {
    const { MAX_INLINE_TEXT_ATTACHMENT_CHARS } = await import("../lib/fileUtils.js");
    const largeContent = "x".repeat(MAX_INLINE_TEXT_ATTACHMENT_CHARS + 1000);
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "large.txt",
      content: largeContent,
      mimeType: "text/plain",
      userMessage: "read large",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "read large", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const attachmentText = userMsg.content.find((p) => p.text?.includes("large.txt"));
    expect(attachmentText.text).toContain("[Attachment truncated:");
    expect(attachmentText.text).toContain(`showing first ${MAX_INLINE_TEXT_ATTACHMENT_CHARS}`);
  });
});

describe("chat completion - Phase 4 PDF preflight", () => {
  let app, adminCookie, adminUserId, chatId;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUserId = admin.user.id;

    const { encryptedKey, iv, authTag } = encryptApiKey("sk-test-key");
    const seed = (name, label) => {
      const id = dbUtils.createProvider(name, label, "official", null, encryptedKey, iv, authTag);
      dbUtils.createModel(id, `${name}-model`, label, true, "text");
    };
    seed("test-provider", "Test Provider");
    dbUtils.createModel(
      dbUtils.createProvider("stub-only", "Stub", "official", null, encryptedKey, iv, authTag),
      "stub-model",
      "Stub Model",
      true,
      "text"
    );
    seed("anthropic", "Anthropic");
    seed("openai", "OpenAI");
    seed("groq", "Groq");

    const chatRes = await makeRequest(app, "POST", "/api/chats", {
      body: { title: "PDF preflight test chat" },
      cookie: adminCookie,
    });
    chatId = (await chatRes.json()).id;
  });

  beforeEach(() => {
    streamTextCalls.length = 0;
  });

  test("Anthropic + PDF passes preflight and produces native PDF file part", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "doc.pdf",
      content: Buffer.from("%PDF-1.4\n%EOF"),
      mimeType: "application/pdf",
      userMessage: "read pdf",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "anthropic-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "read pdf", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const fileParts = userMsg.content.filter((p) => p.type === "file");
    expect(fileParts).toHaveLength(1);
    expect(fileParts[0].mediaType).toBe("application/pdf");
  });

  test("Groq + PDF returns 400 with clear error", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "report.pdf",
      content: Buffer.from("%PDF-1.4\n%EOF"),
      mimeType: "application/pdf",
      userMessage: "read pdf",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "groq-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "read pdf", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("One or more attachments are not supported by the selected model.");
    expect(body.details).toHaveLength(1);
    expect(body.details[0].filename).toBe("report.pdf");
    expect(body.details[0].reason).toContain("provider cannot read PDF");
    expect(streamTextCalls).toHaveLength(0);
  });

  test("OpenAI + PDF passes preflight", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "doc.pdf",
      content: Buffer.from("%PDF-1.4\n%EOF"),
      mimeType: "application/pdf",
      userMessage: "read pdf",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "openai-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "read pdf", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    const userMsg = streamTextCalls[0].messages.find(
      (m) => m.role === "user" && Array.isArray(m.content)
    );
    const fileParts = userMsg.content.filter((p) => p.type === "file");
    expect(fileParts).toHaveLength(1);
    expect(fileParts[0].mediaType).toBe("application/pdf");
  });

  test("Text-like attachments pass for all providers", async () => {
    const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
    const { fileId, msgId } = await createFileFixture(ctx, {
      name: "doc.md",
      content: "# Test Markdown",
      mimeType: "text/markdown",
      userMessage: "read markdown",
    });

    const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
      body: {
        model: "stub-model",
        systemPromptId: "default",
        messages: [{ id: msgId, role: "user", content: "read markdown", fileIds: [fileId] }],
      },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    expect(streamTextCalls).toHaveLength(1);
  });

  describe("Phase 5 - Office document extraction", () => {
    test("docx attachment creates a text part with extracted content", async () => {
      const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
      const { fileId, msgId } = await createFileFixture(ctx, {
        name: "test.docx",
        content: await readFile(path.join(__dirname, "fixtures", "test.docx")),
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        userMessage: "analyze docx",
      });

      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
        body: {
          model: "stub-model",
          systemPromptId: "default",
          messages: [{ id: msgId, role: "user", content: "analyze docx", fileIds: [fileId] }],
        },
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      const userMsg = streamTextCalls[0].messages.find(
        (m) => m.role === "user" && Array.isArray(m.content)
      );
      expect(userMsg.content.filter((p) => p.type === "file")).toHaveLength(0);
      const attachmentText = userMsg.content.find((p) => p.text?.includes("test.docx"));
      expect(attachmentText.text).toContain("Attached file:");
      expect(attachmentText.text).toContain("First paragraph text");
      expect(attachmentText.text).toContain("Second paragraph with some content");
    });

    test("xlsx attachment creates a text part with extracted content", async () => {
      const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
      const { fileId, msgId } = await createFileFixture(ctx, {
        name: "test.xlsx",
        content: await readFile(path.join(__dirname, "fixtures", "test.xlsx")),
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        userMessage: "analyze xlsx",
      });

      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
        body: {
          model: "stub-model",
          systemPromptId: "default",
          messages: [{ id: msgId, role: "user", content: "analyze xlsx", fileIds: [fileId] }],
        },
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      const userMsg = streamTextCalls[0].messages.find(
        (m) => m.role === "user" && Array.isArray(m.content)
      );
      expect(userMsg.content.filter((p) => p.type === "file")).toHaveLength(0);
      const attachmentText = userMsg.content.find((p) => p.text?.includes("test.xlsx"));
      expect(attachmentText.text).toContain("Attached file:");
      expect(attachmentText.text).toContain("Header A");
      expect(attachmentText.text).toContain("Header B");
    });

    test("pptx attachment creates a text part with extracted content", async () => {
      const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
      const { fileId, msgId } = await createFileFixture(ctx, {
        name: "test.pptx",
        content: await readFile(path.join(__dirname, "fixtures", "test.pptx")),
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        userMessage: "analyze pptx",
      });

      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
        body: {
          model: "stub-model",
          systemPromptId: "default",
          messages: [{ id: msgId, role: "user", content: "analyze pptx", fileIds: [fileId] }],
        },
        cookie: adminCookie,
      });

      expect(res.status).toBe(200);
      const userMsg = streamTextCalls[0].messages.find(
        (m) => m.role === "user" && Array.isArray(m.content)
      );
      expect(userMsg.content.filter((p) => p.type === "file")).toHaveLength(0);
      const attachmentText = userMsg.content.find((p) => p.text?.includes("test.pptx"));
      expect(attachmentText.text).toContain("Attached file:");
      expect(attachmentText.text).toContain("Slide 1 Title");
      expect(attachmentText.text).toContain("Slide 1 content text");
    });

    test("legacy .doc file returns clear error in preflight", async () => {
      const ctx = { app, chatId, cookie: adminCookie, userId: adminUserId };
      const { fileId, msgId } = await createFileFixture(ctx, {
        name: "legacy.doc",
        content: Buffer.from("fake legacy doc content"),
        mimeType: "application/msword",
        userMessage: "analyze doc",
      });

      const res = await makeRequest(app, "POST", `/api/chats/${chatId}/completion`, {
        body: {
          model: "stub-model",
          systemPromptId: "default",
          messages: [{ id: msgId, role: "user", content: "analyze doc", fileIds: [fileId] }],
        },
        cookie: adminCookie,
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("One or more attachments are not supported by the selected model.");
      expect(body.details).toHaveLength(1);
      expect(body.details[0].filename).toBe("legacy.doc");
      expect(body.details[0].reason).toContain("not supported");
    });
  });
});
