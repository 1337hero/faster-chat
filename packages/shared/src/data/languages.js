/**
 * Language Names Map
 *
 * Maps language codes to human-readable language names for voice selection
 */
export const LANGUAGE_NAMES = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'es-ES': 'Spanish (Spain)',
  'es-MX': 'Spanish (Mexico)',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese (Brazil)',
  'pt-PT': 'Portuguese (Portugal)',
  'ru-RU': 'Russian',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'ar-SA': 'Arabic',
  'hi-IN': 'Hindi',
  'nl-NL': 'Dutch',
  'pl-PL': 'Polish',
  'sv-SE': 'Swedish',
  'tr-TR': 'Turkish',
};

/**
 * Get human-readable language name from language code
 * Falls back to the language code itself if not found
 */
export const getLanguageName = (langCode) => LANGUAGE_NAMES[langCode] || langCode;
