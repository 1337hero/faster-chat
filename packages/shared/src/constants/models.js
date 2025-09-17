/**
 * @type {Record<string, {name: string, contextWindow: number, provider: string, modelId?: string}>}
 */
export const ModelRegistry = {
  // Anthropic Models
  "claude-sonnet-4-5": {
    name: "Claude Sonnet 4.5 🏆 (best)",
    contextWindow: 200000,
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
  },
  "claude-haiku-4-5": {
    name: "Claude Haiku 4.5 (⚡fast)",
    contextWindow: 200000,
    provider: "anthropic",
    modelId: "claude-3-5-haiku-20241022",
  },
  "claude-opus-4-1": {
    name: "Claude Opus 4.1 (thinking) 💪💪",
    contextWindow: 200000,
    provider: "anthropic",
    modelId: "claude-opus-4-20250514",
  },

  // OpenAI Models
  "gpt-5-mini": {
    name: "ChatGPT - 5 mini (everyday) 🔗",
    contextWindow: 128000,
    provider: "openai",
    modelId: "gpt-4o-mini",
  },
  "gpt-5-nano": {
    name: "ChatGPT - 5 nano (⚡fast) 🔗",
    contextWindow: 128000,
    provider: "openai",
    modelId: "gpt-4o-mini",
  },
  "gpt-5.1-flagship": {
    name: "ChatGPT - 5.1 (flagship) 🔗 ℹ️",
    contextWindow: 128000,
    provider: "openai",
    modelId: "gpt-4o",
  },
  "gpt-4o": {
    name: "ChatGPT - 4o (vibes) 🔗",
    contextWindow: 128000,
    provider: "openai",
    modelId: "gpt-4o",
  },

  // Ollama Local Models
  "ollama-gemma3-12b": {
    name: "gemma3:12b",
    contextWindow: 8192,
    provider: "ollama",
    modelId: "gemma3:12b",
  },
  "ollama-llama": {
    name: "llama ⚡",
    contextWindow: 128000,
    provider: "ollama",
    modelId: "llama",
  },
  "ollama-deepseek-r1-14b": {
    name: "deepseek-r1:14b",
    contextWindow: 64000,
    provider: "ollama",
    modelId: "deepseek-r1:14b",
  },
  "ollama-qwen3-coder-30b": {
    name: "qwen3-coder:30b-a3b-q4_K_M",
    contextWindow: 32000,
    provider: "ollama",
    modelId: "qwen3-coder:30b-a3b-q4_K_M",
  },
  "ollama-gpt-oss-20b": {
    name: "OpenAI - gpt-oss:20b 🔗",
    contextWindow: 8192,
    provider: "ollama",
    modelId: "gpt-oss:20b",
  },
};
