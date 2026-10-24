import { ASPECT_RATIO_SIZES, openAiSizeTable } from "@faster-chat/shared";
import {
  createReplicateClient,
  generateImage as replicateGenerate,
  downloadImage,
} from "./imageGeneration.js";

export async function generateImageForProvider(providerName, apiKey, options) {
  const { prompt, aspectRatio, model, baseUrl } = options;

  switch (providerName) {
    case "replicate":
      return generateWithReplicate(apiKey, { prompt, aspectRatio, model });

    case "openrouter":
      return generateWithOpenRouter(apiKey, { prompt, aspectRatio, model });

    case "openai":
      return generateWithOpenAI(apiKey, { prompt, aspectRatio, model });

    case "google":
      return generateWithGoogle(apiKey, { prompt, aspectRatio, model });

    default:
      if (baseUrl) {
        return generateWithOpenAICompatible(apiKey, { prompt, aspectRatio, model, baseUrl });
      }
      throw new Error(`Image generation not supported for provider: ${providerName}`);
  }
}

async function generateWithReplicate(apiKey, options) {
  const client = createReplicateClient(apiKey);
  const urls = await replicateGenerate(client, options);
  const { buffer, mimeType } = await downloadImage(urls[0]);
  return { buffer, mimeType, sourceUrl: urls[0] };
}

async function generateWithOpenRouter(apiKey, options) {
  const { prompt, aspectRatio, model } = options;

  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, aspect_ratio: aspectRatio }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenRouter generation failed");
  }

  const image = data.data?.[0];
  if (!image?.b64_json) {
    throw new Error("No image in OpenRouter response");
  }

  return {
    buffer: Buffer.from(image.b64_json, "base64"),
    mimeType: image.media_type || "image/png",
  };
}

async function generateWithOpenAI(apiKey, options) {
  const { prompt, aspectRatio, model = "dall-e-3" } = options;

  const size = openAiSizeTable(model)[aspectRatio];
  if (!size) {
    throw new Error(`Aspect ratio ${aspectRatio} not supported by ${model}`);
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      ...(model.startsWith("dall-e") && { response_format: "b64_json" }),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI generation failed");
  }

  const base64Data = data.data[0]?.b64_json;
  if (!base64Data) {
    throw new Error("No image in response");
  }

  const buffer = Buffer.from(base64Data, "base64");
  return { buffer, mimeType: "image/png" };
}

async function generateWithOpenAICompatible(apiKey, options) {
  const { prompt, aspectRatio, model, baseUrl } = options;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey || "local"}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, n: 1, size: ASPECT_RATIO_SIZES[aspectRatio] }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Image generation failed");
  }

  const base64Data = data.data?.[0]?.b64_json;
  if (!base64Data) {
    throw new Error("No image in response");
  }

  return {
    buffer: Buffer.from(base64Data, "base64"),
    mimeType: data.output_format ? `image/${data.output_format}` : "image/png",
  };
}

async function generateWithGoogle(apiKey, options) {
  const { prompt, aspectRatio, model } = options;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw googleError(response.status, data.error);
  }

  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData && !p.thought);
  if (!part) {
    throw new Error("No image in Google response");
  }

  return {
    buffer: Buffer.from(part.inlineData.data, "base64"),
    mimeType: part.inlineData.mimeType || "image/png",
  };
}

function googleError(status, error = {}) {
  const message = error.message || "";

  if (status === 429 || error.status === "RESOURCE_EXHAUSTED") {
    return new Error(`rate limit exceeded: ${message}`);
  }

  const invalidKey = JSON.stringify(error).includes("API_KEY_INVALID");
  if (status === 401 || status === 403 || (status === 400 && invalidKey)) {
    return new Error(`authentication failed: ${message}`);
  }

  return new Error(message || "Google generation failed");
}
