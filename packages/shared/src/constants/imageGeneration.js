export const IMAGE_GENERATION = {
  ASPECT_RATIOS: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
  DEFAULT_ASPECT_RATIO: "1:1",
  MAX_IMAGES: 4,
  DEFAULT_NUM_IMAGES: 1,
  DOWNLOAD_TIMEOUT_MS: 30000,
  GENERATED_DIR: "generated",
  SAFETY_TOLERANCE: 5,
};

export const ASPECT_RATIO_SIZES = {
  "1:1": "1024x1024",
  "16:9": "1344x768",
  "9:16": "768x1344",
  "4:3": "1152x896",
  "3:4": "896x1152",
  "3:2": "1216x832",
  "2:3": "832x1216",
};

const OPENAI_SIZES = {
  "gpt-image": { "1:1": "1024x1024", "3:2": "1536x1024", "2:3": "1024x1536" },
  "dall-e": { "1:1": "1024x1024", "16:9": "1792x1024", "9:16": "1024x1792" },
};

export function openAiSizeTable(modelId) {
  return modelId?.startsWith("dall-e") ? OPENAI_SIZES["dall-e"] : OPENAI_SIZES["gpt-image"];
}

export function supportedAspectRatios(provider, modelId) {
  return provider === "openai"
    ? Object.keys(openAiSizeTable(modelId))
    : IMAGE_GENERATION.ASPECT_RATIOS;
}

// Phase 1: Single hardcoded model
// Phase 2: This will be fetched from database based on admin configuration
export const IMAGE_MODELS = {
  DEFAULT: "black-forest-labs/flux-1.1-pro",
  DISPLAY_NAME: "Flux 1.1 Pro",
};
