import { useRef } from 'preact/hooks';
import { VOICE_CONSTANTS, CHAT_STATES } from '@faster-chat/shared';

export function useSpeechRecognition({
  onResult,
  onError,
  language,
  currentStateRef
}) {
  const recognitionRef = useRef(null);

  const initRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language || VOICE_CONSTANTS.DEFAULT_LANGUAGE;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (onResult) {
        onResult({
          interim: interimTranscript,
          final: finalTranscript
        });
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (onError && event.error !== 'aborted') {
        onError(`Microphone error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (currentStateRef.current === CHAT_STATES.LISTENING) {
        setTimeout(() => {
          if (currentStateRef.current === CHAT_STATES.LISTENING && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.error('[useSpeechRecognition] Failed to restart:', err);
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
      console.error('[useSpeechRecognition] Failed to start:', err);
      if (onError) onError('Failed to start microphone');
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
