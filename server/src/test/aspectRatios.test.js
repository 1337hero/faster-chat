import { describe, test, expect } from "bun:test";
import { IMAGE_GENERATION, supportedAspectRatios } from "@faster-chat/shared";

describe("supportedAspectRatios", () => {
  test("dall-e models get the dall-e sizes", () => {
    const ratios = supportedAspectRatios("openai", "dall-e-3");
    expect(ratios).toHaveLength(3);
    expect(ratios).toContain("16:9");
  });

  test("gpt-image models get the gpt-image sizes", () => {
    const ratios = supportedAspectRatios("openai", "gpt-image-1");
    expect(ratios).toHaveLength(3);
    expect(ratios).toContain("3:2");
  });

  test("other providers get every ratio", () => {
    expect(supportedAspectRatios("replicate", "flux")).toEqual(IMAGE_GENERATION.ASPECT_RATIOS);
    expect(supportedAspectRatios("sd-server", "sdxl")).toHaveLength(7);
    expect(supportedAspectRatios(undefined, undefined)).toHaveLength(7);
  });
});
