import { Hono } from "hono";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { IMAGE_GENERATION, IMAGE_MODELS } from "@faster-chat/shared";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import {
  generateFileId,
  createStoredFilename,
  calculateFileHash,
  FILE_CONFIG,
} from "../lib/fileUtils.js";
import { createReplicateClient, generateImage, downloadImage } from "../lib/imageGeneration.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const GENERATED_DIR = path.join(PROJECT_ROOT, "server/data/uploads", IMAGE_GENERATION.GENERATED_DIR);

export const imagesRouter = new Hono();

// Apply auth middleware to all routes
imagesRouter.use("/*", ensureSession);

/**
 * Ensure generated images directory exists
 */
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

/**
 * POST /api/images/generate
 * Generate an image using Replicate
 */
imagesRouter.post("/generate", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { prompt, aspectRatio = IMAGE_GENERATION.DEFAULT_ASPECT_RATIO, chatId } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Prompt is required" }, HTTP_STATUS.BAD_REQUEST);
    }

    // Get API key from environment (Phase 1: hardcoded source)
    // Phase 2: Will fetch from encrypted provider credentials in database
    const apiKey = process.env.REPLICATE_API_KEY;
    if (!apiKey) {
      return c.json(
        { error: "Image generation is not configured. Please set REPLICATE_API_KEY." },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Validate aspect ratio
    if (!IMAGE_GENERATION.ASPECT_RATIOS.includes(aspectRatio)) {
      return c.json(
        { error: `Invalid aspect ratio. Allowed: ${IMAGE_GENERATION.ASPECT_RATIOS.join(", ")}` },
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Create Replicate client and generate image
    const client = createReplicateClient(apiKey);
    const imageUrls = await generateImage(client, { prompt, aspectRatio });

    if (!imageUrls || imageUrls.length === 0) {
      return c.json({ error: "No images generated" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Download and save the first image (Phase 1: single image only)
    const imageUrl = imageUrls[0];
    const { buffer, mimeType } = await downloadImage(imageUrl);

    // Generate file metadata
    const fileId = generateFileId();
    const extension = mimeType === "image/webp" ? "webp" : mimeType.split("/")[1] || "png";
    const filename = `generated_${Date.now()}.${extension}`;
    const storedFilename = createStoredFilename(fileId, filename);
    const filePath = path.join(GENERATED_DIR, storedFilename);

    // Ensure directory exists and save file
    await ensureGeneratedDirectory();
    await writeFile(filePath, buffer);

    // Calculate hash and save to database
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
        model: IMAGE_MODELS.DEFAULT,
        modelDisplayName: IMAGE_MODELS.DISPLAY_NAME,
        aspectRatio,
        source: "replicate",
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
      model: IMAGE_MODELS.DEFAULT,
      modelDisplayName: IMAGE_MODELS.DISPLAY_NAME,
      prompt: prompt.trim(),
      aspectRatio,
    });
  } catch (error) {
    console.error("Image generation error:", error);

    // Handle specific Replicate errors
    if (error.message?.includes("Invalid API token")) {
      return c.json({ error: "Invalid Replicate API key" }, HTTP_STATUS.UNAUTHORIZED);
    }

    if (error.message?.includes("rate limit")) {
      return c.json({ error: "Rate limit exceeded. Please try again later." }, HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    return c.json(
      { error: error.message || "Image generation failed" },
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
});

/**
 * GET /api/images/status
 * Check if image generation is available
 */
imagesRouter.get("/status", async (c) => {
  const apiKey = process.env.REPLICATE_API_KEY;

  return c.json({
    available: !!apiKey,
    model: IMAGE_MODELS.DEFAULT,
    modelDisplayName: IMAGE_MODELS.DISPLAY_NAME,
  });
});
