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
import { decryptApiKey } from "../lib/encryption.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const GENERATED_DIR = path.join(
  PROJECT_ROOT,
  "server/data/uploads",
  IMAGE_GENERATION.GENERATED_DIR
);

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

imagesRouter.post("/generate", createRateLimiter(ENDPOINT_RATE_LIMITS.IMAGE_GEN), async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { prompt, aspectRatio = IMAGE_GENERATION.DEFAULT_ASPECT_RATIO, chatId, modelId } = body;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return c.json({ error: "Prompt is required" }, HTTP_STATUS.BAD_REQUEST);
  }

  if (!IMAGE_GENERATION.ASPECT_RATIOS.includes(aspectRatio)) {
    return c.json(
      { error: `Invalid aspect ratio. Allowed: ${IMAGE_GENERATION.ASPECT_RATIOS.join(", ")}` },
      HTTP_STATUS.BAD_REQUEST
    );
  }

  let providerName = "replicate";
  let apiKey = process.env.REPLICATE_API_KEY;
  let modelIdentifier = IMAGE_MODELS.DEFAULT;
  let modelDisplayName = IMAGE_MODELS.DISPLAY_NAME;

  if (modelId) {
    const model = dbUtils.getEnabledModelWithProvider(modelId);
    if (model) {
      providerName = model.provider_name;
      modelIdentifier = model.model_id;
      modelDisplayName = model.display_name;
      if (model.provider_encrypted_key) {
        apiKey = decryptApiKey(
          model.provider_encrypted_key,
          model.provider_iv,
          model.provider_auth_tag
        );
      }
    }
  }

  if (!apiKey) {
    return c.json(
      { error: "Image generation is not configured. Please add a provider with image models." },
      HTTP_STATUS.BAD_REQUEST
    );
  }

  let generatedImage;
  try {
    generatedImage = await generateImageForProvider(providerName, apiKey, {
      prompt: prompt.trim(),
      aspectRatio,
      model: modelIdentifier,
    });
  } catch (error) {
    const message = error?.message || "";
    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("invalid api token") ||
      normalizedMessage.includes("authentication")
    ) {
      return c.json({ error: "Invalid API key" }, HTTP_STATUS.UNAUTHORIZED);
    }

    if (normalizedMessage.includes("rate limit")) {
      return c.json(
        { error: "Rate limit exceeded. Please try again later." },
        HTTP_STATUS.TOO_MANY_REQUESTS
      );
    }

    throw error;
  }

  const { buffer, mimeType } = generatedImage;

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
      prompt: prompt.trim(),
      model: modelIdentifier,
      modelDisplayName,
      aspectRatio,
      source: providerName,
      generatedAt: Date.now(),
      chatId: chatId || null,
    }
  );

  if (!fileRecord) {
    return c.json({ error: "Failed to save generated image" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return c.json({
    id: fileId,
    filename,
    size: buffer.length,
    mimeType,
    model: modelIdentifier,
    modelDisplayName,
    prompt: prompt.trim(),
    aspectRatio,
  });
});

imagesRouter.get("/status", async (c) => {
  const apiKey = process.env.REPLICATE_API_KEY;

  return c.json({
    available: !!apiKey,
    model: IMAGE_MODELS.DEFAULT,
    modelDisplayName: IMAGE_MODELS.DISPLAY_NAME,
  });
});
