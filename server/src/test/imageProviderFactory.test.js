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

function stubFetchRaw(status, body) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: init?.body });
    return new Response(JSON.stringify(body), { status });
  };
  return calls;
}

const ref = (data, mimeType = "image/png") => ({ buffer: Buffer.from(data), mimeType });

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

  describe("image-to-image edit branches", () => {
    test("google embeds reference inlineData parts before the text part", async () => {
      const calls = stubFetch(200, { candidates: [{ content: { parts: [imagePart("img")] } }] });

      await generateImageForProvider("google", "g-key", {
        prompt: "a cube",
        aspectRatio: "1:1",
        model: "gemini-2.5-flash-image",
        references: [ref("ref1"), ref("ref2", "image/jpeg")],
      });

      const parts = calls[0].body.contents[0].parts;
      expect(parts).toHaveLength(3);
      expect(parts[0].inlineData.data).toBe(Buffer.from("ref1").toString("base64"));
      expect(parts[0].inlineData.mimeType).toBe("image/png");
      expect(parts[1].inlineData.data).toBe(Buffer.from("ref2").toString("base64"));
      expect(parts[1].inlineData.mimeType).toBe("image/jpeg");
      expect(parts[2]).toEqual({ text: "a cube" });
    });

    test("openai posts multipart to /images/edits with the image and size", async () => {
      const calls = stubFetchRaw(200, {
        data: [{ b64_json: Buffer.from("img").toString("base64") }],
      });

      await generateImageForProvider("openai", "key", {
        prompt: "a cube",
        aspectRatio: "1:1",
        model: "gpt-image-1",
        references: [ref("ref1")],
      });

      const [call] = calls;
      expect(call.url).toBe("https://api.openai.com/v1/images/edits");
      expect(call.init.headers["Content-Type"]).toBeUndefined();
      expect(call.body).toBeInstanceOf(FormData);
      expect(call.body.get("prompt")).toBe("a cube");
      expect(call.body.get("model")).toBe("gpt-image-1");
      expect(call.body.get("size")).toBe("1024x1024");
      const image = call.body.getAll("image[]");
      expect(image).toHaveLength(1);
      expect(image[0].type).toBe("image/png");
      expect(await image[0].text()).toBe("ref1");
    });

    test("openai-compatible posts multipart to the base url /images/edits", async () => {
      const calls = stubFetchRaw(200, {
        data: [{ b64_json: Buffer.from("img").toString("base64") }],
      });

      await generateImageForProvider("sd-server", undefined, {
        prompt: "a cube",
        aspectRatio: "16:9",
        model: "sdxl",
        baseUrl: "http://localhost:1234/v1/",
        references: [ref("ref1")],
      });

      const [call] = calls;
      expect(call.url).toBe("http://localhost:1234/v1/images/edits");
      expect(call.body).toBeInstanceOf(FormData);
      expect(call.body.get("model")).toBe("sdxl");
      expect(call.body.get("size")).toBe("1344x768");
      expect(call.body.getAll("image[]")).toHaveLength(1);
    });

    test("openrouter adds input_references as image_url content parts", async () => {
      const calls = stubFetch(200, {
        data: [{ b64_json: Buffer.from("img").toString("base64"), media_type: "image/webp" }],
      });

      await generateImageForProvider("openrouter", "key", {
        prompt: "a cube",
        aspectRatio: "1:1",
        model: "google/nano-banana",
        references: [ref("ref1")],
      });

      const body = calls[0].body;
      expect(body.input_references).toEqual([
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${Buffer.from("ref1").toString("base64")}` },
        },
      ]);
      expect(body.prompt).toBe("a cube");
    });

    test("replicate passes the reference as an image data url input", async () => {
      globalThis.fetch = async () =>
        new Response("img", { headers: { "content-type": "image/webp" } });

      await generateImageForProvider("replicate", "key", {
        prompt: "a cube",
        aspectRatio: "1:1",
        model: "black-forest-labs/flux-1.1-pro",
        references: [ref("ref1")],
      });

      const input = replicateRuns.at(-1).options.input;
      expect(input.image).toBe(`data:image/png;base64,${Buffer.from("ref1").toString("base64")}`);
    });

    test("replicate passes multiple references as an image array", async () => {
      globalThis.fetch = async () =>
        new Response("img", { headers: { "content-type": "image/webp" } });

      await generateImageForProvider("replicate", "key", {
        prompt: "a cube",
        references: [ref("ref1"), ref("ref2", "image/jpeg")],
      });

      const input = replicateRuns.at(-1).options.input;
      expect(input.image).toEqual([
        `data:image/png;base64,${Buffer.from("ref1").toString("base64")}`,
        `data:image/jpeg;base64,${Buffer.from("ref2").toString("base64")}`,
      ]);
    });

    test("no references leaves the google body unchanged", async () => {
      const calls = stubFetch(200, { candidates: [{ content: { parts: [imagePart("img")] } }] });

      await generateImageForProvider("google", "g-key", {
        prompt: "a cube",
        aspectRatio: "1:1",
        model: "gemini-2.5-flash-image",
      });

      expect(calls[0].body.contents[0].parts).toEqual([{ text: "a cube" }]);
    });
  });
});
