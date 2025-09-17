/**
 * @typedef {Object} Chat
 * @property {string} id
 * @property {string} [title]
 * @property {Date} created_at
 * @property {Date} updated_at
 */

/**
 * @typedef {Object} StoredMessage
 * @property {string} id
 * @property {string} chatId
 * @property {string} content
 * @property {("user" | "assistant")} role
 * @property {Date} created_at
 * @property {boolean} [isPartial]
 */
