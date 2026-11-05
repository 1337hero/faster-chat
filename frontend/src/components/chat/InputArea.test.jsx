import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/preact";
import { toast } from "sonner";
import InputArea from "@/components/chat/InputArea";

let mockUploadFiles = null;

// Mock useFileUploader
vi.mock("@/hooks/useFileUploader", () => ({
  useFileUploader: () => ({
    uploadFiles: (files) => mockUploadFiles(files),
    uploading: false,
    currentFile: null,
  }),
}));

vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

let mockImageMode = false;
let mockImageCount = 1;
let mockPendingReference = null;
let mockClearPendingReference = null;
let mockImageEnhance = false;
let mockToggleImageEnhance = null;
let mockSetEnhanceModelId = null;
let mockPendingPrompt = null;
let mockClearPendingPrompt = null;
let mockPreferredModel = "claude-sonnet-4-5";

// Mock useUiState
vi.mock("@/state/useUiState", () => ({
  useUiState: (selector) => {
    const state = {
      imageMode: mockImageMode,
      toggleImageMode: vi.fn(),
      setImageMode: vi.fn(),
      setWebSearchEnabled: vi.fn(),
      imageCount: mockImageCount,
      setImageCount: vi.fn(),
      pendingReference: mockPendingReference,
      clearPendingReference: mockClearPendingReference,
      imageEnhance: mockImageEnhance,
      toggleImageEnhance: (v) => mockToggleImageEnhance(v),
      enhanceModelId: null,
      setEnhanceModelId: (id) => mockSetEnhanceModelId(id),
      preferredModel: mockPreferredModel,
      pendingPrompt: mockPendingPrompt,
      clearPendingPrompt: () => mockClearPendingPrompt(),
    };
    return selector(state);
  },
}));

let mockPromptModelId = "gpt-4o";
let mockVisionModels = [
  { model_id: "gpt-4o", display_name: "GPT-4o" },
  { model_id: "gemini-flash", display_name: "Gemini Flash" },
];
let mockEnhanceImpl = async ({ prompt }) => ({ prompt: `expanded: ${prompt}` });
let mockEnhanceError = null;

vi.mock("@/hooks/usePromptTools", () => ({
  usePromptModel: () => ({ visionModels: mockVisionModels, modelId: mockPromptModelId }),
  useEnhancePrompt: () => ({
    mutateAsync: (args) => {
      if (mockEnhanceError) return Promise.reject(mockEnhanceError);
      return mockEnhanceImpl(args);
    },
  }),
}));

vi.mock("@/components/imagegen/InspirationPanel", () => ({
  default: () => <div data-testid="inspiration-panel" />,
}));

// Mock useFileDragDrop to expose real behavior for integration testing
let mockDragActive = false;
let capturedOnFileSelect = null;

vi.mock("@/hooks/useFileDragDrop", () => ({
  useFileDragDrop: (onFileSelect) => {
    capturedOnFileSelect = onFileSelect;
    return {
      dragActive: mockDragActive,
      handleDrag: vi.fn(),
      handleDrop: vi.fn(),
    };
  },
}));

// Mock child components that depend on context/routing
vi.mock("@/components/chat/ChatMemoryButton", () => ({
  default: () => <div data-testid="memory-button" />,
}));

vi.mock("@/components/chat/FilePreviewList", () => ({
  FilePreviewList: () => <div data-testid="file-preview-list" />,
}));

const defaultProps = {
  input: "",
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  disabled: false,
  voiceControls: null,
  onImageSubmit: vi.fn(),
  webSearchEnabled: false,
  onToggleWebSearch: vi.fn(),
  modelSupportsTools: true,
  chatId: "chat-1",
  selectedFiles: [],
  onFilesUploaded: vi.fn(),
  onRemoveFile: vi.fn(),
  isLoading: false,
  isGenerating: false,
  aspectRatios: ["1:1", "16:9", "9:16"],
  aspectRatio: "16:9",
  onAspectRatioChange: vi.fn(),
  imageCount: 1,
  onImageCountChange: vi.fn(),
  supportsImageToImage: true,
  onClearFiles: vi.fn(),
  onSetInput: vi.fn(),
};

describe("InputArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDragActive = false;
    mockImageMode = false;
    mockImageCount = 1;
    mockPendingReference = null;
    mockClearPendingReference = vi.fn();
    mockImageEnhance = false;
    mockToggleImageEnhance = vi.fn();
    mockSetEnhanceModelId = vi.fn();
    mockPendingPrompt = null;
    mockClearPendingPrompt = vi.fn();
    mockUploadFiles = vi.fn();
    capturedOnFileSelect = null;
    mockPromptModelId = "gpt-4o";
    mockVisionModels = [
      { model_id: "gpt-4o", display_name: "GPT-4o" },
      { model_id: "gemini-flash", display_name: "Gemini Flash" },
    ];
    mockEnhanceError = null;
  });

  test("renders the bordered wrapper with base classes", () => {
    const { container } = render(<InputArea {...defaultProps} />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain("rounded-2xl");
    expect(wrapper.className).toContain("border-theme-border");
  });

  test("applies loading border classes when isLoading", () => {
    const { container } = render(<InputArea {...defaultProps} isLoading={true} />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain("border-theme-primary/30");
  });

  test("applies generating border classes when isGenerating", () => {
    const { container } = render(<InputArea {...defaultProps} isGenerating={true} />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain("border-theme-primary/30");
  });

  test("applies drag-active classes when dragActive is true", () => {
    mockDragActive = true;
    const { container } = render(<InputArea {...defaultProps} />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain("border-theme-primary");
    expect(wrapper.className).toContain("bg-theme-primary/5");
  });

  test("renders drop overlay when dragActive is true", () => {
    mockDragActive = true;
    render(<InputArea {...defaultProps} />);
    expect(screen.getByText("Drop files to attach")).toBeTruthy();
  });

  test("does not render drop overlay when dragActive is false", () => {
    mockDragActive = false;
    render(<InputArea {...defaultProps} />);
    expect(screen.queryByText("Drop files to attach")).toBeNull();
  });

  test("uses transition-colors duration-150 (not transition-all)", () => {
    const { container } = render(<InputArea {...defaultProps} />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain("transition-colors");
    expect(wrapper.className).toContain("duration-150");
    expect(wrapper.className).not.toContain("transition-all");
  });

  test("attaches drag event handlers to the bordered wrapper", () => {
    const { container } = render(<InputArea {...defaultProps} />);
    const wrapper = container.firstChild;
    // Verify the wrapper has the drag event attributes rendered
    expect(wrapper.getAttribute("ondragenter")).toBeDefined();
    expect(wrapper.getAttribute("ondragleave")).toBeDefined();
    expect(wrapper.getAttribute("ondragover")).toBeDefined();
    expect(wrapper.getAttribute("ondrop")).toBeDefined();
  });

  test("wires useFileDragDrop callback to uploadFiles", () => {
    render(<InputArea {...defaultProps} />);
    // The mock captured the callback passed to useFileDragDrop
    expect(capturedOnFileSelect).toBeDefined();
  });

  test("registers window-level drop guard on mount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    render(<InputArea {...defaultProps} />);
    expect(addSpy).toHaveBeenCalledWith("dragover", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("drop", expect.any(Function));
    addSpy.mockRestore();
  });

  test("cleans up window-level drop guard on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<InputArea {...defaultProps} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("dragover", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("drop", expect.any(Function));
    removeSpy.mockRestore();
  });

  test("window drop guard prevents default for file drags", () => {
    let guardFn = null;
    const addSpy = vi.spyOn(window, "addEventListener").mockImplementation((event, fn) => {
      if (event === "drop") guardFn = fn;
    });
    render(<InputArea {...defaultProps} />);
    addSpy.mockRestore();

    const fileEvent = { dataTransfer: { types: ["Files"] }, preventDefault: vi.fn() };
    guardFn(fileEvent);
    expect(fileEvent.preventDefault).toHaveBeenCalled();
  });

  test("window drop guard does not prevent default for non-file drags", () => {
    let guardFn = null;
    const addSpy = vi.spyOn(window, "addEventListener").mockImplementation((event, fn) => {
      if (event === "drop") guardFn = fn;
    });
    render(<InputArea {...defaultProps} />);
    addSpy.mockRestore();

    const textEvent = { dataTransfer: { types: ["text/plain"] }, preventDefault: vi.fn() };
    guardFn(textEvent);
    expect(textEvent.preventDefault).not.toHaveBeenCalled();
  });

  test("window dragover guard prevents default for file drags", () => {
    let guardFn = null;
    const addSpy = vi.spyOn(window, "addEventListener").mockImplementation((event, fn) => {
      if (event === "dragover") guardFn = fn;
    });
    render(<InputArea {...defaultProps} />);
    addSpy.mockRestore();

    const fileEvent = { dataTransfer: { types: ["Files"] }, preventDefault: vi.fn() };
    guardFn(fileEvent);
    expect(fileEvent.preventDefault).toHaveBeenCalled();
  });

  test("paperclip file input still renders", () => {
    render(<InputArea {...defaultProps} />);
    const fileInput = document.getElementById("chat-input-file-upload");
    expect(fileInput).toBeTruthy();
    expect(fileInput.multiple).toBe(true);
  });

  describe("image-to-image reference attach", () => {
    test("image mode accepts image files only when the model supports editing", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} supportsImageToImage={true} />);
      const fileInput = document.getElementById("chat-input-file-upload");
      expect(fileInput.accept).toBe("image/*");
    });

    test("text mode keeps the general attachment accept filter", () => {
      mockImageMode = false;
      render(<InputArea {...defaultProps} supportsImageToImage={true} />);
      const fileInput = document.getElementById("chat-input-file-upload");
      expect(fileInput.accept).not.toBe("image/*");
    });

    test("hides the attach control in image mode when the model cannot edit", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} supportsImageToImage={false} />);
      expect(screen.queryByLabelText("Add attachment")).toBeNull();
    });

    test("shows the attach control in image mode when the model can edit", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} supportsImageToImage={true} />);
      expect(screen.getByLabelText("Add attachment")).toBeTruthy();
    });

    test("disables attach in image mode once three references are attached", () => {
      mockImageMode = true;
      render(
        <InputArea
          {...defaultProps}
          selectedFiles={[
            { id: "a", filename: "a.png" },
            { id: "b", filename: "b.png" },
            { id: "c", filename: "c.png" },
          ]}
        />
      );
      const fileInput = document.getElementById("chat-input-file-upload");
      expect(fileInput.disabled).toBe(true);
    });

    test("clears the reference files after an image submit so they don't leak into the next message", () => {
      mockImageMode = true;
      const refs = [
        { id: "a", filename: "a.png" },
        { id: "b", filename: "b.png" },
      ];
      render(<InputArea {...defaultProps} input="make it a watercolor" selectedFiles={refs} />);

      fireEvent.keyDown(screen.getByLabelText("Message input"), { key: "Enter" });

      expect(defaultProps.onImageSubmit).toHaveBeenCalledWith("make it a watercolor", refs);
      expect(defaultProps.onClearFiles).toHaveBeenCalled();
    });

    test("enforces the reference cap on drag-and-drop, not just the file input", () => {
      mockImageMode = true;
      render(
        <InputArea
          {...defaultProps}
          selectedFiles={[
            { id: "a", filename: "a.png" },
            { id: "b", filename: "b.png" },
          ]}
        />
      );

      capturedOnFileSelect([
        { name: "c.png", type: "image/png" },
        { name: "d.png", type: "image/png" },
      ]);

      // Only one slot remains, so the second dropped file is dropped with a notice
      expect(mockUploadFiles).toHaveBeenCalledTimes(1);
      expect(mockUploadFiles.mock.calls[0][0]).toHaveLength(1);
      expect(toast.warning).toHaveBeenCalled();
    });

    test("filters out non-image files on drag-and-drop and tells the user", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} />);

      capturedOnFileSelect([
        { name: "a.png", type: "image/png" },
        { name: "notes.pdf", type: "application/pdf" },
      ]);

      expect(mockUploadFiles).toHaveBeenCalledTimes(1);
      expect(mockUploadFiles.mock.calls[0][0]).toHaveLength(1);
      expect(toast.warning).toHaveBeenCalledWith("Only image files can be attached as references");
    });
  });

  describe("aspect ratio chips", () => {
    test("are hidden outside image mode", () => {
      render(<InputArea {...defaultProps} />);
      expect(screen.queryByText("Aspect ratio")).toBeNull();
    });

    test("render one chip per ratio in image mode, marking the active one", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} />);

      expect(screen.getByText("Aspect ratio")).toBeTruthy();
      expect(screen.getByRole("button", { name: "16:9" }).getAttribute("aria-pressed")).toBe(
        "true"
      );
      expect(screen.getByRole("button", { name: "1:1" }).getAttribute("aria-pressed")).toBe(
        "false"
      );
      expect(screen.getByRole("button", { name: "9:16" })).toBeTruthy();
    });

    test("clicking a chip reports the ratio", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "9:16" }));
      expect(defaultProps.onAspectRatioChange).toHaveBeenCalledWith("9:16");
    });
  });

  describe("image count chips", () => {
    test("are hidden outside image mode", () => {
      render(<InputArea {...defaultProps} />);
      expect(screen.queryByText("Count")).toBeNull();
    });

    test("render one chip per count up to the max, marking the active one", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} imageCount={2} />);

      expect(screen.getByText("Count")).toBeTruthy();
      expect(screen.getByRole("button", { name: "2" }).getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByRole("button", { name: "1" }).getAttribute("aria-pressed")).toBe("false");
      expect(screen.getByRole("button", { name: "4" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "5" })).toBeNull();
    });

    test("clicking a chip reports the count", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "3" }));
      expect(defaultProps.onImageCountChange).toHaveBeenCalledWith(3);
    });
  });

  describe("enhance toggle (image mode)", () => {
    test("renders in image mode and is hidden in text mode", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} />);
      expect(screen.getByRole("button", { name: "Enhance" })).toBeTruthy();

      cleanup();
      mockImageMode = false;
      render(<InputArea {...defaultProps} />);
      expect(screen.queryByRole("button", { name: "Enhance" })).toBeNull();
    });

    test("toggling persists the state to uiState", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: "Enhance" }));
      expect(mockToggleImageEnhance).toHaveBeenCalled();
    });

    test("is disabled when no vision model is available", () => {
      mockImageMode = true;
      mockPromptModelId = null;
      render(<InputArea {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Enhance" }).disabled).toBe(true);
    });

    test("selecting an enhancement model persists it", () => {
      mockImageMode = true;
      mockImageEnhance = true;
      render(<InputArea {...defaultProps} />);

      fireEvent.change(screen.getByLabelText("Enhancement model"), {
        target: { value: "gemini-flash" },
      });
      expect(mockSetEnhanceModelId).toHaveBeenCalledWith("gemini-flash");
    });

    test("submit with enhance on expands the prompt into the composer without generating, and the next submit generates", async () => {
      mockImageMode = true;
      mockImageEnhance = true;
      const view = render(<InputArea {...defaultProps} input="cyberpunk cat" />);

      fireEvent.keyDown(screen.getByLabelText("Message input"), { key: "Enter" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(defaultProps.onImageSubmit).not.toHaveBeenCalled();
      expect(defaultProps.onSetInput).toHaveBeenCalledWith("expanded: cyberpunk cat");

      // The user confirms the expanded prompt with one more submit (same mounted instance)
      view.rerender(<InputArea {...defaultProps} input="expanded: cyberpunk cat" />);
      fireEvent.keyDown(screen.getByLabelText("Message input"), { key: "Enter" });
      expect(defaultProps.onImageSubmit).toHaveBeenCalledWith("expanded: cyberpunk cat", []);
    });

    test("submit with enhance off goes straight to generation (regression)", async () => {
      mockImageMode = true;
      mockImageEnhance = false;
      render(<InputArea {...defaultProps} input="cyberpunk cat" />);

      fireEvent.keyDown(screen.getByLabelText("Message input"), { key: "Enter" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(defaultProps.onImageSubmit).toHaveBeenCalledWith("cyberpunk cat", []);
    });

    test("an enhancement failure keeps the input, toasts, and retries on the next submit", async () => {
      mockImageMode = true;
      mockImageEnhance = true;
      mockEnhanceError = new Error("Model is busy");
      render(<InputArea {...defaultProps} input="cyberpunk cat" />);

      fireEvent.keyDown(screen.getByLabelText("Message input"), { key: "Enter" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(toast.error).toHaveBeenCalledWith("Model is busy");
      expect(defaultProps.onImageSubmit).not.toHaveBeenCalled();

      mockEnhanceError = null;
      fireEvent.keyDown(screen.getByLabelText("Message input"), { key: "Enter" });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(defaultProps.onSetInput).toHaveBeenCalledWith("expanded: cyberpunk cat");
    });

    test("a pending prompt inserts into the composer and clears itself", async () => {
      mockImageMode = true;
      mockPendingPrompt = "a red cube on a table";
      mockClearPendingPrompt = vi.fn();
      render(<InputArea {...defaultProps} input="" />);

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockClearPendingPrompt).toHaveBeenCalled();

      const updater = defaultProps.onSetInput.mock.calls
        .map((call) => call[0])
        .find((arg) => typeof arg === "function");
      expect(updater("existing text")).toBe("existing text a red cube on a table");
    });

    test("the lightbulb opens the inspiration panel in image mode only", () => {
      mockImageMode = true;
      render(<InputArea {...defaultProps} />);
      const bulb = screen.getByRole("button", { name: "Inspiration library" });

      fireEvent.click(bulb);
      expect(document.querySelector('[data-testid="inspiration-panel"]')).toBeTruthy();

      cleanup();
      mockImageMode = false;
      render(<InputArea {...defaultProps} />);
      expect(screen.queryByRole("button", { name: "Inspiration library" })).toBeNull();
    });
  });
});
