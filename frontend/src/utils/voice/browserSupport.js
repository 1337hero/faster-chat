/**
 * Check if the browser supports voice features (speech recognition + synthesis)
 */
export const checkVoiceSupport = () => {
  if (typeof window === "undefined") return false;
  const hasSpeechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasSpeechSynthesis = !!window.speechSynthesis;
  return hasSpeechRecognition && hasSpeechSynthesis;
};

/**
 * Get the SpeechRecognition constructor (handles vendor prefixes)
 */
export const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
};
