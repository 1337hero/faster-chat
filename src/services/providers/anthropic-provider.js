import Anthropic from '@anthropic-ai/sdk';
import { BaseChatProvider } from './base-provider';

export class AnthropicProvider extends BaseChatProvider {
  constructor(config = {}) {
    super();
    this.client = new Anthropic({
      apiKey: config.apiKey || import.meta.env.VITE_ANTHROPIC_API_KEY,
      dangerouslyAllowBrowser: true
      // TODO: Will need backend API service in future if deploying remotely
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
        ...options
      });

      return {
        success: true,
        data: response,
        error: null
      };
    } catch (error) {
      console.error('Error in Anthropic API call:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'An error occurred while communicating with Claude'
      };
    }
  }

  formatMessage(role, content) {
    return {
      role: role,
      content: content
    };
  }
}