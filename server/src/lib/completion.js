import { readFile } from "fs/promises";
import path from "path";
import { FILE_CATEGORIES, MODEL_FEATURES } from "@faster-chat/shared";
import {
  FILE_CONFIG,
  getAttachmentCategory,
  getAttachmentMediaType,
  formatInlineAttachmentText,
  MAX_INLINE_TEXT_ATTACHMENT_CHARS,
} from "./fileUtils.js";
import { extractOfficeText } from "./officeExtraction.js";

const MAX_MODEL_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export function mapAttachmentError(error) {
  const message = error.message || String(error);
  if (message.includes("maximum supported dimension")) {
    return { code: "ATTACHMENT_IMAGE_DIMENSIONS", error: message };
  }
  if (message.includes("media type") || message.includes("content type")) {
    return {
      code: "ATTACHMENT_UNSUPPORTED",
      error: "One or more attachments are not supported by the selected model.",
    };
  }
  return null;
}

export class AttachmentDenialError extends Error {
  constructor(issue) {
    super(issue.error);
    this.issue = issue;
  }
}

function createAttachmentDenial(file, { category, reason, suggestion, code }) {
  return {
    ok: false,
    code,
    error: "One or more attachments are not supported by the selected model.",
    details: [
      {
        filename: file.filename,
        category,
        reason,
        suggestion,
      },
    ],
  };
}

function inlineTextPart(file, size, text, totalCharCount) {
  return {
    type: "text",
    text: formatInlineAttachmentText({
      filename: file.filename,
      mimeType: file.mime_type,
      size,
      text,
      totalCharCount,
    }),
  };
}

async function fileToContentPart(file) {
  const filePath = path.join(FILE_CONFIG.UPLOAD_DIR, file.stored_filename);
  if (file.size > MAX_MODEL_ATTACHMENT_BYTES) {
    throw new Error(`Attachment ${file.filename} exceeds the per-file model limit`);
  }
  const fileBuffer = await readFile(filePath).catch((err) => {
    throw new Error(`Cannot read ${file.id} at ${filePath}: ${err.message}`);
  });

  switch (getAttachmentCategory(file)) {
    case FILE_CATEGORIES.IMAGE: {
      const mediaType = getAttachmentMediaType(file);
      return {
        type: "image",
        image: `data:${mediaType};base64,${fileBuffer.toString("base64")}`,
      };
    }

    case FILE_CATEGORIES.OFFICE_MODERN: {
      let extraction;
      try {
        extraction = extractOfficeText({
          buffer: fileBuffer,
          filename: file.filename,
          mimeType: file.mime_type,
        });
      } catch (err) {
        throw new Error(`Office document extraction failed for ${file.filename}: ${err.message}`);
      }
      if (!extraction.kind) {
        throw new AttachmentDenialError(
          createAttachmentDenial(file, {
            category: FILE_CATEGORIES.OFFICE_MODERN,
            code: "ATTACHMENT_UNSUPPORTED",
            reason: "Office document type could not be determined from filename or MIME type.",
            suggestion: "Upload a .docx, .xlsx, or .pptx file and try again.",
          })
        );
      }
      const text = extraction.text;
      const displayText = text.slice(0, MAX_INLINE_TEXT_ATTACHMENT_CHARS);
      const truncated = displayText.length < text.length;
      return inlineTextPart(
        file,
        fileBuffer.length,
        displayText,
        truncated ? text.length : undefined
      );
    }

    case FILE_CATEGORIES.TEXT_LIKE: {
      const fullText = fileBuffer.toString("utf8");
      const displayText = fullText.slice(0, MAX_INLINE_TEXT_ATTACHMENT_CHARS);
      const truncated = displayText.length < fullText.length;
      return inlineTextPart(
        file,
        fileBuffer.length,
        displayText,
        truncated ? fullText.length : undefined
      );
    }

    default:
      return {
        type: "file",
        data: fileBuffer,
        mediaType: getAttachmentMediaType(file),
        filename: file.filename,
      };
  }
}

export function applyCacheControl(messages, modelId) {
  if (!MODEL_FEATURES.SUPPORTS_PROMPT_CACHING(modelId)) {
    return messages;
  }

  return messages.map((msg, idx, arr) => {
    if (msg.role === "system") {
      return {
        ...msg,
        providerOptions: {
          anthropic: { cacheControl: { type: MODEL_FEATURES.CACHE_TYPE } },
        },
      };
    }

    const isRecentMessage = idx >= arr.length - MODEL_FEATURES.CACHE_LAST_N_MESSAGES;
    if (isRecentMessage && idx > 0) {
      return {
        ...msg,
        providerOptions: {
          anthropic: { cacheControl: { type: MODEL_FEATURES.CACHE_TYPE } },
        },
      };
    }

    return msg;
  });
}

export async function createMultimodalContent(message, fileIds, filesById) {
  const content = [];
  let totalBytes = 0;
  if (message.content.trim()) {
    content.push({ type: "text", text: message.content });
  }
  for (const id of fileIds) {
    const file = filesById.get(id);
    totalBytes += file?.size || 0;
    if (totalBytes > MAX_MODEL_ATTACHMENT_BYTES) {
      throw new Error("Combined attachments exceed the model request limit");
    }
    content.push(await fileToContentPart(file));
  }
  return content;
}

export async function convertToModelMessages(messages, systemPrompt, filesById = new Map()) {
  const result = systemPrompt ? [{ role: "system", content: systemPrompt }] : [];

  for (const msg of messages) {
    if (msg.role === "system") {
      continue;
    }

    const msgFileIds = msg.fileIds || [];
    if (msg.role === "user" && msgFileIds.length > 0) {
      const content = await createMultimodalContent(msg, msgFileIds, filesById);
      result.push({ role: msg.role, content });
    } else {
      result.push({ role: msg.role, content: msg.content });
    }
  }

  return result;
}
