import { describe, test, expect, vi, afterEach } from "vitest";
import { apiFetch } from "./api";

function mockFetch(response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  test("returns parsed JSON on success", async () => {
    mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    expect(await apiFetch("/api/version")).toEqual({ ok: true });
  });

  test("throws the server's error message on JSON error responses", async () => {
    mockFetch(new Response(JSON.stringify({ error: "Chat not found" }), { status: 404 }));
    await expect(apiFetch("/api/chats/x")).rejects.toMatchObject({
      message: "Chat not found",
      status: 404,
    });
  });

  test("throws a readable message when the backend is down (non-JSON body)", async () => {
    mockFetch(new Response("<html>502 Bad Gateway</html>", { status: 502 }));
    await expect(apiFetch("/api/version")).rejects.toMatchObject({
      message: "Server unreachable (502)",
      status: 502,
    });
  });

  test("throws a readable message on an empty error body", async () => {
    mockFetch(new Response(null, { status: 503 }));
    await expect(apiFetch("/api/version")).rejects.toMatchObject({
      message: "Server unreachable (503)",
      status: 503,
    });
  });
});
