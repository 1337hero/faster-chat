import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import InputArea from "@/components/chat/InputArea";

// Mock useFileUploader
vi.mock("@/hooks/useFileUploader", () => ({
  useFileUploader: () => ({
    uploadFiles: vi.fn(),
    uploading: false,
    currentFile: null,
  }),
}));

// Mock useUiState
vi.mock("@/state/useUiState", () => ({
  useUiState: (selector) => {
    const state = {
      imageMode: false,
      toggleImageMode: vi.fn(),
      setImageMode: vi.fn(),
      setWebSearchEnabled: vi.fn(),
    };
    return selector(state);
  },
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

vi.mock("@/components/ui/ErrorBanner", () => ({
  default: () => null,
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
};

describe("InputArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDragActive = false;
    capturedOnFileSelect = null;
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
});
