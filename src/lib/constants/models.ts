export const ModelRegistry = {
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    contextWindow: 200000,
  },
  'claude-3-sonnet-20240229': {
    name: 'Claude 3 Sonnet',
    contextWindow: 200000,
  },
  'claude-3-haiku-20240307': {
    name: 'Claude 3 Haiku',
    contextWindow: 200000,
  },
  'gpt-4': {
    name: 'GPT-4',
    contextWindow: 8192,
  },
};
export type ModelId = keyof typeof ModelRegistry;

