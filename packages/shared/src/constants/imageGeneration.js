export const IMAGE_GENERATION = {
  ASPECT_RATIOS: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
  DEFAULT_ASPECT_RATIO: "9:16",
  MAX_IMAGES: 4,
  DEFAULT_NUM_IMAGES: 1,
  DOWNLOAD_TIMEOUT_MS: 30000,
  GENERATED_DIR: "generated",
  SAFETY_TOLERANCE: 5,
};

// Phase 1: Single hardcoded model
// Phase 2: This will be fetched from database based on admin configuration
export const IMAGE_MODELS = {
  DEFAULT: "black-forest-labs/flux-1.1-pro",
  DISPLAY_NAME: "Flux 1.1 Pro",
};
