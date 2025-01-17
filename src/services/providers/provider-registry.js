import { AnthropicProvider } from './anthropic-provider';

export const ProviderType = {
  ANTHROPIC: 'anthropic',
};

export const ModelRegistry = {
  [ProviderType.ANTHROPIC]: {
    'claude-3-opus-20240229': {
      name: 'Claude 3 Opus',
      contextWindow: 200000,
      provider: ProviderType.ANTHROPIC
    },
    'claude-3-sonnet-20240229': {
      name: 'Claude 3 Sonnet',
      contextWindow: 200000,
      provider: ProviderType.ANTHROPIC
    },
    'claude-3-haiku-20240307': {
      name: 'Claude 3 Haiku',
      contextWindow: 200000,
      provider: ProviderType.ANTHROPIC
    }
  },
};

export function createProvider(type, config = {}) {
  switch (type) {
    case ProviderType.ANTHROPIC:
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}