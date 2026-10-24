import { describe, test, expect, beforeEach, afterAll, mock } from "bun:test";

let generateImageForProviderImpl = async () => ({
  buffer: Buffer.from("image"),
  mimeType: "image/png",
});

mock.module("../lib/imageProviderFactory.js", () => ({
  generateImageForProvider: (...args) => generateImageForProviderImpl(...args),
}));

const { createTestApp, resetDatabase, seedAdminUser, makeRequest } = await import("./helpers.js");
const { dbUtils } = await import("../lib/db.js");

const originalReplicateApiKey = process.env.REPLICATE_API_KEY;

describe("image routes", () => {
  let app, adminCookie;

  beforeEach(async () => {
    resetDatabase();
    process.env.REPLICATE_API_KEY = "test-replicate-key";
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

  test("POST /api/images/generate maps invalid provider tokens to 401", async () => {
    generateImageForProviderImpl = async () => {
      throw new Error("Invalid API token: test secret should not leak");
    };

    const res = await makeRequest(app, "POST", "/api/images/generate", {
      body: { prompt: "draw a cube" },
      cookie: adminCookie,
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid API key" });
  });

  test("POST /api/images/generate maps provider rate limits to 429", async () => {
    generateImageForProviderImpl = async () => {
      throw new Error("provider rate limit reached");
    };

    const res = await makeRequest(app, "POST", "/api/images/generate", {
      body: { prompt: "draw a cube" },
      cookie: adminCookie,
    });

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Rate limit exceeded. Please try again later.",
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

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("sensitive internal provider trace");
  });

  describe("aspect ratio and provider options", () => {
    let factoryCalls;

    beforeEach(() => {
      factoryCalls = [];
      generateImageForProviderImpl = async (...args) => {
        factoryCalls.push(args);
        return { buffer: Buffer.from("image"), mimeType: "image/png" };
      };
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
});
