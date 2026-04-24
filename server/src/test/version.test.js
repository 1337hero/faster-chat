import { describe, test, expect, beforeAll } from "bun:test";
import { createTestApp, resetDatabase } from "./helpers.js";
import { compareSemver } from "../../../frontend/src/hooks/useUpdateCheck.js";

describe("version", () => {
  describe("GET /api/version", () => {
    let app;

    beforeAll(() => {
      resetDatabase();
      app = createTestApp();
    });

    test("returns 200 with version string", async () => {
      const res = await app.request("/api/version");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.version).toBeTruthy();
    });

    test("version matches root package.json", async () => {
      const res = await app.request("/api/version");
      const data = await res.json();
      const { readFileSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      const pkg = JSON.parse(
        readFileSync(resolve(import.meta.dirname, "../../../package.json"), "utf-8")
      );
      expect(data.version).toBe(pkg.version);
    });

    test("requires no authentication", async () => {
      const res = await app.request("/api/version");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/version/latest-release", () => {
    let app;

    beforeAll(() => {
      resetDatabase();
      app = createTestApp();
    });

    test("returns 200 with version and url fields", async () => {
      const res = await app.request("/api/version/latest-release");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("url");
    });
  });

  describe("compareSemver", () => {
    test("detects newer major version", () => {
      expect(compareSemver("0.2.0", "1.0.0")).toBe(true);
    });

    test("detects newer minor version", () => {
      expect(compareSemver("0.2.0", "0.3.0")).toBe(true);
    });

    test("detects newer patch version", () => {
      expect(compareSemver("0.2.0", "0.2.1")).toBe(true);
    });

    test("returns false for same version", () => {
      expect(compareSemver("0.2.0", "0.2.0")).toBe(false);
    });

    test("returns false for older version", () => {
      expect(compareSemver("1.0.0", "0.9.0")).toBe(false);
    });

    test("handles missing patch segment", () => {
      expect(compareSemver("1.0", "1.1")).toBe(true);
    });

    test("major bump trumps lower minor", () => {
      expect(compareSemver("0.9.9", "1.0.0")).toBe(true);
    });

    test("minor bump trumps lower patch", () => {
      expect(compareSemver("0.2.9", "0.3.0")).toBe(true);
    });

    test("returns false when current is ahead", () => {
      expect(compareSemver("2.0.0", "1.9.9")).toBe(false);
    });
  });
});
