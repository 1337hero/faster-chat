import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/preact";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import GalleryView from "@/components/gallery/GalleryView";

const fetchMock = vi.fn();

vi.mock("@/lib/api", () => ({
  API_BASE: "",
  apiFetch: (endpoint, options) => fetchMock(endpoint, options),
}));

vi.mock("@/state/useAuthState", () => ({
  useAuthState: (selector) => selector({ user: { id: 1 } }),
}));

let capturedNavigate = null;
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => (options) => capturedNavigate(options),
}));

const galleryImages = [
  {
    id: "img-1",
    filename: "gen_1.png",
    mimeType: "image/png",
    createdAt: 3000,
    isFavorite: false,
    size: 1024,
    prompt: "a red cube on a table",
    model: "flux-1.1",
    modelDisplayName: "FLUX",
    aspectRatio: "1:1",
    source: "replicate",
    chatId: "chat-1",
    generatedAt: 3000,
  },
  {
    id: "img-2",
    filename: "gen_2.png",
    mimeType: "image/png",
    createdAt: 2000,
    isFavorite: true,
    size: 2048,
    prompt: "a blue sphere in space",
    model: "sdxl",
    modelDisplayName: "SDXL",
    aspectRatio: "16:9",
    source: "local",
    chatId: null,
    generatedAt: 2000,
  },
  {
    id: "img-3",
    filename: "gen_3.png",
    mimeType: "image/webp",
    createdAt: 1000,
    isFavorite: false,
    size: 512,
    prompt: "a green forest at dawn",
    model: "flux-1.1",
    modelDisplayName: "FLUX",
    aspectRatio: "9:16",
    source: "replicate",
    chatId: "chat-2",
    generatedAt: 1000,
  },
];

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("GalleryView", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    capturedNavigate = null;
    fetchMock.mockImplementation(async (endpoint) => {
      if (endpoint === "/api/images/gallery") {
        return { images: galleryImages };
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });
  });

  test("renders a grid of generated images with prompt and model captions", async () => {
    renderWithClient(<GalleryView />);

    const prompts = await screen.findAllByText("a red cube on a table");
    expect(prompts).toHaveLength(1);
    expect(await screen.findByText("a blue sphere in space")).toBeTruthy();
    expect(screen.getByText("a green forest at dawn")).toBeTruthy();
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getAllByText("FLUX")).toHaveLength(2);
    expect(screen.getByText("SDXL")).toBeTruthy();
  });

  test("typing in the search box filters images by prompt", async () => {
    renderWithClient(<GalleryView />);
    await screen.findByText("a red cube on a table");

    fireEvent.change(screen.getByLabelText("Search prompts"), { target: { value: "sphere" } });

    expect(await screen.findByText("a blue sphere in space")).toBeTruthy();
    expect(await waitFor(() => screen.queryByText("a red cube on a table"))).toBeNull();
    expect(screen.queryByText("a green forest at dawn")).toBeNull();
  });

  test("favorites-only toggle hides non-favorites", async () => {
    renderWithClient(<GalleryView />);
    await screen.findByText("a red cube on a table");

    fireEvent.click(screen.getByRole("button", { name: "Favorites" }));

    expect(await screen.findByText("a blue sphere in space")).toBeTruthy();
    expect(await waitFor(() => screen.queryByText("a red cube on a table"))).toBeNull();
    expect(screen.queryByText("a green forest at dawn")).toBeNull();
  });

  test("clicking the star toggles favorite optimistically and posts the change", async () => {
    let resolveFavorite;
    fetchMock.mockImplementation(async (endpoint, options) => {
      if (endpoint === "/api/images/gallery") {
        return { images: galleryImages };
      }
      if (endpoint === "/api/images/gallery/img-1/favorite" && options?.method === "POST") {
        return new Promise((resolve) => {
          resolveFavorite = resolve;
        });
      }
      throw new Error(`Unexpected endpoint: ${endpoint}`);
    });

    renderWithClient(<GalleryView />);
    // Scope to img-1's card via its prompt, so we never confuse it with other stars
    const card = await screen
      .findByText("a red cube on a table")
      .then((el) => el.closest(".group"));
    const star = within(card).getByRole("button", { name: "Add to favorites" });
    expect(star.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(star);

    // Optimistic: the star flips before the request resolves
    await waitFor(() => {
      const updatedStar = within(card).getByRole("button", { name: "Remove from favorites" });
      expect(updatedStar.getAttribute("aria-pressed")).toBe("true");
    });

    resolveFavorite({ id: "img-1", isFavorite: true });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/images/gallery/img-1/favorite", {
        method: "POST",
      })
    );
  });
});
