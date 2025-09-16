import { ModelId, ModelConfig } from "@/types/models";

export const ModelRegistry: Record<ModelId, ModelConfig> = {
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
  "deepseek-r1-distill-qwen-32b": {
    name: "DeepSeek R1 Distill Qwen 32B",
    contextWindow: 128000,
    provider: "groq",
    modelId: "deepseek-r1-distill-qwen-32b",
  },
  "deepseek-r1-distill-llama-70b-specdec": {
    name: "DeepSeek R1 Distill Llama 70B Specdec",
    contextWindow: 128000,
    provider: "groq",
    modelId: "deepseek-r1-distill-llama-70b-specdec",
  },
  "deepseek-r1-distill-llama-70b": {
    name: "DeepSeek R1 Distill Llama 70B",
    contextWindow: 128000,
    provider: "groq",
    modelId: "deepseek-r1-distill-llama-70b",
  },
  "qwen-2.5-32b": {
    name: "Qwen 2.5 32B",
    contextWindow: 128000,
    provider: "groq",
    modelId: "qwen-2.5-32b",
  },
  "mixtral-8x7b-32768": {
    name: "Mixtral 8x7B 32K",
    contextWindow: 32768,
    provider: "groq",
    modelId: "mixtral-8x7b-32768",
  },
};
