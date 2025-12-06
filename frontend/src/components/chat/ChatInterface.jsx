import SidebarToolbar from "@/components/layout/SidebarToolbar";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ToolbarGroup } from "@/components/ui/ToolbarGroup";
import { UserMenu } from "@/components/ui/UserMenu";
import { useChat } from "@/hooks/useChat";
import { useChatVoice } from "@/hooks/useChatVoice";
import { useCreateChatMutation, useCreateMessageMutation } from "@/hooks/useChatsQuery";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useUiState } from "@/state/useUiState";
import { useNavigate } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { toast, Toaster } from "sonner";
import ImageModelSelector from "./ImageModelSelector";
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
  const imageMode = useUiState((state) => state.imageMode);
  const preferredImageModel = useUiState((state) => state.preferredImageModel);
  const setPreferredImageModel = useUiState((state) => state.setPreferredImageModel);
  const autoScroll = useUiState((state) => state.autoScroll);

  const handleNewChat = async () => {
    const newChat = await createChatMutation.mutateAsync();
    navigate({ to: "/chat/$chatId", params: { chatId: newChat.id } });
  };
  const scrollContainerRef = useRef(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

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
    regenerateResponse,
    setInput,
  } = useChat({
    id: chatId,
    model: preferredModel,
  });

  const { voice } = useChatVoice({
    messages,
    isLoading,
    setInput,
    submitMessage,
  });

  // Image generation
  const createMessageMutation = useCreateMessageMutation();
  const { generate: generateImage, isGenerating } = useImageGeneration({
    onError: (error) => {
      toast.error(error.message || "Image generation failed");
    },
  });

  async function handleImageSubmit(prompt) {
    if (!prompt || !chatId) return;

    // Save user message with the prompt
    const userMessageId = crypto.randomUUID();
    const userCreatedAt = Date.now();
    await createMessageMutation.mutateAsync({
      chatId,
      message: {
        id: userMessageId,
        role: "user",
        content: `[Image Generation] ${prompt}`,
        createdAt: userCreatedAt,
      },
    });

    // Clear input
    setInput("");

    // Generate image
    generateImage(
      { prompt, chatId, model: preferredImageModel },
      {
        onSuccess: async (data) => {
          // Save assistant message with the generated image
          const assistantMessageId = crypto.randomUUID();
          await createMessageMutation.mutateAsync({
            chatId,
            message: {
              id: assistantMessageId,
              role: "assistant",
              content: `Generated image: "${prompt}"`,
              fileIds: [data.id],
              model: data.model,
              createdAt: Date.now(),
            },
          });
          toast.success("Image generated!");
        },
      }
    );
  }

  useLayoutEffect(() => {
    if (!scrollContainerRef.current || !autoScroll) return;
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [messages.length, autoScroll]);

  return (
    <div className="bg-theme-canvas relative z-0 flex h-full flex-1 flex-col">
      {/* Sonner Toast Container */}
      <Toaster
        position="top-center"
        theme="dark"
        richColors
        expand
        visibleToasts={3}
      />

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
                aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Center: Model Selector */}
          {imageMode ? (
            <ImageModelSelector
              currentModel={preferredImageModel}
              onModelChange={setPreferredImageModel}
            />
          ) : (
            <ModelSelector currentModel={preferredModel} onModelChange={setPreferredModel} />
          )}

          {/* Right: Controls */}
          <ToolbarGroup>
            <VoiceStatusIndicator
              voiceControls={voice}
              onOpenSettings={() => setShowVoiceSettings(true)}
            />
            <ThemeToggle />
            <UserMenu />
          </ToolbarGroup>
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
              onRegenerate={regenerateResponse}
            />
          </div>
        </div>

        {/* Bottom Gradient Fade Overlay - Content scrolls behind input */}
        <div className="from-theme-canvas via-theme-canvas/80 pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />

        {/* Input Area - Floating on top */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
          <div className="pointer-events-auto relative mx-auto max-w-3xl">
            <ErrorBanner message={chatError?.message || chatError} className="mb-3" />

            <div
              className={`bg-theme-surface relative rounded-2xl border p-2 shadow-lg transition-all duration-300 ${
                isLoading || isGenerating
                  ? "border-theme-primary/30"
                  : "border-theme-border hover:border-theme-primary/50"
              }`}>
              <InputArea
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                voiceControls={voice}
                disabled={isLoading || isGenerating}
                onImageSubmit={handleImageSubmit}
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
