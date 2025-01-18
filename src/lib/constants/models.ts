interface ModelConfig {
  name: string;
  contextWindow: number;
  provider?: "anthropic" | "groq" | "openai";
  modelId?: string;
}

export const ModelRegistry: Record<string, ModelConfig> = {
  "claude-3-opus-20240229": {
    name: "Claude 3 Opus",
    contextWindow: 200000,
    provider: "anthropic",
  },
  "claude-3-sonnet-20240229": {
    name: "Claude 3 Sonnet",
    contextWindow: 200000,
    provider: "anthropic",
  },
  "claude-3-haiku-20240307": {
    name: "Claude 3 Haiku",
    contextWindow: 200000,
    provider: "anthropic",
  },
  "gpt-4o": {
    name: "GPT-4o",
    contextWindow: 128000,
    provider: "openai",
  },
  "o1": {
    name: "o1",
    contextWindow: 200000,
    provider: "openai",
  },
  "llama-3.3-70b-versatile": {
    name: "Llama 3.3 70B (Fastest)",
    contextWindow: 128000,
    provider: "groq",
    modelId: "llama-3.3-70b-versatile",
  },
} as const;

export type ModelId = keyof typeof ModelRegistry;
