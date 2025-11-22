export const VOICE_CONSTANTS = {
  // Error and notification display
  ERROR_DISPLAY_DURATION_MS: 5000,

  // Speech recognition timing
  RECOGNITION_RESTART_DELAY_MS: 100,
  MIN_TRANSCRIPT_LENGTH: 2,

  // Text-to-speech timing
  TTS_COOLDOWN_DELAY_MS: 1000,

  // Text processing
  SENTENCE_SPLIT_PATTERN: /[^.!?]+[.!?]+/g,

  // Defaults
  DEFAULT_LANGUAGE: 'en-US',

  // LocalStorage keys
  STORAGE_KEY_LANGUAGE: 'selectedLanguage',
  STORAGE_KEY_VOICE: 'selectedVoice',
};

export const CHAT_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  COOLDOWN: 'cooldown',
};
