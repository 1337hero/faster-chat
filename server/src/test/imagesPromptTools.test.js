import { describe, test, expect, beforeEach, afterAll, mock } from "bun:test";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

// Capture generateText calls before any module that imports `ai` is loaded.
const generateTextCalls = [];
let generateTextImpl = async () => ({ text: "stub-model-text" });
const aiActual = await import("ai");
mock.module("ai", () => ({
  ...aiActual,
  generateText: (opts) => {
    generateTextCalls.push(opts);
    return generateTextImpl(opts);
  },
}));

// Stub image + chat model factories so no test touches a real provider.
mock.module("../lib/imageProviderFactory.js", () => ({
  generateImageForProvider: async () => ({ buffer: Buffer.from("image"), mimeType: "image/png" }),
}));

mock.module("../lib/providerFactory.js", () => ({
  createProviderInstance: () => ({}),
  getModelInstance: () => ({ modelId: "stub-model" }),
  providerSupportsNativePdf: () => false,
  providerSupportsImages: () => false,
}));

const { createTestApp, resetDatabase, seedAdminUser, createTestUser, makeRequest } =
  await import("./helpers.js");
const { dbUtils } = await import("../lib/db.js");

async function seedImageFile({
  userId,
  mimeType = "image/png",
  content = "img-bytes",
  meta = null,
} = {}) {
  const fileId = randomUUID();
  const hash = randomUUID().replace(/-/g, "");
  const relativePath = path.join("server/data/uploads", "prompt-tools-test", `${hash}.png`);
  await mkdir(path.join(PROJECT_ROOT, path.dirname(relativePath)), { recursive: true });
  await writeFile(path.join(PROJECT_ROOT, relativePath), content);
  dbUtils.createFile(
    fileId,
    userId,
    `${hash}.png`,
    hash,
    relativePath,
    mimeType,
    content.length,
    hash,
    meta
  );
  return fileId;
}

function seedChatModel({ modelId = "gemini-flash", supportsVision = true, enabled = true } = {}) {
  const providerId = dbUtils.createProvider(
    `chat-${modelId}`,
    `Chat ${modelId}`,
    "google",
    null,
    null,
    null,
    null
  );
  const rowId = dbUtils.createModel(providerId, modelId, modelId, enabled, "text");
  dbUtils.setModelMetadata(rowId, { supports_vision: supportsVision });
  return modelId;
}

describe("POST /api/images/reverse-prompt", () => {
  let app, adminCookie, adminId, fileId, modelId;

  beforeEach(async () => {
    resetDatabase();
    generateTextCalls.length = 0;
    generateTextImpl = async () => ({ text: "stub-model-text" });

    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminId = admin.user.id;
    fileId = await seedImageFile({ userId: adminId });
    modelId = seedChatModel();
  });

  test("requires a session", async () => {
    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId, length: "standard", modelId },
    });

    expect(res.status).toBe(401);
    expect(generateTextCalls).toHaveLength(0);
  });

  test("rejects a file the user does not own (404) and never calls the model", async () => {
    const other = await createTestUser();
    const foreignId = await seedImageFile({ userId: other.id });

    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId: foreignId, length: "standard", modelId },
      cookie: adminCookie,
    });

    expect(res.status).toBe(404);
    expect(generateTextCalls).toHaveLength(0);
  });

  test("rejects a missing file (404)", async () => {
    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId: randomUUID(), length: "standard", modelId },
      cookie: adminCookie,
    });

    expect(res.status).toBe(404);
    expect(generateTextCalls).toHaveLength(0);
  });

  test("rejects a non-image file (400) and never calls the model", async () => {
    const pdfId = await seedImageFile({
      userId: adminId,
      mimeType: "application/pdf",
      content: "%pdf",
    });

    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId: pdfId, length: "standard", modelId },
      cookie: adminCookie,
    });

    expect(res.status).toBe(400);
    expect(generateTextCalls).toHaveLength(0);
  });

  test.each(["verbose", "long", "", null])(
    "rejects an invalid length %p (400) and never calls the model",
    async (length) => {
      const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
        body: { fileId, length, modelId },
        cookie: adminCookie,
      });

      expect(res.status).toBe(400);
      expect(generateTextCalls).toHaveLength(0);
    }
  );

  test("rejects a missing modelId (400)", async () => {
    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId, length: "standard" },
      cookie: adminCookie,
    });

    expect(res.status).toBe(400);
    expect(generateTextCalls).toHaveLength(0);
  });

  test("rejects a non-vision model (400), naming it, and never calls the model", async () => {
    const nonVisionId = seedChatModel({ modelId: "claude-nonvision", supportsVision: false });

    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId, length: "standard", modelId: nonVisionId },
      cookie: adminCookie,
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("claude-nonvision");
    expect(generateTextCalls).toHaveLength(0);
  });

  test("rejects a disabled model (400) and never calls the model", async () => {
    const disabledId = seedChatModel({ modelId: "claude-disabled", enabled: false });

    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId, length: "standard", modelId: disabledId },
      cookie: adminCookie,
    });

    expect(res.status).toBe(400);
    expect(generateTextCalls).toHaveLength(0);
  });

  test("returns the model's prompt for an owned image with one image part and the length instruction", async () => {
    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId, length: "detailed", modelId },
      cookie: adminCookie,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ prompt: "stub-model-text" });
    expect(generateTextCalls).toHaveLength(1);

    const [opts] = generateTextCalls;
    expect(opts.system).toContain("Length: detailed");
    expect(opts.system).toContain("Never use quality filler");
    const imageParts = opts.messages[0].content.filter((part) => part.type === "image");
    expect(imageParts).toHaveLength(1);
    expect(imageParts[0].image).toBeInstanceOf(Buffer);
    expect(imageParts[0].image.toString()).toBe("img-bytes");
    expect(opts.messages[0].content.some((part) => part.type === "text")).toBe(true);
  });

  test("defaults to standard length when none is sent", async () => {
    const res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
      body: { fileId, modelId },
      cookie: adminCookie,
    });

    expect(res.status).toBe(200);
    expect(generateTextCalls[0].system).toContain("Length: standard");
  });

  test("normalizes a failed model call to a 502 without leaking internals", async () => {
    generateTextImpl = async () => {
      throw new Error("sensitive provider trace");
    };
    const originalConsoleError = console.error;
    console.error = () => {};
    let res;
    try {
      res = await makeRequest(app, "POST", "/api/images/reverse-prompt", {
        body: { fileId, length: "standard", modelId },
        cookie: adminCookie,
      });
    } finally {
      console.error = originalConsoleError;
    }
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("sensitive provider trace");
  });
});

describe("POST /api/images/enhance-prompt", () => {
  let app, adminCookie, modelId;

  beforeEach(async () => {
    resetDatabase();
    generateTextCalls.length = 0;
    generateTextImpl = async () => ({ text: "expanded-prompt-output" });

    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    modelId = seedChatModel();
  });

  test("requires a session", async () => {
    const res = await makeRequest(app, "POST", "/api/images/enhance-prompt", {
      body: { prompt: "cyberpunk cat", modelId },
    });

    expect(res.status).toBe(401);
    expect(generateTextCalls).toHaveLength(0);
  });

  test.each(["", "   ", null, undefined, 42])(
    "rejects an empty prompt %p (400) and never calls the model",
    async (prompt) => {
      const res = await makeRequest(app, "POST", "/api/images/enhance-prompt", {
        body: { prompt, modelId },
        cookie: adminCookie,
      });

      expect(res.status).toBe(400);
      expect(generateTextCalls).toHaveLength(0);
    }
  );

  test("rejects a non-vision model (400), naming it, and never calls the model", async () => {
    const nonVisionId = seedChatModel({ modelId: "claude-nonvision", supportsVision: false });

    const res = await makeRequest(app, "POST", "/api/images/enhance-prompt", {
      body: { prompt: "cyberpunk cat", modelId: nonVisionId },
      cookie: adminCookie,
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("claude-nonvision");
    expect(generateTextCalls).toHaveLength(0);
  });

  test("passes the user's prompt through unchanged and returns the model's text", async () => {
    const res = await makeRequest(app, "POST", "/api/images/enhance-prompt", {
      body: { prompt: "  cyberpunk cat, rainy street  ", modelId },
      cookie: adminCookie,
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ prompt: "expanded-prompt-output" });
    expect(generateTextCalls).toHaveLength(1);

    const [opts] = generateTextCalls;
    expect(opts.messages[0].role).toBe("user");
    expect(opts.messages[0].content).toBe("cyberpunk cat, rainy street");
    expect(opts.system).toContain("Never use quality filler");
    expect(opts.system).toContain("expand a user's short image idea");
  });

  test("normalizes a failed model call to a 502 without leaking internals", async () => {
    generateTextImpl = async () => {
      throw new Error("sensitive provider trace");
    };
    const originalConsoleError = console.error;
    console.error = () => {};
    let res;
    try {
      res = await makeRequest(app, "POST", "/api/images/enhance-prompt", {
        body: { prompt: "cyberpunk cat", modelId },
        cookie: adminCookie,
      });
    } finally {
      console.error = originalConsoleError;
    }
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain("sensitive provider trace");
  });
});
