import { describe, test, expect } from "bun:test";
import { supportsImageToImage, IMAGE_GENERATION } from "@faster-chat/shared";

describe("supportsImageToImage", () => {
  test("defaults per provider", () => {
    expect(supportsImageToImage("google", null)).toBe(true);
    expect(supportsImageToImage("openai", null)).toBe(true);
    expect(supportsImageToImage("openrouter", null)).toBe(true);
    expect(supportsImageToImage("replicate", null)).toBe(false);
    expect(supportsImageToImage("sd-server", null)).toBe(false);
    expect(supportsImageToImage(undefined, null)).toBe(false);
  });

  test("dall-e models cannot edit", () => {
    expect(supportsImageToImage("openai", null, "dall-e-3")).toBe(false);
    expect(supportsImageToImage("openai", null, "dall-e-2")).toBe(false);
    expect(supportsImageToImage("openai", null, "gpt-image-1")).toBe(true);
  });

  test("per-model metadata override wins over the default", () => {
    expect(supportsImageToImage("replicate", { supports_image_to_image: 1 })).toBe(true);
    expect(supportsImageToImage("replicate", { supports_image_to_image: true })).toBe(true);
    expect(supportsImageToImage("google", { supports_image_to_image: 0 })).toBe(false);
  });

  test("a null override is treated as unset", () => {
    expect(supportsImageToImage("google", { supports_image_to_image: null })).toBe(true);
    expect(supportsImageToImage("replicate", { supports_image_to_image: null })).toBe(false);
  });

  test("exposes the reference cap", () => {
    expect(IMAGE_GENERATION.MAX_REFERENCE_IMAGES).toBe(3);
  });
});
