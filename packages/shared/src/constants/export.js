/**
 * Export Constants
 *
 * Native chat export format (JSON) and transcript export (Markdown).
 * The JSON shape is versioned so a future importer can round-trip it.
 */

export const EXPORT_CONSTANTS = {
  FORMAT_VERSION: 1,
  SOURCE: 'faster-chat',

  FORMATS: {
    JSON: 'json',
    MARKDOWN: 'markdown',
  },

  ENDPOINTS: {
    ALL: '/api/export',
    chat: (chatId) => `/api/chats/${chatId}/export`,
  },
};
