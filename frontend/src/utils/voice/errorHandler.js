/**
 * Voice error handling utilities
 */

const IGNORED_ERRORS = ["aborted", "no-speech"];

export const ERROR_TYPES = {
  RECOGNITION: "recognition",
  SYNTHESIS: "synthesis",
  MICROPHONE: "microphone",
  BROWSER_SUPPORT: "browser_support",
};

export const ERROR_MESSAGES = {
  MICROPHONE_ERROR: (error) => `Microphone error: ${error}`,
  MICROPHONE_START_FAILED: "Failed to start microphone",
  BROWSER_NOT_SUPPORTED: "Voice not supported in this browser",
  RECOGNITION_RESTART_FAILED: "Failed to restart speech recognition",
};

export const shouldReportError = (error) => {
  return !IGNORED_ERRORS.includes(error);
};

export const handleVoiceError = (error, type, callback) => {
  console.error(`[Voice ${type}]`, error);

  if (callback && shouldReportError(error)) {
    const message =
      type === ERROR_TYPES.RECOGNITION || type === ERROR_TYPES.MICROPHONE
        ? ERROR_MESSAGES.MICROPHONE_ERROR(error)
        : error;
    callback(message);
  }
};
