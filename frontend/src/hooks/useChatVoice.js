import { useVoice } from "@/hooks/useVoice";
import { showErrorToast } from "@/lib/errorHandler";
import { extractTextContent, hasTextContent } from "@/utils/message/messageUtils";
import { useLayoutEffect, useRef } from "preact/hooks";

const shouldSpeakMessage = (message, lastSpokenId) => {
  if (!message) return false;
  const isAssistantMessage = message.role === "assistant";
  const notAlreadySpoken = lastSpokenId !== message.id;
  return isAssistantMessage && hasTextContent(message) && notAlreadySpoken;
};

export function useChatVoice({ messages, isLoading, setInput, submitMessage }) {
  const lastSpokenMessageRef = useRef(null);

  const voice = useVoice({
    onSpeechResult: async (transcript) => {
      setInput(transcript);
      await submitMessage({ content: transcript });
    },
    onError: (error) => {
      console.error("Voice error:", error);
      showErrorToast(error);
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

  return { voice };
}
