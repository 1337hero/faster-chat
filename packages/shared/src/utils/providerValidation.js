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
 * Check if provider is a local provider (runs on user's machine)
 * @param {string} providerId - Provider identifier
 * @param {object} provider - Optional provider object with category/type fields
 * @returns {boolean}
 */
export function isLocalProvider(providerId, provider = null) {
  // Check provider object fields first
  if (provider?.category === "local") return true;
  if (provider?.type === "openai-compatible") return true;
  if (provider?.requiresApiKey === false) return true;

  // Fall back to ID-based detection
  return categorizeProvider(providerId) === "local";
}

/**
 * Check if provider requires API key
 * Local providers typically don't require API keys
 * @param {string} providerId - Provider identifier
 * @param {object} provider - Optional provider object
 * @returns {boolean}
 */
export function requiresApiKey(providerId, provider = null) {
  // Explicit flag takes precedence
  if (provider?.requiresApiKey === false) return false;
  if (provider?.requiresApiKey === true) return true;

  return !isLocalProvider(providerId, provider);
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

/**
 * Get the appropriate base URL for a provider based on environment
 * @param {object} provider - Provider object with baseUrlPlaceholder, baseUrlPlaceholderDev, api, id
 * @param {boolean} isDev - Whether running in development mode
 * @returns {string} The base URL to use
 */
export function getProviderBaseUrl(provider, isDev = false) {
  // Provider has explicit placeholder
  if (provider.baseUrlPlaceholder) {
    return isDev && provider.baseUrlPlaceholderDev
      ? provider.baseUrlPlaceholderDev
      : provider.baseUrlPlaceholder;
  }

  // Provider has API endpoint from models.dev
  if (provider.api) {
    return provider.api;
  }

  // Special case defaults for known local providers
  const localDefaults = {
    ollama: isDev ? "http://localhost:11434" : "http://host.docker.internal:11434",
    lmstudio: "http://127.0.0.1:1234/v1",
  };

  const id = (provider.id || provider.name || "").toLowerCase();
  if (localDefaults[id]) {
    return localDefaults[id];
  }

  // OpenRouter special case
  if (id === "openrouter") {
    return "https://openrouter.ai/api/v1";
  }

  return "";
}
