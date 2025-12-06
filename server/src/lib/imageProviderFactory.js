import { createReplicateClient, generateImage as replicateGenerate, downloadImage } from "./imageGeneration.js";

export async function generateImageForProvider(providerName, apiKey, options) {
  const { prompt, aspectRatio, model } = options;

  switch (providerName) {
    case "replicate":
      return generateWithReplicate(apiKey, { prompt, aspectRatio, model });

    case "openrouter":
      return generateWithOpenRouter(apiKey, { prompt, model });

    case "openai":
      return generateWithOpenAI(apiKey, { prompt });

    default:
      throw new Error(`Image generation not supported for provider: ${providerName}`);
  }
}

async function generateWithReplicate(apiKey, options) {
  const client = createReplicateClient(apiKey);
  const urls = await replicateGenerate(client, options);
  const { buffer, mimeType } = await downloadImage(urls[0]);
  return { buffer, mimeType, sourceUrl: urls[0] };
}

function parseDataUrl(url) {
  const match = /^data:(?<mime>image\/[\w.+-]+)?;base64,(?<data>.+)$/i.exec(url || "");
  if (!match || !match.groups?.data) return null;
  return {
    buffer: Buffer.from(match.groups.data, "base64"),
    mimeType: match.groups.mime || "image/png",
  };
}

async function imageUrlToBuffer(url) {
  // Data URL
  if (url?.startsWith("data:")) {
    const parsed = parseDataUrl(url);
    if (!parsed) throw new Error("Invalid data URL from OpenRouter");
    return { buffer: parsed.buffer, mimeType: parsed.mimeType, sourceUrl: url };
  }

  // Remote URL
  const imgResponse = await fetch(url);
  const buffer = Buffer.from(await imgResponse.arrayBuffer());
  return {
    buffer,
    mimeType: imgResponse.headers.get("content-type") || "image/png",
    sourceUrl: url,
  };
}

async function generateWithOpenRouter(apiKey, options) {
  const { prompt, model } = options;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenRouter generation failed");

  const message = data.choices?.[0]?.message;
  let imageCandidate = message?.images?.[0];

  // Content can be a string or an array of blocks
  const content = message?.content;
  if (!imageCandidate && typeof content === "string" && content.startsWith("data:image")) {
    imageCandidate = content;
  }

  if (!imageCandidate && Array.isArray(content)) {
    const imageBlock = content.find((c) => c?.image_url?.url || c?.url || c?.type === "image_url");
    if (imageBlock?.image_url?.url) {
      imageCandidate = imageBlock.image_url.url;
    } else if (imageBlock?.url) {
      imageCandidate = imageBlock.url;
    }
  }

  if (!imageCandidate && message?.image_url) {
    imageCandidate = message.image_url;
  }

  if (!imageCandidate) {
    console.error("OpenRouter response missing image:", JSON.stringify(data, null, 2));
    throw new Error("No image in OpenRouter response - model may not support image generation");
  }

  // Handle string candidate (data URL or base64)
  if (typeof imageCandidate === "string") {
    if (imageCandidate.startsWith("http") || imageCandidate.startsWith("data:")) {
      return imageUrlToBuffer(imageCandidate);
    }
    return { buffer: Buffer.from(imageCandidate, "base64"), mimeType: "image/webp" };
  }

  if (imageCandidate.b64_json) {
    return {
      buffer: Buffer.from(imageCandidate.b64_json, "base64"),
      mimeType: imageCandidate.content_type || "image/webp",
    };
  }

  if (imageCandidate.url) {
    return imageUrlToBuffer(imageCandidate.url);
  }

  console.error("Unknown image data format:", imageCandidate);
  throw new Error("Unknown image format from OpenRouter");
}

async function generateWithOpenAI(apiKey, options) {
  const { prompt, size = "1024x1024" } = options;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI generation failed");

  const base64Data = data.data[0]?.b64_json;
  if (!base64Data) throw new Error("No image in response");

  const buffer = Buffer.from(base64Data, 'base64');
  return { buffer, mimeType: 'image/png' };
}
