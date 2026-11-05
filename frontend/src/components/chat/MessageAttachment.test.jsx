import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MessageAttachment from "@/components/chat/MessageAttachment";

const fetchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  API_BASE: "",
  apiFetch: (endpoint, options) => fetchMock(endpoint, options),
}));

vi.mock("@/lib/providersClient", () => ({
  providersClient: {
    getEnabledModelsByType: () =>
      Promise.resolve({
        models: [
          { model_id: "gpt-4o", display_name: "GPT-4o", metadata: { supports_vision: true } },
          { model_id: "llama-3", display_name: "Llama 3", metadata: { supports_vision: false } },
        ],
      }),
  },
}));

let mockSetPendingPrompt = null;
vi.mock("@/state/useUiState", () => ({
  useUiState: (selector) =>
    selector({
      setPendingPrompt: (text) => mockSetPendingPrompt(text),
      clearPendingPrompt: vi.fn(),
      pendingPrompt: null,
    }),
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("MessageAttachment - reverse prompt", () => {
  let resolveReversePrompt;

  beforeEach(() => {
    fetchMock.mockReset();
    mockSetPendingPrompt = vi.fn();
    resolveReversePrompt = null;
    fetchMock.mockImplementation((endpoint) => {
      if (endpoint === "/api/files/img-1") {
        return Promise.resolve({
          mimeType: "image/png",
          filename: "gen_1.png",
          size: 1024,
          sizeFormatted: "1 KB",
          meta: { type: "generated", prompt: "a red cube" },
        });
      }
      if (endpoint === "/api/images/reverse-prompt") {
        return new Promise((resolve) => {
          resolveReversePrompt = () => resolve({ prompt: "a red cube on a table, studio light" });
        });
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });
  });

  test("shows a Reverse prompt button on an image attachment", async () => {
    renderWithClient(<MessageAttachment fileId="img-1" />);
    expect(await screen.findByRole("button", { name: "Reverse prompt" })).toBeTruthy();
  });

  test("opens the result modal and shows a loading state while the mutation is pending", async () => {
    renderWithClient(<MessageAttachment fileId="img-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Reverse prompt" }));

    expect(await screen.findByText("Analyzing image...")).toBeTruthy();

    resolveReversePrompt();
    expect(await screen.findByText("a red cube on a table, studio light")).toBeTruthy();
  });

  test("Insert fills the composer via the pending prompt", async () => {
    renderWithClient(<MessageAttachment fileId="img-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Reverse prompt" }));
    await screen.findByText("Analyzing image...");
    resolveReversePrompt();

    fireEvent.click(await screen.findByRole("button", { name: "Insert into composer" }));
    expect(mockSetPendingPrompt).toHaveBeenCalledWith("a red cube on a table, studio light");
  });

  test("Copy puts the prompt on the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.assign(navigator, { clipboard: { writeText } });

    renderWithClient(<MessageAttachment fileId="img-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Reverse prompt" }));
    await screen.findByText("Analyzing image...");
    resolveReversePrompt();

    fireEvent.click(await screen.findByRole("button", { name: "Copy prompt" }));
    expect(writeText).toHaveBeenCalledWith("a red cube on a table, studio light");
  });
});
