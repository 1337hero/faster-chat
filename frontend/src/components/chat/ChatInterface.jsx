import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useChat';
import { useUiState } from '@/state/useUiState';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import InputArea from './InputArea';
import MessageList from './MessageList';
import ModelSelector from './ModelSelector';

function ChatInterface({ chatId }) {
  const preferredModel = useUiState((state) => state.preferredModel);
  const setPreferredModel = useUiState((state) => state.setPreferredModel);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    status,
    stop,
    resumeStream,
  } = useChat({
    id: chatId,
    model: preferredModel,
  });

  useLayoutEffect(() => {
    if (!scrollContainerRef.current) return;
    if (autoScroll) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  return (
    <div className="relative flex w-full flex-1 flex-col" role="main" aria-label="Chat Interface">
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="scrollbar-w-2 h-[100dvh] overflow-y-auto pb-[180px] pt-16 scrollbar scrollbar-track-transparent scrollbar-thumb-latte-surface2 hover:scrollbar-thumb-latte-overlay0 dark:scrollbar-thumb-macchiato-surface2 dark:hover:scrollbar-thumb-macchiato-overlay0">
          <div className="mx-auto flex w-full max-w-3xl flex-col space-y-12 p-4">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 w-full pr-2">
        <div className="mx-auto w-full max-w-3xl">
          <InputArea
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            disabled={isLoading}
          />

            <Button
              color="red"
              onClick={stop}
              disabled={status !== "streaming" && status !== "submitted"}>
              Stop
            </Button>
            <Button
              outline
              onClick={resumeStream}
              disabled={!resumeStream || status === "streaming" || status === "submitted"}>
              Resume
            </Button>

          <ModelSelector currentModel={preferredModel} onModelChange={setPreferredModel} />
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
