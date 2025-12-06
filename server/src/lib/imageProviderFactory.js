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

async function generateWithOpenRouter(apiKey, options) {
  const { prompt, model } = options;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "black-forest-labs/flux.2-pro",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenRouter generation failed");

  const imageData = data.choices[0]?.message?.images?.[0];
  if (!imageData) throw new Error("No image in response");

  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const mimeType = imageData.match(/^data:(image\/\w+);/)?.[1] || 'image/png';

  return { buffer, mimeType };
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
