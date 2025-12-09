import { IMPORT_CONSTANTS } from "@faster-chat/shared";

/**
 * Validate import file format and structure via backend
 */
export async function validateImportFile(file) {
  // Check file extension
  if (!file.name.endsWith(IMPORT_CONSTANTS.SUPPORTED_EXTENSION)) {
    return {
      valid: false,
      error: `Only ${IMPORT_CONSTANTS.SUPPORTED_EXTENSION} files are supported.`,
    };
  }

  // Check file size
  if (file.size > IMPORT_CONSTANTS.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${IMPORT_CONSTANTS.MAX_FILE_SIZE_MB}MB.`,
    };
  }

  // Parse JSON
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return {
      valid: false,
      error: "Invalid JSON file. Please check the file format.",
    };
  }

  // Validate structure via backend
  try {
    const response = await fetch(IMPORT_CONSTANTS.ENDPOINTS.VALIDATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ data }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        valid: false,
        error: result.error || "Failed to validate import file",
      };
    }

    if (!result.valid) {
      return {
        valid: false,
        error: result.errors?.join(", ") || "Invalid import format",
      };
    }

    return {
      valid: true,
      data,
      preview: result.preview,
      stats: result.stats,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Failed to validate file: " + error.message,
    };
  }
}

/**
 * Import ChatGPT conversations via backend
 */
export async function importChatGPTConversations(data) {
  const response = await fetch(IMPORT_CONSTANTS.ENDPOINTS.CHATGPT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ data }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Import failed");
  }

  return result;
}
