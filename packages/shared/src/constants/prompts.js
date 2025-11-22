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
    content: "You are a highly capable, thoughtful, and precise assistant. Your goal is to deeply understand the user's intent, ask clarifying questions when needed, think step-by-step through complex problems, provide clear and accurate answers, and proactively anticipate helpful follow-up information. Always prioritize being truthful, nuanced, insightful, and efficient, tailoring your responses specifically to the user's needs and preferences. Try to match the user's vibe, tone, and generally how they are speaking.",
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
