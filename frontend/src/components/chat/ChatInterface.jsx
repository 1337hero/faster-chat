import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import { useChat } from "@/hooks/useChat";
import { useUiState } from "@/state/useUiState";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import InputArea from "./InputArea";
import MessageList from "./MessageList";
import ModelSelector from "./ModelSelector";

const MenuIcon = ({ className, size = 24 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
};

const ChatInterface = ({ chatId, onMenuClick }) => {
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
                <MenuIcon />
              </button>
            )}

            <ModelSelector currentModel={preferredModel} onModelChange={setPreferredModel} />
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        {/* Messages Area - Scrolls behind input and navbar */}
        <div
          ref={scrollContainerRef}
          className="custom-scrollbar absolute inset-0 overflow-y-auto scroll-smooth p-4 md:px-20"
          style={{ paddingTop: "1rem", paddingBottom: "180px" }}>
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
            <div
              className={`layered-panel elevate-lg relative flex items-end gap-3 rounded-[22px] px-4 py-3 transition-transform duration-200 ${
                isLoading ? "opacity-95" : "hover:-translate-y-1"
              }`}>
              <InputArea
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
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
    </div>
  );
};

export default ChatInterface;
