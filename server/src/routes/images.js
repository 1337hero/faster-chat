import { Hono } from "hono";
import { randomUUID } from "crypto";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { generateText } from "ai";
import {
  IMAGE_GENERATION,
  IMAGE_MODELS,
  supportsImageToImage,
  REVERSE_PROMPT_LENGTHS,
} from "@faster-chat/shared";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { ENDPOINT_RATE_LIMITS } from "../lib/constants.js";
import { createStoredFilename, calculateFileHash } from "../lib/fileUtils.js";
import { generateImageForProvider } from "../lib/imageProviderFactory.js";
import { getModelInstance } from "../lib/providerFactory.js";
import {
  buildReversePromptSystemPrompt,
  ENHANCE_PROMPT_SYSTEM_PROMPT,
} from "../lib/promptEngineering.js";
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

// Resolves a chat model the same way chats.js does (enabled model + provider +
// decrypted key) and gates on metadata.supports_vision. Reverse-prompt needs
// vision by definition; enhancement is text→text but shares this gate so both
// tools expose one model picker and one rule in the UI. Returns the model
// instance or an error message for a 400.
function resolveVisionModel(modelId) {
  const modelRecord = dbUtils.getEnabledModelWithProvider(modelId);
  if (!modelRecord) {
    return { error: `Model ${modelId} is disabled or not registered` };
  }
  if (!modelRecord.supports_vision) {
    return {
      error: `Model ${modelId} does not support vision. Choose a vision-capable chat model.`,
    };
  }
  return { model: getModelInstance(modelRecord, decryptApiKey) };
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
  referenceIds,
}) {
  const fileId = randomUUID();
  const extension = mimeType === "image/webp" ? "webp" : mimeType.split("/")[1] || "png";
  const filename = `generated_${Date.now()}.${extension}`;
  const storedFilename = createStoredFilename(fileId, filename);
  const filePath = path.join(GENERATED_DIR, storedFilename);

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
      references: referenceIds && referenceIds.length > 0 ? referenceIds : null,
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
    referenceFileIds,
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
  let model = null;

  if (modelId) {
    model = dbUtils.getEnabledModelWithProvider(modelId);
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

  let references = null;
  if (referenceFileIds) {
    if (
      !Array.isArray(referenceFileIds) ||
      referenceFileIds.length === 0 ||
      referenceFileIds.length > IMAGE_GENERATION.MAX_REFERENCE_IMAGES
    ) {
      return c.json(
        {
          error: `referenceFileIds must be an array of 1 to ${IMAGE_GENERATION.MAX_REFERENCE_IMAGES} file ids`,
        },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const referenceFiles = dbUtils.getFilesByIdsForUser(referenceFileIds, user.id);
    if (referenceFiles.length !== referenceFileIds.length) {
      return c.json({ error: "A reference file was not found" }, HTTP_STATUS.NOT_FOUND);
    }

    const nonImage = referenceFiles.find((file) => !file.mime_type?.startsWith("image/"));
    if (nonImage) {
      return c.json(
        { error: `Reference file ${nonImage.filename} is not an image` },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const modelMetadata = model ? { supports_image_to_image: model.supports_image_to_image } : null;
    if (!supportsImageToImage(providerName, modelMetadata, modelIdentifier)) {
      return c.json(
        {
          error: `Model ${modelIdentifier} does not support image-to-image editing. Remove the reference images or choose a model that does.`,
        },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    references = [];
    for (const file of referenceFiles) {
      const buffer = await readFile(path.join(PROJECT_ROOT, file.path));
      references.push({ buffer, mimeType: file.mime_type });
    }
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
          references,
        }),
      };
    } catch (error) {
      return { index, error: normalizeProviderError(error) };
    }
  });

  const results = await runWithConcurrency(tasks, MAX_CONCURRENT_GENERATIONS);

  await ensureGeneratedDirectory();
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
      referenceIds: referenceFileIds,
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

imagesRouter.post(
  "/reverse-prompt",
  createRateLimiter(ENDPOINT_RATE_LIMITS.IMAGE_GEN),
  async (c) => {
    const user = c.get("user");
    const body = await c.req.json();
    const { fileId, length = "standard", modelId } = body;

    if (!modelId) {
      return c.json({ error: "modelId is required" }, HTTP_STATUS.BAD_REQUEST);
    }

    const file = dbUtils.getFileByIdAndUser(fileId, user.id);
    if (!file) {
      return c.json({ error: "File not found" }, HTTP_STATUS.NOT_FOUND);
    }
    if (!file.mime_type?.startsWith("image/")) {
      return c.json({ error: `File ${file.filename} is not an image` }, HTTP_STATUS.BAD_REQUEST);
    }
    if (!REVERSE_PROMPT_LENGTHS[length]) {
      return c.json(
        { error: `length must be one of: ${Object.keys(REVERSE_PROMPT_LENGTHS).join(", ")}` },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { model, error: modelError } = resolveVisionModel(modelId);
    if (modelError) {
      return c.json({ error: modelError }, HTTP_STATUS.BAD_REQUEST);
    }

    let buffer;
    try {
      buffer = await readFile(path.join(PROJECT_ROOT, file.path));
    } catch {
      return c.json({ error: "File content is not available" }, HTTP_STATUS.NOT_FOUND);
    }

    try {
      const { text } = await generateText({
        model,
        system: buildReversePromptSystemPrompt(length),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image as a reusable generation prompt." },
              { type: "image", image: buffer },
            ],
          },
        ],
        maxTokens: 2000,
      });
      return c.json({ prompt: text.trim() });
    } catch (error) {
      console.error("Reverse prompt failed:", error);
      return c.json({ error: "Reverse prompt failed. Please try again." }, HTTP_STATUS.BAD_GATEWAY);
    }
  }
);

imagesRouter.post(
  "/enhance-prompt",
  createRateLimiter(ENDPOINT_RATE_LIMITS.IMAGE_GEN),
  async (c) => {
    const body = await c.req.json();
    const { prompt, modelId } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Prompt is required" }, HTTP_STATUS.BAD_REQUEST);
    }
    if (!modelId) {
      return c.json({ error: "modelId is required" }, HTTP_STATUS.BAD_REQUEST);
    }

    const { model, error: modelError } = resolveVisionModel(modelId);
    if (modelError) {
      return c.json({ error: modelError }, HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const { text } = await generateText({
        model,
        system: ENHANCE_PROMPT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt.trim() }],
        maxTokens: 1500,
      });
      return c.json({ prompt: text.trim() });
    } catch (error) {
      console.error("Prompt enhancement failed:", error);
      return c.json(
        { error: "Prompt enhancement failed. Please try again." },
        HTTP_STATUS.BAD_GATEWAY
      );
    }
  }
);
