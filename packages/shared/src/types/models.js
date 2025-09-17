/**
 * @typedef {("claude-sonnet-4-5" | "claude-haiku-4-5" | "claude-opus-4-1" | "gpt-5-mini" | "gpt-5-nano" | "gpt-5.1-flagship" | "gpt-4o" | "ollama-gemma3-12b" | "ollama-llama" | "ollama-deepseek-r1-14b" | "ollama-qwen3-coder-30b" | "ollama-gpt-oss-20b")} ModelId
 */

/**
 * @typedef {("anthropic" | "openai" | "ollama")} Provider
 */

/**
 * @typedef {Object} ModelConfig
 * @property {string} name
 * @property {number} contextWindow
 * @property {Provider} provider
 * @property {string} [modelId] - Optional override for API calls
 */
