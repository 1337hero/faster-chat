import { describe, test, expect, beforeEach } from "vitest";
import { useUiState } from "@/state/useUiState";

// Exercises the real store, not a mock: the component tests replace useUiState
// with plain objects, so the toggle/persist semantics live only here.
const store = useUiState;

function resetState() {
  store.setState({
    imageEnhance: false,
    enhanceModelId: null,
    inspirationFavorites: [],
    pendingPrompt: null,
  });
}

describe("useUiState", () => {
  beforeEach(() => {
    localStorage.removeItem("ui-state");
    resetState();
  });

  test("toggleImageEnhance flips the enhance flag", () => {
    expect(store.getState().imageEnhance).toBe(false);
    store.getState().toggleImageEnhance();
    expect(store.getState().imageEnhance).toBe(true);
    store.getState().toggleImageEnhance();
    expect(store.getState().imageEnhance).toBe(false);
  });

  test("toggleInspirationFavorite adds, then removes, an id", () => {
    store.getState().toggleInspirationFavorite("ip-001");
    expect(store.getState().inspirationFavorites).toEqual(["ip-001"]);
    store.getState().toggleInspirationFavorite("ip-002");
    expect(store.getState().inspirationFavorites).toEqual(["ip-001", "ip-002"]);
    store.getState().toggleInspirationFavorite("ip-001");
    expect(store.getState().inspirationFavorites).toEqual(["ip-002"]);
  });

  test("pendingPrompt is settable and clearable", () => {
    store.getState().setPendingPrompt("a red cube");
    expect(store.getState().pendingPrompt).toBe("a red cube");
    store.getState().clearPendingPrompt();
    expect(store.getState().pendingPrompt).toBeNull();
  });

  test("persistence keeps the durable UI choices but never the one-shot handoffs", () => {
    store.setState({ imageEnhance: true, enhanceModelId: "gpt-4o" });
    store.getState().toggleInspirationFavorite("ip-001");
    store.getState().setPendingPrompt("should not persist");
    store.getState().setPendingReference({ id: "ref-1" });

    const persisted = store.persist.getOptions().partialize(store.getState());

    expect(persisted).toMatchObject({
      imageEnhance: true,
      enhanceModelId: "gpt-4o",
      inspirationFavorites: ["ip-001"],
    });
    expect(persisted).not.toHaveProperty("pendingPrompt");
    expect(persisted).not.toHaveProperty("pendingReference");
    expect(persisted).not.toHaveProperty("imageMode");
  });
});
