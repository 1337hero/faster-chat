import { describe, test, expect, afterEach } from "bun:test";
import { generateImageForProvider } from "../lib/imageProviderFactory.js";

const originalFetch = globalThis.fetch;

function stubFetch(status, body) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
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
});
