import { describe, test, expect, beforeEach, afterAll, mock } from "bun:test";

let generateImageForProviderImpl = async () => ({
  buffer: Buffer.from("image"),
  mimeType: "image/png",
});

mock.module("../lib/imageProviderFactory.js", () => ({
  generateImageForProvider: (...args) => generateImageForProviderImpl(...args),
}));

const { createTestApp, resetDatabase, seedAdminUser, makeRequest } = await import("./helpers.js");

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
});
