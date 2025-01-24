import { ModelConfig } from "@/types/models";

export const ModelRegistry: Record<string, ModelConfig> = {
  "claude-3-opus-20240229": {
    name: "Claude 3 Opus",
    contextWindow: 200000,
    provider: "anthropic",
  },
  "claude-3-5-sonnet-20241022": {
    name: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    provider: "anthropic",
  },
  "gpt-4o": {
    name: "ChatGPT 4o",
    contextWindow: 128000,
    provider: "openai",
  },
  "gpt-4o-mini": {
    name: "ChatGPT 4o mini",
    contextWindow: 128000,
    provider: "openai",
  },
  "llama-3.3-70b-versatile": {
    name: "Llama 3.3 70B (Fastest)",
    contextWindow: 128000,
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
  },
  "deepseek-chat": {
    name: "DeepSeek Chat",
    contextWindow: 128000,
    provider: "deepseek",
    modelId: "deepseek-chat",
  },
} as const;
