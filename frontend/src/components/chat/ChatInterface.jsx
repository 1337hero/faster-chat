import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useChat } from "@/hooks/useChat";
import { useVoice } from "@/hooks/useVoice";
import { useUiState } from "@/state/useUiState";
import { VOICE_CONSTANTS } from "@faster-chat/shared";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";
import VoiceStatusIndicator from "./VoiceStatusIndicator";
import VoiceSettings from "./VoiceSettings";

const ChatInterface = ({ chatId, onMenuClick }) => {
  const preferredModel = useUiState((state) => state.preferredModel);
  const setPreferredModel = useUiState((state) => state.setPreferredModel);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef(null);
  const [voiceError, setVoiceError] = useState(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const lastSpokenMessageRef = useRef(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    status,
    stop,
    resumeStream,
    setInput,
  } = useChat({
    id: chatId,
    model: preferredModel,
  });

  // Voice integration
  const voice = useVoice({
    onSpeechResult: async (transcript) => {
      // CRITICAL: Don't use setInput + handleSubmit - state update is async
      // Instead, pass transcript directly via custom event property
      setInput(transcript);

      try {
        const customEvent = {
          preventDefault: () => {},
          voiceTranscript: transcript
        };
        await handleSubmit(customEvent);
      } catch (err) {
        console.error('[ChatInterface] Voice submission failed:', err);
      }
    },
    onError: (error) => {
      console.error('Voice error:', error);
      setVoiceError(error);
      setTimeout(() => setVoiceError(null), VOICE_CONSTANTS.ERROR_DISPLAY_DURATION_MS);
    },
  });

  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    if (autoScroll) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const shouldSpeakMessage = (message) => {
    if (!message) return false;
    const isAssistantMessage = message.role === 'assistant';
    const hasTextContent = message.parts?.some(part => part.type === 'text' && part.text?.trim());
    const notAlreadySpoken = lastSpokenMessageRef.current !== message.id;
    return isAssistantMessage && hasTextContent && notAlreadySpoken;
  };

  const extractTextContent = (message) => {
    return message.parts
      ?.filter(part => part.type === 'text')
      .map(part => part.text)
      .join('') || '';
  };

  useLayoutEffect(() => {
    if (!voice.isActive || messages.length === 0 || isLoading) return;

    const lastMessage = messages[messages.length - 1];
    if (!shouldSpeakMessage(lastMessage)) return;

    const content = extractTextContent(lastMessage);
    lastSpokenMessageRef.current = lastMessage.id;

    if (voice.isProcessing) {
      voice.completeProcessing();
    }

    voice.speakStream(content);
  }, [messages, voice.isActive, voice.isProcessing, isLoading]);

  return (
    <div className="bg-latte-base dark:bg-macchiato-base relative z-0 flex h-full flex-1 flex-col">
      {/* Main Content Area - Absolute positioning for scroll-behind effect */}
      <div className="relative flex-1">
        {/* Navbar - Elevated Layer */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:px-8 md:py-6">
          <div className="flex items-center gap-3">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="hover:bg-latte-surface0/50 dark:hover:bg-macchiato-surface0/50 text-latte-text dark:text-macchiato-text rounded-lg p-2 md:hidden"
                aria-label="Open menu">
              </button>
            )}
            <ModelSelector currentModel={preferredModel} onModelChange={setPreferredModel} />
          </div>

          <div className="flex items-center gap-3">
            <VoiceStatusIndicator voiceControls={voice} />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        {/* Messages Area - Scrolls behind input and navbar */}
        <div
          ref={scrollContainerRef}
          className="custom-scrollbar absolute inset-0 overflow-y-auto scroll-smooth pt-12 pb-[180px] md:px-20">
          <div className="mx-auto max-w-4xl">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              status={status}
              onStop={stop}
              onResume={resumeStream}
            />
          </div>
        </div>

        {/* Bottom Gradient Fade Overlay - Content scrolls behind input */}
        <div className="from-latte-base via-latte-base/80 dark:from-macchiato-base dark:via-macchiato-base/80 pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />

        {/* Input Area - Floating on top */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
          <div className="pointer-events-auto relative mx-auto max-w-4xl">
            <ErrorBanner message={voiceError} className="mb-3" />

            <div
              className={`layered-panel elevate-lg relative flex items-end gap-3 rounded-[22px] px-4 py-3 transition-transform duration-200 ${
                isLoading ? "opacity-95" : "hover:-translate-y-1"
              }`}>
              <InputArea
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                voiceControls={voice}
              />
            </div>
          </div>
          {/* Footer Info */}
          <div className="mt-3 text-center">
            <p className="text-latte-overlay0/70 dark:text-macchiato-overlay0/70 text-[11px] font-medium uppercase tracking-wide">
              Faster Chat • AI Powered
            </p>
          </div>
        </div>
      </div>

      {/* Voice Settings Modal */}
      {showVoiceSettings && (
        <VoiceSettings
          voiceControls={voice}
          onClose={() => setShowVoiceSettings(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
