/**
 * Centralized Configuration Constants
 * All magic numbers and configuration values in one place
 */

/** API Timeout Values (in milliseconds) */
export const TIMEOUTS = {
  MODELS_DEV_FETCH: 10000, // 10 seconds - Fetching provider list from models.dev
  OLLAMA_FETCH: 5000, // 5 seconds - Fetching models from local Ollama
  PROVIDER_API_CALL: 30000, // 30 seconds - Standard API call timeout
};

/** Cache Duration Values (in milliseconds) */
export const CACHE_DURATIONS = {
  MODELS_DEV: 60 * 60 * 1000, // 1 hour - Cache models.dev database
  PROVIDER_LIST: 60 * 60 * 1000, // 1 hour - Cache available providers list
};

/** Provider Default Configuration Values */
export const PROVIDER_DEFAULTS = {
  GOOGLE_VERTEX_LOCATION: "us-central1",
  AWS_REGION: "us-east-1",
  OLLAMA_BASE_URL: "http://localhost:11434/v1",
};

/** Message Processing Constants */
export const MESSAGE_CONSTANTS = {
  /** Maximum messages to keep in history for context */
  MAX_HISTORY: 64,
  /** Time window for message deduplication (in milliseconds) */
  DEDUPLICATION_WINDOW_MS: 5000,
  /** Threshold for considering messages "similar" in timestamp sorting */
  TIMESTAMP_SIMILARITY_MS: 5000,
};

/** AI Completion Constants */
export const COMPLETION_CONSTANTS = {
  /** Maximum tokens for completion responses */
  MAX_TOKENS: 4096,
};

/** AI Model Feature Detection */
export const MODEL_FEATURES = {
  /**
   * Check if model supports prompt caching
   * @param {string} modelId - The model identifier
   * @returns {boolean} True if model supports caching
   */
  SUPPORTS_PROMPT_CACHING: (modelId) => modelId.includes("claude"),

  /** Number of recent messages to include in cache */
  CACHE_LAST_N_MESSAGES: 2,

  /** Cache type for prompt caching */
  CACHE_TYPE: "ephemeral",
};
