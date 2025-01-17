export class BaseChatProvider {
  async sendMessage(messages, options = {}) {
    throw new Error('sendMessage must be implemented');
  }

  formatMessage(role, content) {
    throw new Error('formatMessage must be implemented');
  }
}