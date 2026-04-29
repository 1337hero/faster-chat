import SidebarToolbar from "@/components/layout/SidebarToolbar";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ToolbarGroup } from "@/components/ui/ToolbarGroup";
import { UserMenu } from "@/components/ui/UserMenu";
import { useChat } from "@/hooks/useChat";
import { useChatVoice } from "@/hooks/useChatVoice";
import { useChatMemoryEnabled } from "@/hooks/useMemoryStatus";
import { useChatNavigation } from "@/hooks/useChatNavigation";
import { useCreateChatMutation, useCreateMessageMutation } from "@/hooks/useChatsQuery";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useUiState } from "@/state/useUiState";
import { providersClient } from "@/lib/providersClient";
import { CACHE_DURATIONS } from "@faster-chat/shared";
import { useQuery } from "@tanstack/react-query";

import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { toast, Toaster } from "sonner";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";
import VoiceSettings from "./VoiceSettings";
import VoiceStatusIndicator from "./VoiceStatusIndicator";

const ChatInterface = ({ chatId }) => {
  const { navigateToChat } = useChatNavigation();
  const createChatMutation = useCreateChatMutation();
  const preferredModel = useUiState((state) => state.preferredModel);
  const setPreferredModel = useUiState((state) => state.setPreferredModel);
  const imageMode = useUiState((state) => state.imageMode);
  const preferredImageModel = useUiState((state) => state.preferredImageModel);
  const setPreferredImageModel = useUiState((state) => state.setPreferredImageModel);
  const autoScroll = useUiState((state) => state.autoScroll);
  const webSearchEnabled = useUiState((state) => state.webSearchEnabled);
  const toggleWebSearch = useUiState((state) => state.toggleWebSearch);
  const setWebSearchEnabled = useUiState((state) => state.setWebSearchEnabled);
  const memoryEnabled = useChatMemoryEnabled(chatId);

  const { data: modelsData } = useQuery({
    queryKey: ["models", "text"],
    queryFn: () => providersClient.getEnabledModelsByType("text"),
    staleTime: CACHE_DURATIONS.IMAGE_MODELS,
  });

  const currentModelData = (modelsData?.models || []).find((m) => m.model_id === preferredModel);
  const modelSupportsTools = !!currentModelData?.metadata?.supports_tools;

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
      navigateToChat(newChat.id);
    } catch (err) {
      toast.error(err.message || "Failed to create new chat");
    }
  };
  const scrollContainerRef = useRef(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const {
    messages,
    input,
    inputFiles,
    appendFiles,
    removeFile,
    handleInputChange,
    handleSubmit,
    submitMessage,
    error: chatError,
    clearError,
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

  const createMessageMutation = useCreateMessageMutation();
  const { generate: generateImage, isGenerating } = useImageGeneration({
    onError: (error) => {
      toast.error(error.message || "Image generation failed");
    },
  });

  async function handleImageSubmit(prompt) {
    if (!prompt || !chatId) return;

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

    setInput("");

    generateImage(
      { prompt, chatId, model: preferredImageModel },
      {
        onSuccess: async (data) => {
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
      <Toaster position="top-center" theme="dark" richColors expand visibleToasts={3} />

      <div className="relative flex-1">
        <div className="sticky top-0 z-10 flex items-center justify-between px-2 py-3 md:px-8 md:py-6">
          <div className="flex items-center gap-3">
            <SidebarToolbar onNewChat={handleNewChat} onSearch={() => {}} />
          </div>

          {imageMode ? (
            <ModelSelector
              type="image"
              currentModel={preferredImageModel}
              onModelChange={setPreferredImageModel}
            />
          ) : (
            <ModelSelector currentModel={preferredModel} onModelChange={handleModelChange} />
          )}

          <ToolbarGroup>
            <VoiceStatusIndicator
              voiceControls={voice}
              onOpenSettings={() => setShowVoiceSettings(true)}
            />
            <ThemeToggle />
            <UserMenu />
          </ToolbarGroup>
        </div>

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

        <div className="from-theme-canvas via-theme-canvas/80 pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-6">
          <div className="pointer-events-auto relative mx-auto max-w-4xl">
            <ErrorBanner
              message={chatError?.message || chatError}
              onDismiss={clearError}
              className="mb-3"
            />

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
              chatId={chatId}
              selectedFiles={inputFiles}
              onFilesUploaded={appendFiles}
              onRemoveFile={removeFile}
              isLoading={isLoading}
              isGenerating={isGenerating}
            />
          </div>
        </div>
      </div>

      {showVoiceSettings && (
        <VoiceSettings voiceControls={voice} onClose={() => setShowVoiceSettings(false)} />
      )}
    </div>
  );
};

export default ChatInterface;
