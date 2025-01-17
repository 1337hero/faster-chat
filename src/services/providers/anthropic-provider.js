import Anthropic from '@anthropic-ai/sdk';
import { BaseChatProvider } from './base-provider';

export class AnthropicProvider extends BaseChatProvider {
  constructor(config = {}) {
    super();
    this.client = new Anthropic({
      apiKey: config.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true
    });
    this.defaultModel = config.defaultModel || 'claude-3-sonnet-20240229';
  }

  async sendMessage(messages, options = {}) {
    try {
      const response = await this.client.messages.create({
        model: options.model || this.defaultModel,
        max_tokens: options.maxTokens || 4096,
        system: options.systemPrompt,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true // Enable streaming
      });

      return {
        success: true,
        stream: response,
        error: null
      };
    } catch (error) {
      console.error('Error in Anthropic API call:', error);
      return {
        success: false,
        stream: null,
        error: error.message || 'An error occurred while communicating with Claude'
      };
    }
  }

  formatMessage(role, content) {
    return {
      role,
      content
    };
  }
}