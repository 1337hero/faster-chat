/**
 * @typedef {Object} PersistentChatOptions
 * @property {string} [id]
 * @property {string} model
 */

/**
 * @typedef {Object} ChatBody
 * @property {string} model
 * @property {string} systemPromptId
 * @property {ChatMessage[]} messages
 */

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {string} content
 * @property {("user" | "assistant" | "system")} role
 */
