import { Hono } from "hono";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { IMAGE_GENERATION, IMAGE_MODELS } from "@faster-chat/shared";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { ENDPOINT_RATE_LIMITS } from "../lib/constants.js";
import { createStoredFilename, calculateFileHash } from "../lib/fileUtils.js";
import { generateImageForProvider } from "../lib/imageProviderFactory.js";
import { runWithConcurrency } from "../lib/concurrency.js";
import { decryptApiKey } from "../lib/encryption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const GENERATED_DIR = path.join(
  PROJECT_ROOT,
  "server/data/uploads",
  IMAGE_GENERATION.GENERATED_DIR
);

const MAX_CONCURRENT_GENERATIONS = 3;

export const imagesRouter = new Hono();

// Apply auth middleware to all routes
imagesRouter.use("/*", ensureSession);

async function ensureGeneratedDirectory() {
  try {
    await mkdir(GENERATED_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      console.error("Failed to create generated directory:", error);
      throw error;
    }
  }
}

function normalizeProviderError(error) {
  const message = (error?.message || "").toLowerCase();

  if (message.includes("invalid api token") || message.includes("authentication")) {
    return "Invalid API key";
  }

  if (message.includes("rate limit")) {
    return "Rate limit exceeded. Please try again later.";
  }

  console.error("Image generation failed:", error);
  return "Image generation failed";
}

async function saveGeneratedImage({
  user,
  buffer,
  mimeType,
  prompt,
  model,
  modelDisplayName,
  aspectRatio,
  source,
  chatId,
}) {
  const fileId = randomUUID();
  const extension = mimeType === "image/webp" ? "webp" : mimeType.split("/")[1] || "png";
  const filename = `generated_${Date.now()}.${extension}`;
  const storedFilename = createStoredFilename(fileId, filename);
  const filePath = path.join(GENERATED_DIR, storedFilename);

  await ensureGeneratedDirectory();
  await writeFile(filePath, buffer);

  const fileHash = calculateFileHash(buffer);
  const relativePath = path.join(
    "server/data/uploads",
    IMAGE_GENERATION.GENERATED_DIR,
    storedFilename
  );

  const fileRecord = dbUtils.createFile(
    fileId,
    user.id,
    filename,
    storedFilename,
    relativePath,
    mimeType,
    buffer.length,
    fileHash,
    {
      type: "generated",
      prompt,
      model,
      modelDisplayName,
      aspectRatio,
      source,
      generatedAt: Date.now(),
      chatId: chatId || null,
    }
  );

  if (!fileRecord) {
    return null;
  }

  return {
    id: fileId,
    filename,
    size: buffer.length,
    mimeType,
    model,
    modelDisplayName,
    prompt,
    aspectRatio,
  };
}

imagesRouter.post("/generate", createRateLimiter(ENDPOINT_RATE_LIMITS.IMAGE_GEN), async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const {
    prompt,
    aspectRatio = IMAGE_GENERATION.DEFAULT_ASPECT_RATIO,
    chatId,
    modelId,
    numImages = IMAGE_GENERATION.DEFAULT_NUM_IMAGES,
  } = body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return c.json({ error: "Prompt is required" }, HTTP_STATUS.BAD_REQUEST);
  }

  if (!IMAGE_GENERATION.ASPECT_RATIOS.includes(aspectRatio)) {
    return c.json(
      { error: `Invalid aspect ratio. Allowed: ${IMAGE_GENERATION.ASPECT_RATIOS.join(", ")}` },
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (!Number.isInteger(numImages) || numImages < 1 || numImages > IMAGE_GENERATION.MAX_IMAGES) {
    return c.json(
      { error: `numImages must be an integer between 1 and ${IMAGE_GENERATION.MAX_IMAGES}` },
      HTTP_STATUS.BAD_REQUEST
    );
  }

  let providerName = "replicate";
  let apiKey = process.env.REPLICATE_API_KEY;
  let modelIdentifier = IMAGE_MODELS.DEFAULT;
  let modelDisplayName = IMAGE_MODELS.DISPLAY_NAME;
  let baseUrl = null;

  if (modelId) {
    const model = dbUtils.getEnabledModelWithProvider(modelId);
    if (model) {
      providerName = model.provider_name;
      modelIdentifier = model.model_id;
      modelDisplayName = model.display_name;
      baseUrl = model.provider_base_url;
      if (model.provider_encrypted_key) {
        apiKey = decryptApiKey(
          model.provider_encrypted_key,
          model.provider_iv,
          model.provider_auth_tag
        );
      }
    }
  }

  if (!apiKey && !baseUrl) {
    return c.json(
      { error: "Image generation is not configured. Please add a provider with image models." },
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const trimmedPrompt = prompt.trim();
  const tasks = Array.from({ length: numImages }, (_, index) => async () => {
    try {
      return {
        index,
        image: await generateImageForProvider(providerName, apiKey, {
          prompt: trimmedPrompt,
          aspectRatio,
          model: modelIdentifier,
          baseUrl,
        }),
      };
    } catch (error) {
      return { index, error: normalizeProviderError(error) };
    }
  });

  const results = await runWithConcurrency(tasks, Math.min(numImages, MAX_CONCURRENT_GENERATIONS));
  results.sort((a, b) => a.index - b.index);

  const images = [];
  const failures = [];
  for (const result of results) {
    if (result.error) {
      failures.push({ index: result.index, error: result.error });
      continue;
    }

    const record = await saveGeneratedImage({
      user,
      buffer: result.image.buffer,
      mimeType: result.image.mimeType,
      prompt: trimmedPrompt,
      model: modelIdentifier,
      modelDisplayName,
      aspectRatio,
      source: providerName,
      chatId,
    });

    if (!record) {
      failures.push({ index: result.index, error: "Failed to save generated image" });
      continue;
    }

    images.push(record);
  }

  if (images.length === 0) {
    return c.json(
      { error: "All image generations failed", images, failures },
      HTTP_STATUS.BAD_GATEWAY
    );
  }

  return c.json({ images, failures });
});

imagesRouter.get("/gallery", async (c) => {
  const user = c.get("user");
  const files = dbUtils.getGeneratedFiles(user.id);

  const images = files.map((file) => ({
    id: file.id,
    filename: file.filename,
    mimeType: file.mime_type,
    createdAt: file.created_at,
    isFavorite: !!file.is_favorite,
    size: file.size,
    prompt: file.meta?.prompt ?? null,
    model: file.meta?.model ?? null,
    modelDisplayName: file.meta?.modelDisplayName ?? null,
    aspectRatio: file.meta?.aspectRatio ?? null,
    source: file.meta?.source ?? null,
    chatId: file.meta?.chatId ?? null,
    generatedAt: file.meta?.generatedAt ?? null,
  }));

  return c.json({ images });
});

imagesRouter.post("/gallery/:fileId/favorite", async (c) => {
  const user = c.get("user");
  const fileId = c.req.param("fileId");

  const file = dbUtils.getFileByIdAndUser(fileId, user.id);
  if (!file) {
    return c.json({ error: "File not found" }, HTTP_STATUS.NOT_FOUND);
  }

  const isFavorite = dbUtils.toggleFileFavorite(fileId);
  return c.json({ id: fileId, isFavorite });
});

imagesRouter.get("/status", async (c) => {
  const apiKey = process.env.REPLICATE_API_KEY;

  return c.json({
    available: !!apiKey,
    model: IMAGE_MODELS.DEFAULT,
    modelDisplayName: IMAGE_MODELS.DISPLAY_NAME,
  });
});
