/**
 * @typedef {Object} SystemPrompt
 * @property {string} id
 * @property {string} name
 * @property {string} content
 * @property {string} description
 */

/**
 * @type {SystemPrompt[]}
 */
export const systemPrompts = [
  {
    id: "default",
    name: "Default",
    content: "You are a helpful assistant.",
    description: "A helpful assistant",
  },
];

/**
 * Get a system prompt by ID, returns default if not found
 * @param {string} id
 * @returns {SystemPrompt}
 */
export const getSystemPrompt = (id) => {
  const prompt = systemPrompts.find((p) => p.id === id);
  if (!prompt) {
    return systemPrompts[0]; // Return default prompt if ID not found
  }
  return prompt;
};
