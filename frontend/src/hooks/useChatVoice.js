import { useVoice } from "@/hooks/useVoice";
import { extractTextContent, hasTextContent } from "@/utils/message/messageUtils";
import { VOICE_CONSTANTS } from "@faster-chat/shared";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

const shouldSpeakMessage = (message, lastSpokenId) => {
  if (!message) return false;
  const isAssistantMessage = message.role === "assistant";
  const notAlreadySpoken = lastSpokenId !== message.id;
  return isAssistantMessage && hasTextContent(message) && notAlreadySpoken;
};

export function useChatVoice({ messages, isLoading, setInput, submitMessage }) {
  const [voiceError, setVoiceError] = useState(null);
  const lastSpokenMessageRef = useRef(null);

  const voice = useVoice({
    onSpeechResult: async (transcript) => {
      setInput(transcript);
      await submitMessage({ content: transcript });
    },
    onError: (error) => {
      console.error("Voice error:", error);
      setVoiceError(error);
      setTimeout(() => setVoiceError(null), VOICE_CONSTANTS.ERROR_DISPLAY_DURATION_MS);
    },
  });

  useLayoutEffect(() => {
    if (!voice.isActive || messages.length === 0 || isLoading) return;

    const lastMessage = messages[messages.length - 1];
    if (!shouldSpeakMessage(lastMessage, lastSpokenMessageRef.current)) return;

    const content = extractTextContent(lastMessage);
    lastSpokenMessageRef.current = lastMessage.id;

    if (voice.isProcessing) {
      voice.completeProcessing();
    }

    voice.speakStream(content);
  }, [messages, voice.isActive, voice.isProcessing, isLoading]);

  return {
    voice,
    voiceError,
  };
}
