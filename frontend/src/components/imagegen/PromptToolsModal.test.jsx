import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PromptToolsModal from "@/components/imagegen/PromptToolsModal";

const fetchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  API_BASE: "",
  apiFetch: (endpoint, options) => fetchMock(endpoint, options),
}));

let mockVisionModels = [
  { model_id: "gpt-4o", display_name: "GPT-4o", metadata: { supports_vision: true } },
];

vi.mock("@/lib/providersClient", () => ({
  providersClient: {
    getEnabledModelsByType: () => Promise.resolve({ models: mockVisionModels }),
  },
}));

let mockSetPendingPrompt = null;
vi.mock("@/state/useUiState", () => ({
  useUiState: (selector) =>
    selector({
      enhanceModelId: null,
      preferredModel: "claude-sonnet-4-5",
      setPendingPrompt: (text) => mockSetPendingPrompt(text),
      clearPendingPrompt: vi.fn(),
    }),
}));

vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("PromptToolsModal", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockVisionModels = [
      { model_id: "gpt-4o", display_name: "GPT-4o", metadata: { supports_vision: true } },
    ];
    mockSetPendingPrompt = vi.fn();
  });

  test("auto-runs with standard length and re-runs when the length selection changes", async () => {
    let resolveFirst, resolveSecond;
    fetchMock.mockImplementation((endpoint, options) => {
      if (endpoint !== "/api/images/reverse-prompt") throw new Error(`Unexpected: ${endpoint}`);
      const body = JSON.parse(options.body);
      if (body.length === "standard") {
        return new Promise(
          (resolve) => (resolveFirst = () => resolve({ prompt: "standard result" }))
        );
      }
      if (body.length === "detailed") {
        return new Promise(
          (resolve) => (resolveSecond = () => resolve({ prompt: "detailed result" }))
        );
      }
      throw new Error(`Unexpected length: ${body.length}`);
    });

    renderWithClient(<PromptToolsModal fileId="img-1" onInsert={vi.fn()} onClose={vi.fn()} />);

    await screen.findByText("Analyzing image...");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      fileId: "img-1",
      length: "standard",
      modelId: "gpt-4o",
    });

    resolveFirst();
    await screen.findByText("standard result");

    fireEvent.click(screen.getByRole("button", { name: "Detailed" }));
    await screen.findByText("Analyzing image...");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).length).toBe("detailed");

    resolveSecond();
    expect(await screen.findByText("detailed result")).toBeTruthy();
  });

  test("marks the active length and defaults to standard", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<PromptToolsModal fileId="img-1" onInsert={vi.fn()} onClose={vi.fn()} />);

    const standard = await screen.findByRole("button", { name: "Standard" });
    expect(standard.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Concise" }).getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  test("shows the model's error message when the request fails", async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error("Rate limit exceeded. Please try again later."), { status: 429 })
    );

    renderWithClient(<PromptToolsModal fileId="img-1" onInsert={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText("Rate limit exceeded. Please try again later.")).toBeTruthy();
  });

  test("warns when no vision-capable model is available and never calls the API", async () => {
    mockVisionModels = [];
    fetchMock.mockImplementation(() => {
      throw new Error("should not be called");
    });

    renderWithClient(<PromptToolsModal fileId="img-1" onInsert={vi.fn()} onClose={vi.fn()} />);

    expect(
      await screen.findByText(
        "No vision-capable chat model available. Add one under Settings to use reverse prompt."
      )
    ).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
