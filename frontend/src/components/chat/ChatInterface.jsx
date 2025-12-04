import SidebarToolbar from "@/components/layout/SidebarToolbar";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import { useChat } from "@/hooks/useChat";
import { useCreateChatMutation } from "@/hooks/useChatsQuery";
import { useVoice } from "@/hooks/useVoice";
import { useUiState } from "@/state/useUiState";
import { VOICE_CONSTANTS } from "@faster-chat/shared";
import { useNavigate } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";
import VoiceSettings from "./VoiceSettings";
import VoiceStatusIndicator from "./VoiceStatusIndicator";

const ChatInterface = ({ chatId, onMenuClick }) => {
  const navigate = useNavigate();
  const createChatMutation = useCreateChatMutation();
  const preferredModel = useUiState((state) => state.preferredModel);
  const setPreferredModel = useUiState((state) => state.setPreferredModel);

  const handleNewChat = async () => {
    const newChat = await createChatMutation.mutateAsync();
    navigate({ to: "/chat/$chatId", params: { chatId: newChat.id } });
  };
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
    submitMessage,
    error: chatError,
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
      setInput(transcript); // Echo to input for visual feedback
      await submitMessage({ content: transcript });
    },
    onError: (error) => {
      console.error("Voice error:", error);
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
    const isAssistantMessage = message.role === "assistant";
    const hasTextContent = message.parts?.some((part) => part.type === "text" && part.text?.trim());
    const notAlreadySpoken = lastSpokenMessageRef.current !== message.id;
    return isAssistantMessage && hasTextContent && notAlreadySpoken;
  };

  const extractTextContent = (message) => {
    return (
      message.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("") || ""
    );
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
    <div className="bg-theme-canvas relative z-0 flex h-full flex-1 flex-col">
      {/* Main Content Area - Absolute positioning for scroll-behind effect */}
      <div className="relative flex-1">
        {/* Navbar - Elevated Layer */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 md:px-8 md:py-6">
          {/* Left: Toolbar with negative margin to hide behind sidebar */}
          <div className="flex items-center gap-3">
            <SidebarToolbar onNewChat={handleNewChat} onSearch={() => {}} />
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="hover:bg-theme-surface/50 text-theme-text rounded-lg p-2 md:hidden"
                aria-label="Open menu"></button>
            )}
          </div>

          {/* Center: Model Selector */}
          <ModelSelector currentModel={preferredModel} onModelChange={setPreferredModel} />

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            <VoiceStatusIndicator voiceControls={voice} />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        {/* Messages Area - Scrolls behind input and navbar */}
        <div
          ref={scrollContainerRef}
          style={{ scrollbarGutter: "stable both-edges" }}
          className="absolute inset-0 overflow-y-scroll pt-12 pb-[180px] md:px-20">
          <div className="mx-auto max-w-3xl">
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
        <div className="from-theme-canvas via-theme-canvas/80 pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />

        {/* Input Area - Floating on top */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
          <div className="pointer-events-auto relative mx-auto max-w-3xl">
            <ErrorBanner message={chatError?.message || chatError} className="mb-3" />
            <ErrorBanner message={voiceError} className="mb-3" />

            <div
              className={`bg-theme-surface relative rounded-2xl border p-2 shadow-lg transition-all duration-300 ${
                isLoading
                  ? "border-theme-primary/30"
                  : "border-theme-border hover:border-theme-primary/50"
              }`}>
              <InputArea
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                voiceControls={voice}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Voice Settings Modal */}
      {showVoiceSettings && (
        <VoiceSettings voiceControls={voice} onClose={() => setShowVoiceSettings(false)} />
      )}
    </div>
  );
};

export default ChatInterface;
