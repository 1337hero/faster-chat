import { useRef } from "preact/hooks";
import { VOICE_CONSTANTS, CHAT_STATES } from "@faster-chat/shared";

const splitIntoSentences = (text) =>
  text.match(VOICE_CONSTANTS.SENTENCE_SPLIT_PATTERN) || [text];

const enqueueCleanedSentences = (sentences, queueRef) => {
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (trimmed) queueRef.current.push(trimmed);
  });
};

const isSpeakingState = (stateRef) =>
  stateRef.current === CHAT_STATES.SPEAKING;

export function useTextToSpeech({ selectedVoice, onSpeakStart, onSpeakEnd, currentStateRef }) {
  const ttsQueueRef = useRef([]);
  const cooldownTimerRef = useRef(null);

  const speak = (text) => {
    if (!text?.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    utterance.onstart = () => {
      if (onSpeakStart) onSpeakStart();
    };

    utterance.onend = () => {
      if (ttsQueueRef.current.length > 0) {
        const nextSentence = ttsQueueRef.current.shift();
        speak(nextSentence);
        return;
      }

      if (onSpeakEnd) onSpeakEnd();

      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }

      cooldownTimerRef.current = setTimeout(() => {
        if (currentStateRef.current === CHAT_STATES.COOLDOWN && onSpeakEnd) {
          onSpeakEnd(true);
        }
      }, VOICE_CONSTANTS.TTS_COOLDOWN_DELAY_MS);
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakStream = (text) => {
    if (!text) return;

    const sentences = splitIntoSentences(text);
    enqueueCleanedSentences(sentences, ttsQueueRef);

    if (!isSpeakingState(currentStateRef) && ttsQueueRef.current.length > 0) {
      const nextSentence = ttsQueueRef.current.shift();
      speak(nextSentence);
    }
  };

  const cancelAll = () => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    window.speechSynthesis.cancel();
    ttsQueueRef.current = [];
  };

  return {
    speak,
    speakStream,
    cancelAll,
    isSpeaking: () => isSpeakingState(currentStateRef),
  };
}
