import { Hono } from "hono";
import { z } from "zod";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import { dbUtils } from "../lib/db.js";
import { ensureSession } from "../middleware/auth.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import {
  generateFileId,
  sanitizeFilename,
  createStoredFilename,
  validateFile,
  calculateFileHash,
  deleteFileFromDisk,
  formatFileSize,
  ensureUploadDirectory,
  validateFileAccess,
  FILE_CONFIG,
} from "../lib/fileUtils.js";

export const filesRouter = new Hono();

// Apply auth middleware to all routes
filesRouter.use("/*", ensureSession);

/**
 * POST /api/files
 * Upload a file
 */
filesRouter.post("/", async (c) => {
  try {
    const user = c.get("user");
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No file provided" }, HTTP_STATUS.BAD_REQUEST);
    }

    // Validate file type and size
    const validation = validateFile(file.type, file.size);
    if (!validation.valid) {
      return c.json({ error: validation.error }, HTTP_STATUS.BAD_REQUEST);
    }

    // Generate file ID and create stored filename
    const fileId = generateFileId();
    const storedFilename = createStoredFilename(fileId, file.name);
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, storedFilename);

    // Read file contents
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate file hash (for future deduplication)
    const fileHash = calculateFileHash(buffer);

    // Ensure upload directory exists
    await ensureUploadDirectory();

    // Save file to disk
    await writeFile(filePath, buffer);

    // Save file metadata to database
    const relativePath = path.join("server/data/uploads", storedFilename);
    const fileRecord = dbUtils.createFile(
      fileId,
      user.id,
      file.name,
      storedFilename,
      relativePath,
      file.type,
      file.size,
      fileHash,
      {
        originalName: file.name,
        uploadedAt: Date.now(),
      }
    );

    if (!fileRecord) {
      // Cleanup file if database insert failed
      await deleteFileFromDisk(filePath);
      return c.json({ error: "Failed to save file metadata" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    // Return file metadata
    return c.json({
      id: fileId,
      filename: file.name,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.type,
      hash: fileHash,
      createdAt: Date.now(),
    });
  } catch (error) {
    console.error("File upload error:", error);
    return c.json({ error: "File upload failed" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/files/:id
 * Get file metadata
 */
filesRouter.get("/:id", async (c) => {
  try {
    const user = c.get("user");
    const fileId = c.req.param("id");

    const file = dbUtils.getFileById(fileId);
    const access = validateFileAccess(file, user);
    if (!access.authorized) {
      const statusCode = access.reason === "File not found" ? 404 : 403;
      return c.json({ error: access.reason }, statusCode);
    }

    // Return metadata
    return c.json({
      id: file.id,
      filename: file.filename,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mime_type,
      hash: file.hash,
      createdAt: file.created_at,
      meta: file.meta,
    });
  } catch (error) {
    console.error("Get file metadata error:", error);
    return c.json({ error: "Failed to get file metadata" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/files/:id/content
 * Download file content
 */
filesRouter.get("/:id/content", async (c) => {
  try {
    const user = c.get("user");
    const fileId = c.req.param("id");

    const file = dbUtils.getFileById(fileId);
    const access = validateFileAccess(file, user);
    if (!access.authorized) {
      const statusCode = access.reason === "File not found" ? 404 : 403;
      return c.json({ error: access.reason }, statusCode);
    }

    // Read file from disk
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename);
    const fileContent = await readFile(filePath);

    // Set appropriate headers
    c.header("Content-Type", file.mime_type || "application/octet-stream");
    c.header("Content-Length", file.size.toString());
    c.header("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);

    // Return file content
    return c.body(fileContent);
  } catch (error) {
    console.error("Get file content error:", error);
    if (error.code === "ENOENT") {
      return c.json({ error: "File not found on disk" }, HTTP_STATUS.NOT_FOUND);
    }
    return c.json({ error: "Failed to retrieve file" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * DELETE /api/files/:id
 * Delete a file
 */
filesRouter.delete("/:id", async (c) => {
  try {
    const user = c.get("user");
    const fileId = c.req.param("id");

    const file = dbUtils.getFileById(fileId);
    const access = validateFileAccess(file, user);
    if (!access.authorized) {
      const statusCode = access.reason === "File not found" ? 404 : 403;
      return c.json({ error: access.reason }, statusCode);
    }

    // Delete from disk
    const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename);
    await deleteFileFromDisk(filePath);

    // Delete from database
    const deleted = dbUtils.deleteFile(fileId);

    if (!deleted) {
      return c.json(
        { error: "Failed to delete file from database" },
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    return c.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return c.json({ error: "Failed to delete file" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/files
 * List all files for the current user
 */
filesRouter.get("/", async (c) => {
  try {
    const user = c.get("user");

    // Get all files for user
    const files = dbUtils.getFilesByUserId(user.id);

    // Format response
    const formattedFiles = files.map((file) => ({
      id: file.id,
      filename: file.filename,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      mimeType: file.mime_type,
      createdAt: file.created_at,
    }));

    return c.json({
      files: formattedFiles,
      total: formattedFiles.length,
    });
  } catch (error) {
    console.error("List files error:", error);
    return c.json({ error: "Failed to list files" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});
