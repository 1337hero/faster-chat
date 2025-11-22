import { useRef } from 'preact/hooks';
import { VOICE_CONSTANTS, CHAT_STATES } from '@faster-chat/shared';

export function useTextToSpeech({
  selectedVoice,
  onSpeakStart,
  onSpeakEnd,
  currentStateRef
}) {
  const ttsQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const cooldownTimerRef = useRef(null);

  const speak = (text) => {
    if (!text?.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    utterance.onstart = () => {
      isSpeakingRef.current = true;

      if (onSpeakStart) {
        onSpeakStart();
      }
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;

      if (ttsQueueRef.current.length > 0) {
        const nextSentence = ttsQueueRef.current.shift();
        speak(nextSentence);
      } else {
        if (onSpeakEnd) {
          onSpeakEnd();
        }

        if (cooldownTimerRef.current) {
          clearTimeout(cooldownTimerRef.current);
        }

        cooldownTimerRef.current = setTimeout(() => {
          if (currentStateRef.current === CHAT_STATES.COOLDOWN && onSpeakEnd) {
            onSpeakEnd(true);
          }
        }, VOICE_CONSTANTS.TTS_COOLDOWN_DELAY_MS);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const speakStream = (text) => {
    if (!text) return;

    const sentences = text.match(VOICE_CONSTANTS.SENTENCE_SPLIT_PATTERN) || [text];

    sentences.forEach(sentence => {
      if (sentence.trim()) {
        ttsQueueRef.current.push(sentence.trim());
      }
    });

    if (!isSpeakingRef.current && ttsQueueRef.current.length > 0) {
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
    isSpeakingRef.current = false;
  };

  return {
    speak,
    speakStream,
    cancelAll,
    isSpeaking: () => isSpeakingRef.current,
  };
}
