import { describe, test, expect, afterEach, mock } from "bun:test";

const replicateRuns = [];
mock.module("replicate", () => ({
  default: class {
    async run(model, options) {
      replicateRuns.push({ model, options });
      return ["https://replicate.test/out.webp"];
    }
  },
}));

const { generateImageForProvider } = await import("../lib/imageProviderFactory.js?real");

const originalFetch = globalThis.fetch;

function stubFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: init?.body && JSON.parse(init.body) });
    return new Response(JSON.stringify(body), { status });
  };
  return calls;
}

const imagePart = (data, mimeType = "image/png") => ({
  inlineData: { data: Buffer.from(data).toString("base64"), mimeType },
});

describe("generateImageForProvider", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("google", () => {
    const options = { prompt: "a cube", aspectRatio: "16:9", model: "gemini-2.5-flash-image" };

    test("sends aspect ratio inside generationConfig.imageConfig", async () => {
      const calls = stubFetch(200, { candidates: [{ content: { parts: [imagePart("img")] } }] });

      await generateImageForProvider("google", "g-key", options);

      const [call] = calls;
      expect(call.url).toContain("/models/gemini-2.5-flash-image:generateContent");
      expect(call.init.headers["x-goog-api-key"]).toBe("g-key");
      expect(call.body.generationConfig).toEqual({
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "16:9" },
      });
      expect(call.body.contents[0].parts[0].text).toBe("a cube");
    });

    test("skips thought parts and returns the real image", async () => {
      stubFetch(200, {
        candidates: [
          {
            content: {
              parts: [{ ...imagePart("draft"), thought: true }, imagePart("final", "image/jpeg")],
            },
          },
        ],
      });

      const result = await generateImageForProvider("google", "g-key", options);

      expect(result.buffer.toString()).toBe("final");
      expect(result.mimeType).toBe("image/jpeg");
    });

    test("maps invalid API key to an authentication error", async () => {
      stubFetch(400, {
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
          status: "INVALID_ARGUMENT",
          details: [{ reason: "API_KEY_INVALID" }],
        },
      });

      await expect(generateImageForProvider("google", "bad", options)).rejects.toThrow(
        "authentication"
      );
    });

    test("maps 429 to a rate limit error", async () => {
      stubFetch(429, {
        error: { code: 429, message: "Quota exceeded", status: "RESOURCE_EXHAUSTED" },
      });

      await expect(generateImageForProvider("google", "g-key", options)).rejects.toThrow(
        "rate limit"
      );
    });
  });

  test("unknown provider is not supported", async () => {
    await expect(generateImageForProvider("nope", "key", { prompt: "x" })).rejects.toThrow(
      "Image generation not supported"
    );
  });

  describe("openai", () => {
    const b64Response = { data: [{ b64_json: Buffer.from("img").toString("base64") }] };

    test("gpt-image maps 3:2 to 1536x1024 without response_format", async () => {
      const calls = stubFetch(200, b64Response);

      await generateImageForProvider("openai", "key", {
        prompt: "x",
        aspectRatio: "3:2",
        model: "gpt-image-1",
      });

      expect(calls[0].body).toEqual({ model: "gpt-image-1", prompt: "x", n: 1, size: "1536x1024" });
    });

    test("dall-e-3 maps 16:9 to 1792x1024 with b64 response_format", async () => {
      const calls = stubFetch(200, b64Response);

      await generateImageForProvider("openai", "key", {
        prompt: "x",
        aspectRatio: "16:9",
        model: "dall-e-3",
      });

      expect(calls[0].body.size).toBe("1792x1024");
      expect(calls[0].body.response_format).toBe("b64_json");
    });

    test("rejects a ratio the model has no size for", async () => {
      const calls = stubFetch(200, b64Response);

      await expect(
        generateImageForProvider("openai", "key", {
          prompt: "x",
          aspectRatio: "16:9",
          model: "gpt-image-1",
        })
      ).rejects.toThrow("not supported");
      expect(calls).toHaveLength(0);
    });
  });

  test("openrouter uses the Images API with aspect_ratio", async () => {
    const calls = stubFetch(200, {
      data: [{ b64_json: Buffer.from("img").toString("base64"), media_type: "image/webp" }],
    });

    const result = await generateImageForProvider("openrouter", "key", {
      prompt: "x",
      aspectRatio: "4:3",
      model: "google/nano-banana",
    });

    expect(calls[0].url).toBe("https://openrouter.ai/api/v1/images");
    expect(calls[0].body).toEqual({
      model: "google/nano-banana",
      prompt: "x",
      aspect_ratio: "4:3",
    });
    expect(result.mimeType).toBe("image/webp");
  });

  test("unknown provider with a base URL uses OpenAI-compatible /images/generations", async () => {
    const calls = stubFetch(200, { data: [{ b64_json: Buffer.from("img").toString("base64") }] });

    await generateImageForProvider("sd-server", undefined, {
      prompt: "x",
      aspectRatio: "16:9",
      model: "sdxl",
      baseUrl: "http://localhost:1234/v1/",
    });

    expect(calls[0].url).toBe("http://localhost:1234/v1/images/generations");
    expect(calls[0].init.headers.Authorization).toBe("Bearer local");
    expect(calls[0].body).toEqual({ model: "sdxl", prompt: "x", n: 1, size: "1344x768" });
  });

  test("replicate passes aspect_ratio through", async () => {
    globalThis.fetch = async () =>
      new Response("img", { headers: { "content-type": "image/webp" } });

    await generateImageForProvider("replicate", "key", { prompt: "x", aspectRatio: "2:3" });

    expect(replicateRuns.at(-1).options.input.aspect_ratio).toBe("2:3");
  });
});
