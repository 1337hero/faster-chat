import { IMAGE_GENERATION } from "@faster-chat/shared";
import Replicate from "replicate";

const REPLICATE_TEXT_TO_IMAGE_COLLECTION_URL =
  "https://api.replicate.com/v1/collections/text-to-image";

export function createReplicateClient(apiKey) {
  return new Replicate({ auth: apiKey });
}

export async function fetchReplicateImageModels(apiKey) {
  const response = await fetch(REPLICATE_TEXT_TO_IMAGE_COLLECTION_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Replicate API returned ${response.status}`);
  }
  const collection = await response.json();

  return (collection.models || []).map((model) => ({
    model_id: `${model.owner}/${model.name}`,
    display_name: model.name,
    model_type: "image",
    output_modalities: ["image"],
    enabled: false,
    metadata: {
      supports_vision: false,
      supports_tools: false,
      supports_streaming: false,
      input_price_per_1m: 0,
      output_price_per_1m: 0,
    },
  }));
}

/**
 * Generate an image with any Replicate text-to-image model.
 * Sends only the inputs shared across the collection (prompt, aspect_ratio, output_format);
 * models without aspect_ratio ignore it and use their own default size.
 * @returns {Promise<string[]>} Array of image URLs
 */
export async function generateImage(client, options) {
  const { prompt, model, aspectRatio = IMAGE_GENERATION.DEFAULT_ASPECT_RATIO } = options;

  const output = await client.run(model, {
    input: {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "webp",
    },
  });

  // Models return either a single FileOutput/URL or an array of them
  if (Array.isArray(output)) {
    return output.map((item) => (typeof item === "string" ? item : item.url?.()));
  }

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
