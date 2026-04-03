import { describe, test, expect, beforeAll } from "bun:test";
import { createTestApp, resetDatabase } from "./helpers.js";

describe("app middleware", () => {
  let app;

  beforeAll(() => {
    resetDatabase();
    app = createTestApp();
  });

  describe("security headers", () => {
    test("includes X-Content-Type-Options: nosniff", async () => {
      const res = await app.request("/api/version");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    });

    test("includes X-Frame-Options: DENY", async () => {
      const res = await app.request("/api/version");
      expect(res.headers.get("x-frame-options")).toBe("DENY");
    });

    test("includes X-XSS-Protection: 0", async () => {
      const res = await app.request("/api/version");
      expect(res.headers.get("x-xss-protection")).toBe("0");
    });

    test("includes Referrer-Policy header", async () => {
      const res = await app.request("/api/version");
      expect(res.headers.get("referrer-policy")).toBeTruthy();
    });

    test("includes Content-Security-Policy header", async () => {
      const res = await app.request("/api/version");
      expect(res.headers.get("content-security-policy")).toBeTruthy();
    });

    test("includes Permissions-Policy header", async () => {
      const res = await app.request("/api/version");
      expect(res.headers.get("permissions-policy")).toBeTruthy();
    });
  });

  describe("body size limit", () => {
    test("rejects request with Content-Length over 50MB", async () => {
      const res = await app.request("/api/auth/session", {
        headers: { "content-length": String(60 * 1024 * 1024) },
      });
      expect(res.status).toBe(413);
    });

    test("allows request with normal Content-Length", async () => {
      const res = await app.request("/api/version", {
        headers: { "content-length": "128" },
      });
      expect(res.status).toBe(200);
    });
  });

  describe("CORS", () => {
    test("returns Access-Control-Allow-Origin for localhost origin", async () => {
      const res = await app.request("/api/version", {
        headers: { Origin: "http://localhost:5173" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    });

    test("does not return Access-Control-Allow-Origin for non-localhost origin", async () => {
      const res = await app.request("/api/version", {
        headers: { Origin: "https://evil.com" },
      });
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });
  });
});
