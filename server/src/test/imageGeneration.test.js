import { describe, test, expect } from "bun:test";
import { generateImage, fetchReplicateImageModels } from "../lib/imageGeneration.js";

describe("generateImage", () => {
  test("runs the selected model with only shared inputs", async () => {
    const calls = [];
    const client = {
      run: async (model, params) => {
        calls.push({ model, params });
        return "https://replicate.delivery/out.webp";
      },
    };

    const urls = await generateImage(client, {
      prompt: "a fox",
      model: "google/nano-banana",
      aspectRatio: "16:9",
    });

    expect(urls).toEqual(["https://replicate.delivery/out.webp"]);
    expect(calls).toEqual([
      {
        model: "google/nano-banana",
        params: { input: { prompt: "a fox", aspect_ratio: "16:9", output_format: "webp" } },
      },
    ]);
  });

  test("handles array outputs of FileOutput objects", async () => {
    const client = { run: async () => [{ url: () => "https://x/1.webp" }, "https://x/2.webp"] };
    const urls = await generateImage(client, { prompt: "p", model: "stability-ai/sdxl" });
    expect(urls).toEqual(["https://x/1.webp", "https://x/2.webp"]);
  });
});

describe("fetchReplicateImageModels", () => {
  test("maps the text-to-image collection into disabled image models", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      expect(String(url)).toContain("/collections/text-to-image");
      return new Response(
        JSON.stringify({
          models: [
            { owner: "google", name: "nano-banana" },
            { owner: "black-forest-labs", name: "flux-2-pro" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    try {
      const models = await fetchReplicateImageModels("test-key");
      expect(models.map((m) => m.model_id)).toEqual([
        "google/nano-banana",
        "black-forest-labs/flux-2-pro",
      ]);
      expect(models[0]).toMatchObject({
        display_name: "nano-banana",
        model_type: "image",
        enabled: false,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
