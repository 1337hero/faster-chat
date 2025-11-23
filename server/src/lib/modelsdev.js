/**
 * Integration with models.dev - a community-maintained database of AI models
 * https://models.dev/api.json
 */

import {
  TIMEOUTS,
  CACHE_DURATIONS,
  categorizeProvider,
  getProviderType,
  requiresBaseUrl as checkRequiresBaseUrl,
} from "@faster-chat/shared";

let cachedDatabase = null;
let lastFetchTime = null;
const CACHE_DURATION = CACHE_DURATIONS.MODELS_DEV;

/**
 * Fetch the models.dev database
 * Caches in memory for 1 hour
 */
export async function fetchModelsDevDatabase() {
  const now = Date.now();

  // Return cached if still valid
  if (cachedDatabase && lastFetchTime && now - lastFetchTime < CACHE_DURATION) {
    return cachedDatabase;
  }

  try {
    console.log("Fetching models.dev database...");
    const response = await fetch("https://models.dev/api.json", {
      headers: {
        "User-Agent": "faster-chat",
      },
      signal: AbortSignal.timeout(TIMEOUTS.MODELS_DEV_FETCH),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models.dev: ${response.status}`);
    }

    cachedDatabase = await response.json();
    lastFetchTime = now;
    console.log(`Loaded ${Object.keys(cachedDatabase).length} providers from models.dev`);

    return cachedDatabase;
  } catch (error) {
    console.error("Error fetching models.dev:", error.message);
    // Return cached data if available, even if expired
    if (cachedDatabase) {
      console.log("Using expired cache due to fetch error");
      return cachedDatabase;
    }
    throw error;
  }
}

/**
 * Get cached database without fetching
 */
export function getCachedDatabase() {
  return cachedDatabase;
}

/**
 * Get information about a specific provider
 */
export async function getProviderInfo(providerName) {
  const db = await fetchModelsDevDatabase();
  return db[providerName] || null;
}

/**
 * Get all available providers grouped by category
 */
export async function getAvailableProviders() {
  const db = await fetchModelsDevDatabase();

  const providers = Object.entries(db).map(([id, info]) => ({
    id,
    name: info.name,
    displayName: info.name,
    description: getProviderDescription(id, info),
    category: categorizeProvider(id),
    env: info.env || [],
    api: info.api,
    npm: info.npm,
    requiresBaseUrl: checkRequiresBaseUrl(id, info),
    modelCount: Object.keys(info.models || {}).length,
  }));

  // Add manual providers that aren't in models.dev
  // This includes local providers AND major providers like Anthropic
  const manualProviders = [
    // Local providers
    {
      id: "ollama",
      name: "Ollama",
      displayName: "Ollama",
      description: "Local models via Ollama (dynamically fetched from your instance)",
      category: "local",
      env: [],
      api: null,
      npm: "@ai-sdk/openai-compatible",
      requiresBaseUrl: true,
      modelCount: 0, // Fetched dynamically
    },
    {
      id: "llama-cpp",
      name: "llama.cpp",
      displayName: "llama.cpp",
      description: "Local models via llama.cpp server (OpenAI-compatible API)",
      category: "local",
      env: [],
      api: null,
      npm: "@ai-sdk/openai-compatible",
      requiresBaseUrl: true,
      modelCount: 0,
    },
    {
      id: "llamafile",
      name: "llamafile",
      displayName: "llamafile",
      description: "Single-file local LLM runtime",
      category: "local",
      env: [],
      api: null,
      npm: "@ai-sdk/openai-compatible",
      requiresBaseUrl: true,
      modelCount: 0,
    },
  ];

  // Add manual providers to the list
  providers.push(...manualProviders);

  // Sort: local first, then official, then community
  const order = { local: 0, official: 1, community: 2 };
  providers.sort((a, b) => {
    const catDiff = order[a.category] - order[b.category];
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name);
  });

  return providers;
}

/**
 * Generate a description for a provider
 */
function getProviderDescription(id, info) {
  const modelCount = Object.keys(info.models || {}).length;

  // Custom descriptions for known providers
  const descriptions = {
    ollama: "Local models via Ollama (dynamically fetched from your instance)",
    openai: "GPT-4, GPT-4o, and other OpenAI models",
    anthropic: "Claude 3.x and 4.x models",
    "google-vertex": "Gemini models via Google Cloud Vertex AI",
    google: "Gemini models via Google AI Studio",
    "amazon-bedrock": "AWS Bedrock models (Claude, Llama, etc.)",
    lmstudio: "Local models via LM Studio",
    "llama-cpp": "Local models via llama.cpp server",
    openrouter: "Access 100+ models through a unified API",
    groq: "Ultra-fast inference with Llama, Mixtral, and more",
  };

  if (descriptions[id]) {
    return descriptions[id];
  }

  // Generate generic description
  return `${modelCount} model${modelCount !== 1 ? "s" : ""} available`;
}

/**
 * Get models for a specific provider
 */
export async function getModelsForProvider(providerName) {
  const providerInfo = await getProviderInfo(providerName);
  if (!providerInfo || !providerInfo.models) {
    return [];
  }

  return Object.entries(providerInfo.models).map(([id, model]) => ({
    model_id: id,
    display_name: model.name || id,
    enabled: !model.experimental && model.status !== "deprecated",
    metadata: {
      context_window: model.limit?.context || 0,
      max_output_tokens: model.limit?.output || 0,
      input_price_per_1m: model.cost?.input || 0,
      output_price_per_1m: model.cost?.output || 0,
      cache_read_price_per_1m: model.cost?.cache_read || 0,
      cache_write_price_per_1m: model.cost?.cache_write || 0,
      supports_streaming: true, // Assume true for most models
      supports_vision: model.modalities?.input?.includes("image") || model.attachment,
      supports_tools: model.tool_call !== false,
      supports_reasoning: model.reasoning || false,
      release_date: model.release_date,
      knowledge_cutoff: model.knowledge,
      experimental: model.experimental || false,
      status: model.status,
    },
  }));
}

// Auto-fetch on startup with retry
let initPromise = null;
export function initializeModelsDevCache() {
  if (initPromise) return initPromise;

  initPromise = fetchModelsDevDatabase().catch((error) => {
    console.error("Failed to initialize models.dev cache:", error.message);
    // Retry after 30 seconds
    setTimeout(() => {
      initPromise = null;
      initializeModelsDevCache();
    }, 30000);
  });

  return initPromise;
}

// Auto-refresh every hour
setInterval(() => {
  fetchModelsDevDatabase().catch((error) => {
    console.error("Failed to refresh models.dev cache:", error.message);
  });
}, CACHE_DURATION);
