/**
 * Import Constants
 *
 * Configuration for conversation import features.
 */

export const IMPORT_CONSTANTS = {
  // File Size Limits
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_FILE_SIZE_MB: 50,

  // Supported Formats
  SUPPORTED_EXTENSION: '.json',

  // Import Sources
  SOURCES: {
    CHATGPT: 'chatgpt',
  },

  // API Endpoints
  ENDPOINTS: {
    VALIDATE: '/api/import/validate',
    CHATGPT: '/api/import/chatgpt',
  },

  // Preview Settings
  PREVIEW_LENGTH: 100, // Characters to show in message preview
};

// Valid message roles for imported conversations
export const IMPORT_VALID_ROLES = new Set(['user', 'assistant', 'system']);

// Default role when import doesn't specify
export const IMPORT_DEFAULT_ROLE = 'user';

// Time conversion (ChatGPT uses Unix seconds, we use milliseconds)
export const MS_PER_SECOND = 1000;

/**
 * Convert Unix timestamp (seconds) to milliseconds
 */
export const unixToMs = (unixTimestamp) =>
  unixTimestamp ? unixTimestamp * MS_PER_SECOND : Date.now();
