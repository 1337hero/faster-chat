export type ModelId =
  | "claude-3-opus-20240229"
  | "claude-3-5-sonnet-20241022"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "llama-3.3-70b-versatile"
  | "deepseek-chat"
  | "deepseek-r1-distill-qwen-32b"
  | "deepseek-r1-distill-llama-70b-specdec"
  | "deepseek-r1-distill-llama-70b"
  | "qwen-2.5-32b"
  | "mixtral-8x7b-32768";

export type Provider = "anthropic" | "groq" | "openai" | "deepseek";

export interface ModelConfig {
  name: string;
  contextWindow: number;
  provider: Provider;
  modelId?: string; // Optional override for API calls
}