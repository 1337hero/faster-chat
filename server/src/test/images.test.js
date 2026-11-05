import { describe, test, expect, beforeEach, afterAll, mock } from "bun:test";

let generateImageForProviderImpl = async () => ({
  buffer: Buffer.from("image"),
  mimeType: "image/png",
});

mock.module("../lib/imageProviderFactory.js", () => ({
  generateImageForProvider: (...args) => generateImageForProviderImpl(...args),
}));

const { createTestApp, resetDatabase, seedAdminUser, makeRequest, db } =
  await import("./helpers.js");
const { dbUtils } = await import("../lib/db.js");

const originalReplicateApiKey = process.env.REPLICATE_API_KEY;

describe("image routes", () => {
  let app, adminCookie;

  beforeEach(async () => {
    resetDatabase();
    process.env.REPLICATE_API_KEY = "test-key";
    generateImageForProviderImpl = async () => ({
      buffer: Buffer.from("image"),
      mimeType: "image/png",
    });

    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
  });

  afterAll(() => {
    if (originalReplicateApiKey === undefined) {
      delete process.env.REPLICATE_API_KEY;
    } else {
      process.env.REPLICATE_API_KEY = originalReplicateApiKey;
    }
  });

  test("POST /api/images/generate reports a failed batch as 502 with a normalized reason", async () => {
    generateImageForProviderImpl = async () => {
      throw new Error("Invalid API token: test secret should not leak");
    };

    const res = await makeRequest(app, "POST", "/api/images/generate", {
      body: { prompt: "draw a cube" },
      cookie: adminCookie,
    });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "All image generations failed",
      images: [],
      failures: [{ index: 0, error: "Invalid API key" }],
    });
  });

  test("POST /api/images/generate normalizes provider rate limits per image", async () => {
    generateImageForProviderImpl = async () => {
      throw new Error("provider rate limit reached");
    };

    const res = await makeRequest(app, "POST", "/api/images/generate", {
      body: { prompt: "draw a cube", numImages: 2 },
      cookie: adminCookie,
    });

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "All image generations failed",
      images: [],
      failures: [
        { index: 0, error: "Rate limit exceeded. Please try again later." },
        { index: 1, error: "Rate limit exceeded. Please try again later." },
      ],
    });
  });

  test("POST /api/images/generate leaves unrelated provider errors generic", async () => {
    generateImageForProviderImpl = async () => {
      throw new Error("sensitive internal provider trace");
    };

    const originalConsoleError = console.error;
    console.error = () => {};
    let res;
    try {
      res = await makeRequest(app, "POST", "/api/images/generate", {
        body: { prompt: "draw a cube" },
        cookie: adminCookie,
      });
    } finally {
      console.error = originalConsoleError;
    }

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.failures).toEqual([{ index: 0, error: "Image generation failed" }]);
    expect(JSON.stringify(body)).not.toContain("sensitive internal provider trace");
  });
});

describe("aspect ratio and provider options", () => {
  let app, adminCookie, factoryCalls;

  beforeEach(async () => {
    resetDatabase();
    process.env.REPLICATE_API_KEY = "test-key";
    factoryCalls = [];
    generateImageForProviderImpl = async (...args) => {
      factoryCalls.push(args);
      return { buffer: Buffer.from("image"), mimeType: "image/png" };
    };

    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
  });

  const generate = (body) =>
    makeRequest(app, "POST", "/api/images/generate", { body, cookie: adminCookie });

  test("forwards the requested aspect ratio to the provider", async () => {
    const res = await generate({ prompt: "a cube", aspectRatio: "16:9" });

    expect(res.status).toBe(200);
    expect(factoryCalls[0][2].aspectRatio).toBe("16:9");
  });

  test("defaults to 1:1 when no aspect ratio is sent", async () => {
    await generate({ prompt: "a cube" });

    expect(factoryCalls[0][2].aspectRatio).toBe("1:1");
  });

  test("rejects an unknown aspect ratio", async () => {
    const res = await generate({ prompt: "a cube", aspectRatio: "5:1" });

    expect(res.status).toBe(400);
    expect(factoryCalls).toHaveLength(0);
  });

  test("local provider with a base URL and no key reaches the factory", async () => {
    delete process.env.REPLICATE_API_KEY;
    const providerId = dbUtils.createProvider(
      "sd-server",
      "SD Server",
      "openai-compatible",
      "http://localhost:1234/v1",
      null,
      null,
      null
    );
    dbUtils.createModel(providerId, "sdxl", "SDXL", true, "image");

    const res = await generate({ prompt: "a cube", modelId: "sdxl" });

    expect(res.status).toBe(200);
    const [providerName, apiKey, options] = factoryCalls[0];
    expect(providerName).toBe("sd-server");
    expect(apiKey).toBeUndefined();
    expect(options.baseUrl).toBe("http://localhost:1234/v1");
    expect(options.model).toBe("sdxl");
  });
});

describe("batch generation", () => {
  let app, adminCookie, factoryCalls;

  beforeEach(async () => {
    resetDatabase();
    process.env.REPLICATE_API_KEY = "test-key";
    factoryCalls = [];
    generateImageForProviderImpl = async (...args) => {
      factoryCalls.push(args);
      return { buffer: Buffer.from(`image-${factoryCalls.length}`), mimeType: "image/png" };
    };

    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
  });

  const generate = (body) =>
    makeRequest(app, "POST", "/api/images/generate", { body, cookie: adminCookie });

  test("generates one image per numImages with distinct file ids", async () => {
    const res = await generate({ prompt: "a cube", numImages: 2 });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(factoryCalls).toHaveLength(2);
    expect(body.images).toHaveLength(2);
    expect(body.images[0].id).not.toBe(body.images[1].id);
    expect(body.images[0]).toEqual({
      id: expect.any(String),
      filename: expect.any(String),
      size: expect.any(Number),
      mimeType: "image/png",
      model: expect.any(String),
      modelDisplayName: expect.any(String),
      prompt: "a cube",
      aspectRatio: "1:1",
    });
    expect(body.failures).toEqual([]);
  });

  test.each([0, -1, "2", 2.5, 5])("rejects numImages %p with 400", async (numImages) => {
    const res = await generate({ prompt: "a cube", numImages });

    expect(res.status).toBe(400);
    expect(factoryCalls).toHaveLength(0);
  });

  test("defaults to a single image when numImages is omitted", async () => {
    const res = await generate({ prompt: "a cube" });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(factoryCalls).toHaveLength(1);
    expect(body.images).toHaveLength(1);
  });

  test("keeps the successful images when one generation fails", async () => {
    let calls = 0;
    generateImageForProviderImpl = async () => {
      if (calls++ === 1) throw new Error("provider rate limit reached");
      return { buffer: Buffer.from("image"), mimeType: "image/png" };
    };

    const res = await generate({ prompt: "a cube", numImages: 2 });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.images).toHaveLength(1);
    expect(body.failures).toEqual([
      { index: 1, error: "Rate limit exceeded. Please try again later." },
    ]);
  });

  test("reports total failure with 502 and creates no file rows", async () => {
    generateImageForProviderImpl = async () => {
      throw new Error("provider exploded");
    };

    const originalConsoleError = console.error;
    console.error = () => {};
    let res;
    try {
      res = await generate({ prompt: "a cube", numImages: 3 });
    } finally {
      console.error = originalConsoleError;
    }
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.images).toEqual([]);
    expect(body.failures).toHaveLength(3);
    expect(db.prepare("SELECT COUNT(*) AS count FROM files").get().count).toBe(0);
  });

  test("persists every generated image with shared batch metadata", async () => {
    const res = await generate({
      prompt: "a cube",
      numImages: 2,
      aspectRatio: "16:9",
      chatId: "chat-1",
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    const rows = db
      .prepare("SELECT id, meta FROM files WHERE id IN (?, ?)")
      .all(body.images[0].id, body.images[1].id);

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      const meta = JSON.parse(row.meta);
      expect(meta.prompt).toBe("a cube");
      expect(meta.aspectRatio).toBe("16:9");
      expect(meta.chatId).toBe("chat-1");
      expect(meta.type).toBe("generated");
    }
  });
});
