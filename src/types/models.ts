import { ModelRegistry } from "@/lib/constants/models";

export type ModelId = keyof typeof ModelRegistry;

export interface ModelConfig {
  name: string;
  contextWindow: number;
  provider?: "anthropic" | "groq" | "openai" | "deepseek";
  modelId?: string;
}
