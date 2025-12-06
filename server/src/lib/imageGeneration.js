import { IMAGE_GENERATION, IMAGE_MODELS } from "@faster-chat/shared";
import Replicate from "replicate";

/**
 * Create a Replicate client with the provided API key
 */
export function createReplicateClient(apiKey) {
  return new Replicate({ auth: apiKey });
}

/**
 * Generate an image using Replicate's Flux model
 * @param {Replicate} client - Replicate client instance
 * @param {object} options - Generation options
 * @param {string} options.prompt - The image prompt
 * @param {string} [options.aspectRatio] - Aspect ratio (e.g., "1:1", "16:9")
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function generateImage(client, options) {
  const { prompt, aspectRatio = IMAGE_GENERATION.DEFAULT_ASPECT_RATIO } = options;

  const output = await client.run(IMAGE_MODELS.DEFAULT, {
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "webp",
      output_quality: 90,
      safety_tolerance: 6,
      prompt_upsampling: true,
    },
  });

  // Flux schnell returns an array of FileOutput objects or URLs
  // Handle both cases
  if (Array.isArray(output)) {
    return output.map((item) => (typeof item === "string" ? item : item.url?.()));
  }

  // Single output case
  return [typeof output === "string" ? output : output.url?.()];
}

/**
 * Download an image from a URL and return as buffer
 * @param {string} url - Image URL to download
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
export async function downloadImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_GENERATION.DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = response.headers.get("content-type") || "image/webp";

    return { buffer, mimeType };
  } finally {
    clearTimeout(timeout);
  }
}
