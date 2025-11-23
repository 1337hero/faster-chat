import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createAzure } from "@ai-sdk/azure";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { createMistral } from "@ai-sdk/mistral";
import { createGroq } from "@ai-sdk/groq";
import { createCohere } from "@ai-sdk/cohere";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createXai } from "@ai-sdk/xai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createCerebras } from "@ai-sdk/cerebras";
import { createFireworks } from "@ai-sdk/fireworks";
import { PROVIDER_DEFAULTS, shouldUseChatMethod } from "@faster-chat/shared";

/**
 * Registry of provider factory functions
 * Maps provider names to their initialization functions
 */
const PROVIDER_FACTORIES = {
  anthropic: (config) => createAnthropic({ apiKey: config.apiKey }),

  openai: (config) => createOpenAI({ apiKey: config.apiKey }),

  azure: (config) =>
    createAzure({
      apiKey: config.apiKey,
      resourceName: config.baseUrl || process.env.AZURE_RESOURCE_NAME,
    }),

  google: (config) => createGoogleGenerativeAI({ apiKey: config.apiKey }),

  "google-vertex": (config) =>
    createVertex({
      project: process.env.GOOGLE_VERTEX_PROJECT,
      location: process.env.GOOGLE_VERTEX_LOCATION || PROVIDER_DEFAULTS.GOOGLE_VERTEX_LOCATION,
    }),

  mistral: (config) => createMistral({ apiKey: config.apiKey }),

  groq: (config) => createGroq({ apiKey: config.apiKey }),

  cohere: (config) => createCohere({ apiKey: config.apiKey }),

  "amazon-bedrock": (config) =>
    createAmazonBedrock({
      region: process.env.AWS_REGION || PROVIDER_DEFAULTS.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }),

  xai: (config) => createXai({ apiKey: config.apiKey }),

  deepseek: (config) => createDeepSeek({ apiKey: config.apiKey }),

  cerebras: (config) => createCerebras({ apiKey: config.apiKey }),

  fireworks: (config) => createFireworks({ apiKey: config.apiKey }),

  ollama: (config) =>
    createOpenAI({
      baseURL: config.baseUrl || PROVIDER_DEFAULTS.OLLAMA_BASE_URL,
      apiKey: config.apiKey || "ollama",
    }),
};

/**
 * Create a provider instance
 * @param {string} providerName - Name of the provider
 * @param {object} config - Configuration object with apiKey and baseUrl
 * @returns {object} Provider instance
 */
export function createProviderInstance(providerName, config) {
  const factory = PROVIDER_FACTORIES[providerName];

  if (factory) {
    return factory(config);
  }

  // Default: OpenAI-compatible provider
  return createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey || "local",
  });
}

/**
 * Get a fully configured model instance
 * @param {object} modelRecord - Model record from database
 * @param {function} decryptApiKey - Function to decrypt API key
 * @returns {object} Model instance ready for use
 */
export function getModelInstance(modelRecord, decryptApiKey) {
  const config = {
    apiKey: modelRecord.provider_encrypted_key
      ? decryptApiKey(
          modelRecord.provider_encrypted_key,
          modelRecord.provider_iv,
          modelRecord.provider_auth_tag
        )
      : "",
    baseUrl: modelRecord.provider_base_url,
  };

  const provider = createProviderInstance(modelRecord.provider_name, config);
  const useChatMethod = shouldUseChatMethod(modelRecord.provider_name);

  return useChatMethod ? provider.chat(modelRecord.model_id) : provider(modelRecord.model_id);
}
