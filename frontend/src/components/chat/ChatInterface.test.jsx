import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/preact";
import ChatInterface from "@/components/chat/ChatInterface";
import { toast } from "sonner";

const mockCreateMessage = vi.fn(async () => ({}));
const mockGenerate = vi.fn((vars, opts) => {
  mockGenerate.lastVars = vars;
  mockGenerate.lastOnSuccess = opts?.onSuccess;
});
let imageGenHookOptions = null;
let inputAreaProps = null;

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/state/useUiState", () => ({
  useUiState: (selector) =>
    selector({
      preferredModel: "claude",
      setPreferredModel: vi.fn(),
      imageMode: true,
      preferredImageModel: "flux",
      setPreferredImageModel: vi.fn(),
      imageAspectRatio: "1:1",
      setImageAspectRatio: vi.fn(),
      imageCount: 3,
      setImageCount: vi.fn(),
      autoScroll: false,
      webSearchEnabled: false,
      toggleWebSearch: vi.fn(),
      setWebSearchEnabled: vi.fn(),
    }),
}));

vi.mock("@/hooks/useChat", () => ({
  useChat: () => ({
    messages: [],
    input: "",
    inputFiles: [],
    appendFiles: vi.fn(),
    removeFile: vi.fn(),
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    submitMessage: vi.fn(),
    error: null,
    clearError: vi.fn(),
    isLoading: false,
    status: "ready",
    stop: vi.fn(),
    regenerate: vi.fn(),
    setInput: vi.fn(),
  }),
}));

vi.mock("@/hooks/useChatVoice", () => ({
  useChatVoice: () => ({
    voice: { isSupported: false, isActive: false, toggleConversation: vi.fn() },
  }),
}));

vi.mock("@/hooks/useMemoryStatus", () => ({
  useChatMemoryEnabled: () => false,
}));

vi.mock("@/hooks/useChatNavigation", () => ({
  useChatNavigation: () => ({ navigateToChat: vi.fn() }),
}));

vi.mock("@/hooks/useChatsQuery", () => ({
  useCreateChatMutation: () => ({ mutateAsync: vi.fn() }),
  useCreateMessageMutation: () => ({ mutateAsync: mockCreateMessage }),
}));

vi.mock("@/hooks/useImageGeneration", () => ({
  useImageGeneration: (options) => {
    imageGenHookOptions = options;
    return { generate: mockGenerate, isGenerating: false };
  },
}));

vi.mock("@/lib/providersClient", () => ({
  providersClient: { getEnabledModelsByType: vi.fn() },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { models: [] } }),
}));

vi.mock("@/components/layout/SidebarToolbar", () => ({
  default: () => <div data-testid="sidebar-toolbar" />,
}));
vi.mock("@/components/ui/ErrorBanner", () => ({
  default: () => null,
}));
vi.mock("@/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => null,
}));
vi.mock("@/components/ui/ToolbarGroup", () => ({
  ToolbarGroup: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/ui/UserMenu", () => ({
  UserMenu: () => null,
}));
vi.mock("@/components/chat/MessageList", () => ({
  default: () => <div data-testid="message-list" />,
}));
vi.mock("@/components/chat/ModelSelector", () => ({
  default: () => <div data-testid="model-selector" />,
}));
vi.mock("@/components/chat/VoiceSettings", () => ({
  default: () => null,
}));
vi.mock("@/components/chat/VoiceStatusIndicator", () => ({
  default: () => null,
}));
vi.mock("@/components/chat/InputArea", () => ({
  default: (props) => {
    inputAreaProps = props;
    return <div data-testid="input-area" />;
  },
}));

describe("ChatInterface image generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    imageGenHookOptions = null;
    inputAreaProps = null;
    mockGenerate.lastVars = null;
    mockGenerate.lastOnSuccess = null;
  });

  const submitImage = async (prompt = "a cube") => {
    render(<ChatInterface chatId="chat-1" />);
    inputAreaProps.onImageSubmit(prompt);
    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
  };

  test("sends the selected image count and attaches every returned image to one message", async () => {
    await submitImage();

    expect(mockGenerate.lastVars).toEqual({
      prompt: "a cube",
      chatId: "chat-1",
      model: "flux",
      aspectRatio: "1:1",
      numImages: 3,
    });

    await mockGenerate.lastOnSuccess({
      images: [
        { id: "f1", model: "flux" },
        { id: "f2", model: "flux" },
        { id: "f3", model: "flux" },
      ],
      failures: [],
    });

    await waitFor(() => expect(mockCreateMessage).toHaveBeenCalledTimes(2));
    const assistantCall = mockCreateMessage.mock.calls[1][0];
    expect(assistantCall.chatId).toBe("chat-1");
    expect(assistantCall.message.role).toBe("assistant");
    expect(assistantCall.message.fileIds).toEqual(["f1", "f2", "f3"]);
    expect(toast.success).toHaveBeenCalled();
  });

  test("posts the successful images and reports partial failures", async () => {
    await submitImage();

    await mockGenerate.lastOnSuccess({
      images: [{ id: "f1", model: "flux" }],
      failures: [{ index: 1, error: "Rate limit exceeded. Please try again later." }],
    });

    await waitFor(() => expect(mockCreateMessage).toHaveBeenCalledTimes(2));
    const assistantCall = mockCreateMessage.mock.calls[1][0];
    expect(assistantCall.message.fileIds).toEqual(["f1"]);
    expect(toast.warning).toHaveBeenCalledWith("1 of 2 images generated");
  });

  test("total failure posts no assistant message and surfaces the error", async () => {
    await submitImage();

    imageGenHookOptions.onError(new Error("All image generations failed"));

    expect(mockCreateMessage).toHaveBeenCalledTimes(1);
    expect(mockCreateMessage.mock.calls[0][0].message.role).toBe("user");
    expect(toast.error).toHaveBeenCalledWith("All image generations failed");
  });

  test("total failure surfaces the provider reason from the response body", async () => {
    await submitImage();

    const error = new Error("All image generations failed");
    error.body = { failures: [{ index: 0, error: "Invalid API key" }] };
    imageGenHookOptions.onError(error);

    expect(toast.error).toHaveBeenCalledWith("Invalid API key");
  });
});
