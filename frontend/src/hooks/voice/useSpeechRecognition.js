import { useRef } from "preact/hooks";
import { VOICE_CONSTANTS, CHAT_STATES } from "@faster-chat/shared";
import { getSpeechRecognition } from "@/utils/voice/browserSupport";
import { handleVoiceError, ERROR_TYPES, ERROR_MESSAGES } from "@/utils/voice/errorHandler";

const createRecognitionInstance = (language) => {
  const SpeechRecognition = getSpeechRecognition();
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = language || VOICE_CONSTANTS.DEFAULT_LANGUAGE;
  return recognition;
};

const parseRecognitionResults = (event) => {
  let interimTranscript = "";
  let finalTranscript = "";

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += transcript;
    } else {
      interimTranscript += transcript;
    }
  }

  return { interim: interimTranscript, final: finalTranscript };
};

const shouldRestartRecognition = (currentStateRef, recognitionRef) => {
  return currentStateRef.current === CHAT_STATES.LISTENING && recognitionRef.current;
};

export function useSpeechRecognition({ onResult, onError, language, currentStateRef }) {
  const recognitionRef = useRef(null);

  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    const recognition = createRecognitionInstance(language);

    recognition.onresult = (event) => {
      const transcripts = parseRecognitionResults(event);
      if (onResult) onResult(transcripts);
    };

    recognition.onerror = (event) => {
      handleVoiceError(event.error, ERROR_TYPES.RECOGNITION, onError);
    };

    recognition.onend = () => {
      if (shouldRestartRecognition(currentStateRef, recognitionRef)) {
        setTimeout(() => {
          if (shouldRestartRecognition(currentStateRef, recognitionRef)) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.error("[useSpeechRecognition] Failed to restart:", err);
            }
          }
        }, VOICE_CONSTANTS.RECOGNITION_RESTART_DELAY_MS);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const start = () => {
    const recognition = initRecognition();
    try {
      recognition.start();
    } catch (err) {
      console.error("[useSpeechRecognition] Failed to start:", err);
      if (onError) onError(ERROR_MESSAGES.MICROPHONE_START_FAILED);
    }
  };

  const stop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const updateLanguage = (lang) => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  };

  return {
    start,
    stop,
    updateLanguage,
  };
}
