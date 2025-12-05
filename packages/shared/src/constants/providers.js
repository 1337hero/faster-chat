/**
 * AI Provider Metadata
 * Defines all supported AI providers, their capabilities, and configuration requirements
 */

export const PROVIDERS = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    displayName: "Anthropic (Claude)",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://console.anthropic.com/",
    docs: "https://docs.anthropic.com/",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    displayName: "OpenAI (GPT)",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://platform.openai.com/",
    docs: "https://platform.openai.com/docs/",
  },
  azure: {
    id: "azure",
    name: "Azure",
    displayName: "Azure OpenAI",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: true, // Resource name
    baseUrlLabel: "Resource Name",
    baseUrlPlaceholder: "my-resource",
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
    docs: "https://learn.microsoft.com/en-us/azure/ai-services/openai/",
  },
  google: {
    id: "google",
    name: "Google",
    displayName: "Google (Gemini)",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://ai.google.dev/",
    docs: "https://ai.google.dev/docs",
  },
  "google-vertex": {
    id: "google-vertex",
    name: "Google Vertex",
    displayName: "Google Vertex AI",
    type: "official",
    requiresApiKey: false, // Uses service account
    requiresBaseUrl: false,
    requiresEnvVars: ["GOOGLE_VERTEX_PROJECT", "GOOGLE_VERTEX_LOCATION"],
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://cloud.google.com/vertex-ai",
    docs: "https://cloud.google.com/vertex-ai/docs",
  },
  xai: {
    id: "xai",
    name: "xAI",
    displayName: "xAI (Grok)",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    supportsLiveSearch: true,
    website: "https://x.ai/",
    docs: "https://docs.x.ai/",
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    displayName: "Mistral AI",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://mistral.ai/",
    docs: "https://docs.mistral.ai/",
  },
  groq: {
    id: "groq",
    name: "Groq",
    displayName: "Groq",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: false,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://groq.com/",
    docs: "https://console.groq.com/docs/",
  },
  cohere: {
    id: "cohere",
    name: "Cohere",
    displayName: "Cohere",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: false,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://cohere.com/",
    docs: "https://docs.cohere.com/",
  },
  "amazon-bedrock": {
    id: "amazon-bedrock",
    name: "Amazon Bedrock",
    displayName: "Amazon Bedrock",
    type: "official",
    requiresApiKey: false,
    requiresBaseUrl: false,
    requiresEnvVars: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://aws.amazon.com/bedrock/",
    docs: "https://docs.aws.amazon.com/bedrock/",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    displayName: "DeepSeek",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: false,
    supportsTools: true,
    supportsStreaming: true,
    supportsReasoning: true,
    website: "https://www.deepseek.com/",
    docs: "https://platform.deepseek.com/",
  },
  cerebras: {
    id: "cerebras",
    name: "Cerebras",
    displayName: "Cerebras",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: false,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://cerebras.ai/",
    docs: "https://inference-docs.cerebras.ai/",
  },
  fireworks: {
    id: "fireworks",
    name: "Fireworks",
    displayName: "Fireworks AI",
    type: "official",
    requiresApiKey: true,
    requiresBaseUrl: false,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://fireworks.ai/",
    docs: "https://docs.fireworks.ai/",
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    displayName: "Ollama (Local)",
    type: "openai-compatible",
    requiresApiKey: false,
    requiresBaseUrl: true,
    baseUrlPlaceholder: "http://host.docker.internal:11434/v1",
    baseUrlPlaceholderDev: "http://localhost:11434/v1",
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
    website: "https://ollama.ai/",
    docs: "https://github.com/ollama/ollama/blob/main/docs/api.md",
  },
};

/**
 * Get list of all providers
 */
export function getAvailableProviders() {
  return Object.values(PROVIDERS);
}

/**
 * Get provider by ID
 */
export function getProvider(id) {
  return PROVIDERS[id];
}

/**
 * Get official (native SDK) providers
 */
export function getOfficialProviders() {
  return Object.values(PROVIDERS).filter((p) => p.type === "official");
}

/**
 * Get OpenAI-compatible providers
 */
export function getOpenAICompatibleProviders() {
  return Object.values(PROVIDERS).filter((p) => p.type === "openai-compatible");
}
