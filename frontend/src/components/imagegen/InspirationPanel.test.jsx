import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import InspirationPanel from "@/components/imagegen/InspirationPanel";
import { INSPIRATION_PROMPTS } from "@faster-chat/shared";

let mockFavorites = [];
let mockToggleFavorite = null;

vi.mock("@/state/useUiState", () => ({
  useUiState: (selector) =>
    selector({
      inspirationFavorites: mockFavorites,
      toggleInspirationFavorite: (id) => mockToggleFavorite(id),
    }),
}));

describe("InspirationPanel", () => {
  beforeEach(() => {
    mockFavorites = [];
    mockToggleFavorite = vi.fn();
  });

  test("lists the full catalog with style and category", () => {
    render(<InspirationPanel onInsert={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText(/35mm film photograph of a weathered fisherman/)).toBeTruthy();
    expect(screen.getByText("cinematic photography · photorealistic")).toBeTruthy();
    // Every catalog entry gets a star toggle — count follows the data, not a literal
    expect(screen.getAllByRole("button", { name: /favorites/ })).toHaveLength(
      INSPIRATION_PROMPTS.length
    );
  });

  test("search filters by prompt keyword; category chips filter by category", () => {
    render(<InspirationPanel onInsert={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Search inspiration"), {
      target: { value: "spiderweb" },
    });
    expect(screen.getByText(/Macro photograph of a dew-covered spiderweb/)).toBeTruthy();
    expect(screen.queryByText(/35mm film photograph/)).toBeNull();

    fireEvent.change(screen.getByLabelText("Search inspiration"), { target: { value: "memphis" } });
    expect(screen.getByText(/Memphis-style/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search inspiration"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "isometric" }));
    // Exactly the isometric-category entries remain — count follows the data
    const isometricCount = INSPIRATION_PROMPTS.filter(
      (entry) => entry.category === "isometric"
    ).length;
    expect(screen.getAllByRole("button", { name: /favorites/ })).toHaveLength(isometricCount);
  });

  test("clicking an entry inserts its prompt into the composer", () => {
    const onInsert = vi.fn();
    render(<InspirationPanel onInsert={onInsert} onClose={vi.fn()} />);

    const entry = screen.getByText(/35mm film photograph of a weathered fisherman/);
    fireEvent.click(entry.closest("button"));

    expect(onInsert).toHaveBeenCalledWith(
      "35mm film photograph of a weathered fisherman mending a net at golden hour, 85mm f/1.4 lens, shallow depth of field, warm amber light, muted teal shadows, grain texture"
    );
  });

  test("favorite stars toggle and persist via uiState; the filter shows favorites only", () => {
    mockFavorites = ["ip-001"];
    render(<InspirationPanel onInsert={vi.fn()} onClose={vi.fn()} />);

    const firstCard = screen
      .getByText(/35mm film photograph of a weathered fisherman/)
      .closest("li");
    const star = firstCard.querySelector('button[aria-pressed="true"]');
    expect(star).toBeTruthy();

    // Unfavorite it — the toggle is recorded in uiState
    fireEvent.click(star);
    expect(mockToggleFavorite).toHaveBeenCalledWith("ip-001");

    // Favorites-only view: only the one favorite remains
    fireEvent.click(screen.getByTitle("Favorites only"));
    expect(screen.getAllByRole("button", { name: /favorites/ })).toHaveLength(1);
    expect(screen.getByText(/35mm film photograph of a weathered fisherman/)).toBeTruthy();
  });

  test("shows an empty state when nothing matches", () => {
    render(<InspirationPanel onInsert={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Search inspiration"), {
      target: { value: "zzzznotfound" },
    });
    expect(screen.getByText("No prompts match")).toBeTruthy();
  });
});
