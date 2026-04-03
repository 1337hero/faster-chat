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
import { providersClient } from "@/lib/providersClient";
import { CACHE_DURATIONS } from "@faster-chat/shared";
import { apiFetch } from "@/lib/api";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";

import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { toast, Toaster } from "sonner";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";
import VoiceSettings from "./VoiceSettings";
import VoiceStatusIndicator from "./VoiceStatusIndicator";

const ChatInterface = ({ chatId }) => {
  const navigate = useNavigate();
  const createChatMutation = useCreateChatMutation();
  const preferredModel = useUiState((state) => state.preferredModel);
  const setPreferredModel = useUiState((state) => state.setPreferredModel);
  const imageMode = useUiState((state) => state.imageMode);
  const preferredImageModel = useUiState((state) => state.preferredImageModel);
  const setPreferredImageModel = useUiState((state) => state.setPreferredImageModel);
  const autoScroll = useUiState((state) => state.autoScroll);
  const webSearchEnabled = useUiState((state) => state.webSearchEnabled);
  const memoryEnabled = useUiState((state) => state.memoryEnabled);
  const toggleWebSearch = useUiState((state) => state.toggleWebSearch);
  const setWebSearchEnabled = useUiState((state) => state.setWebSearchEnabled);

  const { data: memoryStatus } = useQuery({
    queryKey: ["memory-status"],
    queryFn: () => apiFetch("/api/memory/status"),
    staleTime: 60000,
  });

  const chatMemoryMutation = useMutation({
    mutationFn: ({ chatId: cId, disabled }) =>
      apiFetch(`/api/chats/${cId}/memory`, { method: "PUT", body: JSON.stringify({ disabled }) }),
  });

  const chatMemoryDisabled = chatMemoryMutation.data?.disabled ?? false;

  const { data: modelsData } = useQuery({
    queryKey: ["models", "text"],
    queryFn: () => providersClient.getEnabledModelsByType("text"),
    staleTime: CACHE_DURATIONS.IMAGE_MODELS,
  });

  const currentModelData = (modelsData?.models || []).find((m) => m.model_id === preferredModel);
  const modelSupportsTools = !!currentModelData?.metadata?.supports_tools;

  // Reset webSearch on chat navigation
  useEffect(() => {
    setWebSearchEnabled(false);
  }, [chatId]);

  // Wrap model change to auto-disable webSearch when new model lacks tool support
  const handleModelChange = (modelId) => {
    setPreferredModel(modelId);
    const newModel = (modelsData?.models || []).find((m) => m.model_id === modelId);
    if (!newModel?.metadata?.supports_tools) {
      setWebSearchEnabled(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newChat = await createChatMutation.mutateAsync();
      navigate({ to: "/chat/$chatId", params: { chatId: newChat.id } });
    } catch (err) {
      toast.error(err.message || "Failed to create new chat");
    }
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
    webSearchEnabled,
    memoryEnabled,
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
      <Toaster position="top-center" theme="dark" richColors expand visibleToasts={3} />

      {/* Main Content Area - Absolute positioning for scroll-behind effect */}
      <div className="relative flex-1">
        {/* Navbar - Elevated Layer */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-2 py-3 md:px-8 md:py-6">
          {/* Left: Toolbar */}
          <div className="flex items-center gap-3">
            <SidebarToolbar onNewChat={handleNewChat} onSearch={() => {}} />
          </div>

          {/* Center: Model Selector */}
          {imageMode ? (
            <ModelSelector
              type="image"
              currentModel={preferredImageModel}
              onModelChange={setPreferredImageModel}
            />
          ) : (
            <ModelSelector currentModel={preferredModel} onModelChange={handleModelChange} />
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
          <div className="mx-auto max-w-4xl">
            <MessageList
              messages={messages}
              isLoading={isLoading}
              isGeneratingImage={isGenerating}
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
          <div className="pointer-events-auto relative mx-auto max-w-4xl">
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
                webSearchEnabled={webSearchEnabled}
                onToggleWebSearch={toggleWebSearch}
                modelSupportsTools={modelSupportsTools}
                memoryGlobalEnabled={memoryStatus?.globalEnabled && memoryStatus?.enabled}
                chatMemoryDisabled={chatMemoryDisabled}
                onToggleChatMemory={() => chatMemoryMutation.mutate({ chatId, disabled: !chatMemoryDisabled })}
                chatMemoryPending={chatMemoryMutation.isPending}
                chatId={chatId}
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
