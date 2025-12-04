import { useRef, useState } from "preact/hooks";
import { CHAT_STATES } from "@faster-chat/shared";
import { useSpeechRecognition } from "./voice/useSpeechRecognition";
import { useTextToSpeech } from "./voice/useTextToSpeech";
import { useVoiceSelection } from "./voice/useVoiceSelection";
import { checkVoiceSupport } from "@/utils/voice/browserSupport";
import { ERROR_MESSAGES } from "@/utils/voice/errorHandler";

export function useVoice({ onSpeechResult, onError }) {
  const [currentState, setCurrentState] = useState(CHAT_STATES.IDLE);
  const [transcript, setTranscript] = useState("");
  const currentStateRef = useRef(CHAT_STATES.IDLE);

  currentStateRef.current = currentState;

  const voiceSelection = useVoiceSelection();

  const recognition = useSpeechRecognition({
    language: voiceSelection.selectedVoice?.lang,
    currentStateRef,
    onResult: ({ interim, final }) => {
      if (interim) {
        setTranscript(interim);
      }

      if (final.trim().length > VOICE_CONSTANTS.MIN_TRANSCRIPT_LENGTH) {
        setTranscript("");
        setCurrentState(CHAT_STATES.PROCESSING);

        if (onSpeechResult) {
          onSpeechResult(final.trim());
        }
      }
    },
    onError: (error) => {
      setCurrentState(CHAT_STATES.IDLE);
      if (onError) {
        onError(error);
      }
    },
  });

  const tts = useTextToSpeech({
    selectedVoice: voiceSelection.selectedVoice,
    currentStateRef,
    onSpeakStart: () => {
      setCurrentState(CHAT_STATES.SPEAKING);
      recognition.stop();
    },
    onSpeakEnd: (cooldownComplete = false) => {
      if (cooldownComplete) {
        setCurrentState(CHAT_STATES.LISTENING);
        recognition.start();
      } else {
        setCurrentState(CHAT_STATES.COOLDOWN);
      }
    },
  });

  const changeVoice = (voice) => {
    voiceSelection.changeVoice(voice);
    recognition.updateLanguage(voice.lang);
  };

  const startConversation = () => {
    if (!checkVoiceSupport()) {
      if (onError) onError(ERROR_MESSAGES.BROWSER_NOT_SUPPORTED);
      return;
    }

    setCurrentState(CHAT_STATES.LISTENING);
    setTranscript("");
    recognition.start();
  };

  const stopConversation = () => {
    recognition.stop();
    tts.cancelAll();
    setCurrentState(CHAT_STATES.IDLE);
    setTranscript("");
  };

  const toggleConversation = () => {
    const isActive = currentState !== CHAT_STATES.IDLE;

    if (isActive) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  const completeProcessing = () => {
    if (currentState === CHAT_STATES.PROCESSING) {
      setCurrentState(CHAT_STATES.SPEAKING);
    }
  };

  const derivedState = {
    isSupported: checkVoiceSupport(),
    isActive: currentState !== CHAT_STATES.IDLE,
    isListening: currentState === CHAT_STATES.LISTENING,
    isProcessing: currentState === CHAT_STATES.PROCESSING,
    isSpeaking: currentState === CHAT_STATES.SPEAKING,
    isCooldown: currentState === CHAT_STATES.COOLDOWN,
  };

  return {
    currentState,
    transcript,
    ...derivedState,
    availableVoices: voiceSelection.availableVoices,
    selectedVoice: voiceSelection.selectedVoice,
    changeVoice,
    startConversation,
    stopConversation,
    toggleConversation,
    speak: tts.speak,
    speakStream: tts.speakStream,
    completeProcessing,
  };
}
