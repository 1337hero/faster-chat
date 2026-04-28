import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import dns from "node:dns";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";
import { dbUtils } from "../lib/db.js";

// Stub DNS so tests using fictitious hostnames don't depend on real network resolution.
// Returns a public-looking (TEST-NET-3) IP for any hostname.
dns.promises.lookup = async (_hostname, opts) => {
  const all = opts && opts.all;
  const result = [{ address: "203.0.113.10", family: 4 }];
  return all ? result : result[0];
};

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
      dbUtils.createModel(data.provider.id, "anthropic-test-1", "Anthropic Test 1", false, "text");
      dbUtils.createModel(data.provider.id, "anthropic-test-2", "Anthropic Test 2", true, "text");
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

    // openai-compatible is local-first by design; only cloud metadata services and
    // bad schemes are hard-blocked. Loopback/private addresses are intentionally allowed.
    const REJECT_CASES = [
      ["AWS metadata service", "http://169.254.169.254/"],
      ["non-http(s) ftp scheme", "ftp://example.com/"],
    ];

    for (const [label, url] of REJECT_CASES) {
      test(`POST rejects ${label}: ${url}`, async () => {
        const res = await makeRequest(app, "POST", "/api/admin/providers", {
          body: {
            name: `ssrf-post-${label.replace(/\W+/g, "-")}`,
            displayName: "ssrf",
            providerType: "openai-compatible",
            baseUrl: url,
            apiKey: "sk-test-key",
          },
          cookie: adminCookie,
        });
        expect([400, 422]).toContain(res.status);
      });
    }

    test("POST accepts valid public https URL", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name: "ssrf-accept-public",
          displayName: "Public OpenAI",
          providerType: "openai-compatible",
          baseUrl: "https://api.openai.com/v1",
          apiKey: "sk-public-key",
        },
        cookie: adminCookie,
      });
      // Provider creation succeeds with 201 even if model fetch fails
      expect(res.status).toBe(201);
    });

    describe("PUT rejection mirror", () => {
      let putTargetId;

      beforeAll(async () => {
        const createRes = await makeRequest(app, "POST", "/api/admin/providers", {
          body: {
            name: "ssrf-put-target",
            displayName: "PUT target",
            providerType: "openai-compatible",
            baseUrl: "https://api.example-public.com/v1",
            apiKey: "sk-put-key",
          },
          cookie: adminCookie,
        });
        const data = await createRes.json();
        putTargetId = data.provider.id;
      });

      for (const [label, url] of REJECT_CASES) {
        test(`PUT rejects ${label}: ${url}`, async () => {
          const res = await makeRequest(app, "PUT", `/api/admin/providers/${putTargetId}`, {
            body: { baseUrl: url },
            cookie: adminCookie,
          });
          expect([400, 422]).toContain(res.status);
        });
      }
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
      const res = await makeRequest(app, "GET", "/api/admin/providers/available", {
        cookie: memberCookie,
      });
      expect(res.status).toBe(403);
    });

    test("returns providers array for admin", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (typeof input === "string" && input === "https://models.dev/api.json") {
          return new Response(
            JSON.stringify({
              openai: {
                name: "OpenAI",
                api: "https://api.openai.com/v1",
                env: ["OPENAI_API_KEY"],
                models: {
                  "gpt-4o": {
                    name: "GPT-4o",
                    modalities: { input: ["text"], output: ["text"] },
                  },
                },
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        return originalFetch(input, init);
      };

      const res = await makeRequest(app, "GET", "/api/admin/providers/available", {
        cookie: adminCookie,
      }).finally(() => {
        globalThis.fetch = originalFetch;
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.providers)).toBe(true);
      expect(data.providers.length).toBeGreaterThan(0);
      expect(data.providers.some((provider) => provider.id === "openai")).toBe(true);
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
      const res = await makeRequest(
        app,
        "POST",
        `/api/admin/providers/${providerId}/models/enable`,
        {
          body: { enabled: true },
          cookie: adminCookie,
        }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      const models = dbUtils.getModelsByProvider(providerId);
      expect(models.length).toBeGreaterThanOrEqual(2);
      expect(models.every((model) => model.enabled === 1)).toBe(true);
    });

    test("disables all models for provider", async () => {
      const res = await makeRequest(
        app,
        "POST",
        `/api/admin/providers/${providerId}/models/enable`,
        {
          body: { enabled: false },
          cookie: adminCookie,
        }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      const models = dbUtils.getModelsByProvider(providerId);
      expect(models.length).toBeGreaterThanOrEqual(2);
      expect(models.every((model) => model.enabled === 0)).toBe(true);
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
      const updateRes = await makeRequest(app, "PUT", `/api/admin/providers/${providerId}`, {
        body: { apiKey: "sk-new-rotated-key-12345" },
        cookie: adminCookie,
      });
      expect(updateRes.status).toBe(200);

      const auditRes = await makeRequest(app, "GET", "/api/admin/audit-log", {
        cookie: adminCookie,
      });
      expect(auditRes.status).toBe(200);
      const auditData = await auditRes.json();
      const keyChangeEntry = auditData.logs.find(
        (l) => l.action === "api_key_changed" && String(l.target_id) === String(providerId)
      );
      expect(keyChangeEntry).toBeDefined();
    });
  });

  // =============================================
  // OpenAI-compatible model fetcher (llama-cpp / llamafile)
  // =============================================
  describe("OpenAI-compatible model fetcher", () => {
    let originalFetch;

    beforeAll(() => {
      originalFetch = globalThis.fetch;
    });

    function stubOpenAIModelsResponse(models) {
      globalThis.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (url && url.includes("/v1/models")) {
          return new Response(JSON.stringify({ data: models }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    }

    function restoreFetch() {
      globalThis.fetch = originalFetch;
    }

    async function createTestProvider({ name, displayName = "llama.cpp", baseUrl }) {
      const res = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name,
          displayName,
          providerType: "openai-compatible",
          baseUrl,
          apiKey: "sk-test",
        },
        cookie: adminCookie,
      });
      const data = await res.json();
      return data.provider.id;
    }

    // --- Cycle 1: llama-cpp refresh populates models ---
    describe("llama-cpp provider", () => {
      let providerId;

      beforeAll(() => {
        stubOpenAIModelsResponse([{ id: "llama-3.1-8b-instruct", owned_by: "local" }]);
      });

      afterAll(() => {
        restoreFetch();
      });

      test("refresh returns model_count > 0", async () => {
        // Create the provider
        const createRes = await makeRequest(app, "POST", "/api/admin/providers", {
          body: {
            name: "llama-cpp",
            displayName: "llama.cpp",
            providerType: "openai-compatible",
            baseUrl: "http://llama-cpp.test.local:8080",
            apiKey: "sk-test",
          },
          cookie: adminCookie,
        });
        expect(createRes.status).toBe(201);
        const createData = await createRes.json();
        providerId = createData.provider.id;

        // Refresh models
        const refreshRes = await makeRequest(
          app,
          "POST",
          `/api/admin/providers/${providerId}/refresh-models`,
          { cookie: adminCookie }
        );
        expect(refreshRes.status).toBe(200);
        const refreshData = await refreshRes.json();
        expect(refreshData.model_count).toBeGreaterThan(0);
        expect(refreshData.model_count).toBe(1);
      });
    });

    // --- Cycle 2: llamafile registered under distinct key ---
    describe("llamafile provider", () => {
      let llamafileProviderId;

      beforeAll(() => {
        stubOpenAIModelsResponse([
          { id: "llama-3.2-3b-instruct", owned_by: "local" },
          { id: "phi-3-mini", owned_by: "local" },
        ]);
      });

      afterAll(() => {
        restoreFetch();
      });

      test("refresh returns model_count > 0 with distinct key", async () => {
        const createRes = await makeRequest(app, "POST", "/api/admin/providers", {
          body: {
            name: "llamafile",
            displayName: "Llamafile",
            providerType: "openai-compatible",
            baseUrl: "http://llamafile.test.local:8081",
            apiKey: "sk-test",
          },
          cookie: adminCookie,
        });
        expect(createRes.status).toBe(201);
        const createData = await createRes.json();
        llamafileProviderId = createData.provider.id;

        const refreshRes = await makeRequest(
          app,
          "POST",
          `/api/admin/providers/${llamafileProviderId}/refresh-models`,
          { cookie: adminCookie }
        );
        expect(refreshRes.status).toBe(200);
        const refreshData = await refreshRes.json();
        expect(refreshData.model_count).toBe(2);
      });
    });

    // --- Cycle 3: URL normalization — baseUrl ending in /v1 ---
    describe("URL normalization", () => {
      let capturedUrl;
      let llamaCppUrlnormId;

      beforeAll(async () => {
        llamaCppUrlnormId = await createTestProvider({
          name: "llama-cpp-urlnorm",
          baseUrl: "http://urlnorm.test.local:8082",
        });

        globalThis.fetch = async (input, init) => {
          const url = typeof input === "string" ? input : input.url;
          capturedUrl = url;
          if (url && url.includes("/v1/models")) {
            return new Response(
              JSON.stringify({ data: [{ id: "test-model", owned_by: "local" }] }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }
          return originalFetch(input, init);
        };
      });

      afterAll(() => {
        restoreFetch();
      });

      test("baseUrl ending in /v1 does not double-append /v1/models", async () => {
        const updateRes = await makeRequest(
          app,
          "PUT",
          `/api/admin/providers/${llamaCppUrlnormId}`,
          {
            body: { baseUrl: "http://urlnorm.test.local:8082/v1" },
            cookie: adminCookie,
          }
        );
        expect(updateRes.status).toBe(200);

        const refreshRes = await makeRequest(
          app,
          "POST",
          `/api/admin/providers/${llamaCppUrlnormId}/refresh-models`,
          { cookie: adminCookie }
        );
        expect(refreshRes.status).toBe(200);
        expect(capturedUrl).toBe("http://urlnorm.test.local:8082/v1/models");
        expect(capturedUrl).not.toContain("/v1/v1/models");
      });
    });

    // --- Cycle 4: embedding filter ---
    describe("embedding filter", () => {
      let embedProviderId;

      beforeAll(async () => {
        stubOpenAIModelsResponse([
          { id: "llama-3.1-8b-instruct", owned_by: "local" },
          { id: "nomic-embed-text-v1", owned_by: "local" },
          { id: "text-embedding-3-small", owned_by: "local" },
        ]);

        embedProviderId = await createTestProvider({
          name: "llama-cpp-embed",
          baseUrl: "http://embed.test.local:8083",
        });
      });

      afterAll(() => {
        restoreFetch();
      });

      test("excludes embedding models from results", async () => {
        const refreshRes = await makeRequest(
          app,
          "POST",
          `/api/admin/providers/${embedProviderId}/refresh-models`,
          { cookie: adminCookie }
        );
        expect(refreshRes.status).toBe(200);
        const refreshData = await refreshRes.json();
        // 3 models: 1 chat + 1 embed (not "embedding") + 1 embedding → 2 pass filter
        expect(refreshData.model_count).toBe(2);
      });
    });

    // --- Cycle 5: unreachable URL surfaces display name ---
    describe("error messages", () => {
      let originalConsoleError;
      let errorCalls;
      let errorProviderId;

      beforeAll(async () => {
        errorCalls = [];
        originalConsoleError = console.error;
        console.error = (...args) => {
          errorCalls.push(args);
        };

        errorProviderId = await createTestProvider({
          name: "llama-cpp-error",
          baseUrl: "http://error-host.test.local:8084",
        });

        globalThis.fetch = async () => {
          throw new Error("network error");
        };
      });

      afterAll(() => {
        console.error = originalConsoleError;
        restoreFetch();
      });

      test("unreachable llama-cpp URL mentions display name in error", async () => {
        const refreshRes = await makeRequest(
          app,
          "POST",
          `/api/admin/providers/${errorProviderId}/refresh-models`,
          { cookie: adminCookie }
        );
        expect(refreshRes.status).toBe(500);

        const relevantCall = errorCalls.find((call) =>
          call.some((arg) => typeof arg === "string" && arg.includes("llama.cpp"))
        );
        expect(relevantCall).toBeDefined();
      });
    });

    // --- Cycle 6: invalid response shape ---
    describe("invalid response shape", () => {
      let invalidProviderId;

      beforeAll(async () => {
        globalThis.fetch = async (input, init) => {
          const url = typeof input === "string" ? input : input.url;
          if (url && url.includes("/v1/models")) {
            return new Response(JSON.stringify({ foo: "bar" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return originalFetch(input, init);
        };

        invalidProviderId = await createTestProvider({
          name: "llama-cpp-invalid",
          baseUrl: "http://invalid-host.test.local:8085",
        });
      });

      afterAll(() => {
        restoreFetch();
      });

      test("non-array response returns 500", async () => {
        const refreshRes = await makeRequest(
          app,
          "POST",
          `/api/admin/providers/${invalidProviderId}/refresh-models`,
          { cookie: adminCookie }
        );
        expect(refreshRes.status).toBe(500);
      });
    });

    // --- Cycle 7: SSRF guard on llama-cpp base URL ---
    describe("SSRF guard", () => {
      test("metadata service URL in llama-cpp baseUrl returns 400", async () => {
        const res = await makeRequest(app, "POST", "/api/admin/providers", {
          body: {
            name: "llama-cpp-ssrf",
            displayName: "llama.cpp SSRF",
            providerType: "openai-compatible",
            baseUrl: "http://169.254.169.254",
            apiKey: "sk-test",
          },
          cookie: adminCookie,
        });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain("Invalid base URL");
      });
    });

    // --- Cycle 8: non-existent provider on refresh-models ---
    describe("refresh-models", () => {
      test("returns 404 for non-existent provider", async () => {
        const res = await makeRequest(app, "POST", "/api/admin/providers/99999/refresh-models", {
          cookie: adminCookie,
        });
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toBe("Provider not found");
      });
    });
  });

  describe("Ollama model fetcher :latest normalization", () => {
    let originalFetch;
    let providerId;

    beforeAll(async () => {
      originalFetch = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        const url = typeof input === "string" ? input : input.url;
        if (url && url.endsWith("/api/tags")) {
          return new Response(
            JSON.stringify({
              models: [{ name: "qwen3.5-4b-FLM:latest" }, { name: "llama3.2:q4_k_m" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return originalFetch(input, init);
      };

      const createRes = await makeRequest(app, "POST", "/api/admin/providers", {
        body: {
          name: "ollama",
          displayName: "ollama",
          providerType: "openai-compatible",
          baseUrl: "http://ollama.test.local:11434",
          apiKey: "sk-test",
        },
        cookie: adminCookie,
      });
      providerId = (await createRes.json()).provider.id;
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    test("strips trailing :latest, preserves other tags", async () => {
      const refreshRes = await makeRequest(
        app,
        "POST",
        `/api/admin/providers/${providerId}/refresh-models`,
        { cookie: adminCookie }
      );
      expect(refreshRes.status).toBe(200);
      expect((await refreshRes.json()).model_count).toBe(2);

      const models = dbUtils.getModelsByProvider(providerId);
      const ids = models.map((m) => m.model_id).sort();
      const displayNames = models.map((m) => m.display_name).sort();
      expect(ids).toEqual(["llama3.2:q4_k_m", "qwen3.5-4b-FLM"]);
      expect(displayNames).toEqual(["llama3.2:q4_k_m", "qwen3.5-4b-FLM"]);
    });
  });
});
