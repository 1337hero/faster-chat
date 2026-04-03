import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";

describe("provider routes", () => {
  let app, adminCookie, memberCookie;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
  });

  describe("access control", () => {
    test("GET /api/admin/providers returns 401 without session", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers");
      expect(res.status).toBe(401);
    });

    test("GET /api/admin/providers returns 403 for member", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers", { cookie: memberCookie });
      expect(res.status).toBe(403);
    });

    test("POST /api/admin/providers returns 401 without session", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: { name: "test", displayName: "Test", providerType: "official", apiKey: "sk-test" },
      });
      expect(res.status).toBe(401);
    });

    test("POST /api/admin/providers returns 403 for member", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: { name: "test", displayName: "Test", providerType: "official", apiKey: "sk-test" },
        cookie: memberCookie,
      });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/admin/providers", () => {
    test("creates provider (returns 201)", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name: "anthropic",
          displayName: "Anthropic",
          providerType: "official",
          apiKey: "sk-ant-test-key-12345",
        },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.provider).toBeDefined();
      expect(data.provider.name).toBe("anthropic");
      expect(data.provider.display_name).toBe("Anthropic");
      expect(data.provider.id).toBeDefined();
    });

    test("duplicate name returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name: "anthropic",
          displayName: "Anthropic Dupe",
          providerType: "official",
          apiKey: "sk-dupe-key",
        },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("already exists");
    });
  });

  describe("SSRF validation", () => {
    test("metadata service URL in baseUrl returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name: "ssrf-test",
          displayName: "SSRF",
          providerType: "openai-compatible",
          baseUrl: "http://169.254.169.254/latest/meta-data",
          apiKey: "sk-ssrf-key",
        },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid base URL");
    });

    test("non-http protocol returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name: "ftp-test",
          displayName: "FTP",
          providerType: "openai-compatible",
          baseUrl: "ftp://evil.com/models",
          apiKey: "sk-ftp-key",
        },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/admin/providers", () => {
    test("lists providers with model counts", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.providers)).toBe(true);
      const anthropic = data.providers.find((p) => p.name === "anthropic");
      expect(anthropic).toBeDefined();
      expect(typeof anthropic.model_count).toBe("number");
      expect(anthropic.has_key).toBe(true);
      expect(typeof anthropic.enabled).toBe("boolean");
    });
  });

  describe("PUT /api/admin/providers/:id", () => {
    let providerId;

    beforeAll(async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers", { cookie: adminCookie });
      const data = await res.json();
      providerId = data.providers.find((p) => p.name === "anthropic").id;
    });

    test("updates display name and base URL", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/providers/${providerId}`, {
        body: { displayName: "Anthropic Updated", baseUrl: "https://api.anthropic.com/v2" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("non-existent provider returns 404", async () => {
      const res = await makeRequest(app, "PUT", "/api/admin/providers/99999", {
        body: { displayName: "Nope" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/providers/:id", () => {
    let deleteProviderId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name: "deleteme",
          displayName: "Delete Me",
          providerType: "official",
          apiKey: "sk-delete-key",
        },
        cookie: adminCookie,
      });
      const data = await res.json();
      deleteProviderId = data.provider.id;
    });

    test("deletes provider", async () => {
      const res = await makeRequest(app, "DELETE", `/api/admin/providers/${deleteProviderId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("non-existent provider returns 404", async () => {
      const res = await makeRequest(app, "DELETE", "/api/admin/providers/99999", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/admin/providers/available", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers/available");
      expect(res.status).toBe(401);
    });

    test("returns 403 for member", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers/available", { cookie: memberCookie });
      expect(res.status).toBe(403);
    });

    test("returns providers array for admin", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers/available", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.providers)).toBe(true);
      expect(data.providers.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/admin/providers/:id/models/enable", () => {
    let providerId;

    beforeAll(async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers", { cookie: adminCookie });
      const data = await res.json();
      providerId = data.providers.find((p) => p.name === "anthropic")?.id;
    });

    test("enables all models for provider", async () => {
      const res = await makeRequest(app, "POST", `/api/admin/providers/${providerId}/models/enable`, {
        body: { enabled: true },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("disables all models for provider", async () => {
      const res = await makeRequest(app, "POST", `/api/admin/providers/${providerId}/models/enable`, {
        body: { enabled: false },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("returns 404 for non-existent provider", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers/99999/models/enable", {
        body: { enabled: true },
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("API key rotation audit", () => {
    let providerId;

    beforeAll(async () => {
      const res = await makeRequest(app, "GET", "/api/admin/providers", { cookie: adminCookie });
      const data = await res.json();
      providerId = data.providers.find((p) => p.name === "anthropic")?.id;
    });

    test("updating API key creates audit log entry", async () => {
      await makeRequest(app, "PUT", `/api/admin/providers/${providerId}`, {
        body: { apiKey: "sk-new-rotated-key-12345" },
        cookie: adminCookie,
      });

      const auditRes = await makeRequest(app, "GET", "/api/admin/audit-log", { cookie: adminCookie });
      const auditData = await auditRes.json();
      const keyChangeEntry = auditData.logs.find((l) => l.action === "api_key_changed");
      expect(keyChangeEntry).toBeDefined();
    });
  });
});
