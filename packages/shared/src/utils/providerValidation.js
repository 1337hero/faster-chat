/**
 * Provider Validation and Categorization Utilities
 * Centralized logic for provider type detection and validation
 */

/**
 * Lists of providers by category
 */
export const PROVIDER_LISTS = {
  LOCAL: ["ollama", "lmstudio", "llama-cpp", "llamafile"],
  OFFICIAL: ["openai", "anthropic", "google", "cohere", "mistral", "azure", "google-vertex", "amazon-bedrock"],
  OPENAI_COMPATIBLE: [
    "ollama",
    "lmstudio",
    "llama-cpp",
    "groq",
    "openrouter",
    "together",
    "perplexity",
  ],
};

/**
 * Categorize a provider as local, official, or community
 * @param {string} providerId - Provider identifier
 * @returns {"local" | "official" | "community"}
 */
export function categorizeProvider(providerId) {
  const id = providerId.toLowerCase();

  if (PROVIDER_LISTS.LOCAL.some(name => id.includes(name))) {
    return "local";
  }

  if (PROVIDER_LISTS.OFFICIAL.some(name => id.includes(name))) {
    return "official";
  }

  return "community";
}

/**
 * Determine if provider uses OpenAI-compatible API
 * @param {string} providerId - Provider identifier
 * @param {object} providerInfo - Optional provider info from models.dev
 * @returns {boolean}
 */
export function isOpenAICompatible(providerId, providerInfo) {
  const id = providerId.toLowerCase();

  // Check against known OpenAI-compatible providers
  if (PROVIDER_LISTS.OPENAI_COMPATIBLE.some(name => id.includes(name))) {
    return true;
  }

  // Check npm package hint from models.dev
  if (providerInfo?.npm?.includes("openai-compatible")) {
    return true;
  }

  return false;
}

/**
 * Determine if provider should use .chat() method
 * Ollama and OpenAI-compatible providers use .chat()
 * Native SDK providers use direct invocation
 * @param {string} providerId - Provider identifier
 * @returns {boolean}
 */
export function shouldUseChatMethod(providerId) {
  const id = providerId.toLowerCase();

  // Ollama and unknown/custom providers use .chat() method
  if (id === "ollama") return true;

  // OpenAI-compatible providers use .chat()
  if (isOpenAICompatible(id)) return true;

  // Native SDK providers don't use .chat()
  if (PROVIDER_LISTS.OFFICIAL.some(name => id.includes(name))) {
    return false;
  }

  // Default to .chat() for unknown providers (OpenAI-compatible fallback)
  return true;
}

/**
 * Determine provider type for AI SDK implementation
 * @param {string} providerId - Provider identifier
 * @param {object} providerInfo - Optional provider info from models.dev
 * @returns {"official" | "openai-compatible"}
 */
export function getProviderType(providerId, providerInfo) {
  const id = providerId.toLowerCase();

  // Known official providers with native SDKs
  if (id === "openai" || id === "anthropic") {
    return "official";
  }

  // OpenAI-compatible providers
  if (isOpenAICompatible(id, providerInfo)) {
    return "openai-compatible";
  }

  // Default to openai-compatible for safety
  return "openai-compatible";
}

/**
 * Check if provider requires API key
 * Local providers typically don't require API keys
 * @param {string} providerId - Provider identifier
 * @returns {boolean}
 */
export function requiresApiKey(providerId) {
  return categorizeProvider(providerId) !== "local";
}

/**
 * Check if provider requires base URL configuration
 * Local and custom providers require base URL
 * @param {string} providerId - Provider identifier
 * @param {object} providerInfo - Optional provider info from models.dev
 * @returns {boolean}
 */
export function requiresBaseUrl(providerId, providerInfo) {
  // Local providers always need base URL
  if (categorizeProvider(providerId) === "local") {
    return true;
  }

  // If no default API from models.dev, needs custom URL
  if (providerInfo && !providerInfo.api) {
    return true;
  }

  return false;
}
