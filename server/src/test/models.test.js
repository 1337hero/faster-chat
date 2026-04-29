import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";
import { dbUtils } from "../lib/db.js";
import { encryptApiKey } from "../lib/encryption.js";

function seedProvider() {
  const { encryptedKey, iv, authTag } = encryptApiKey("sk-test-key-12345");
  return dbUtils.createProvider(
    "test-provider",
    "Test Provider",
    "official",
    null,
    encryptedKey,
    iv,
    authTag
  );
}

describe("model routes", () => {
  let app, adminCookie, memberCookie;
  let providerId, enabledModelId;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;

    providerId = seedProvider();
    enabledModelId = dbUtils.createModel(providerId, "gpt-4", "GPT-4", true, "text");
    dbUtils.createModel(providerId, "gpt-3.5", "GPT-3.5", false, "text");
    dbUtils.createModel(providerId, "dall-e-3", "DALL-E 3", true, "image");

    dbUtils.setModelMetadata(enabledModelId, {
      context_window: 128000,
      max_output_tokens: 4096,
      input_price_per_1m: 30,
      output_price_per_1m: 60,
      supports_streaming: true,
      supports_vision: true,
      supports_tools: true,
    });
  });

  describe("GET /api/models", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "GET", "/api/models");
      expect(res.status).toBe(401);
    });

    test("returns enabled models only", async () => {
      const res = await makeRequest(app, "GET", "/api/models", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.models)).toBe(true);

      const modelIds = data.models.map((m) => m.model_id);
      expect(modelIds).toContain("gpt-4");
      expect(modelIds).toContain("dall-e-3");
      expect(modelIds).not.toContain("gpt-3.5");
    });

    test("filters by type with ?type=text", async () => {
      const res = await makeRequest(app, "GET", "/api/models?type=text", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();

      const modelIds = data.models.map((m) => m.model_id);
      expect(modelIds).toContain("gpt-4");
      expect(modelIds).not.toContain("dall-e-3");
    });
  });

  describe("GET /api/admin/models", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/models");
      expect(res.status).toBe(401);
    });

    test("returns 403 for member", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/models", { cookie: memberCookie });
      expect(res.status).toBe(403);
    });

    test("returns all models for admin (including disabled)", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/models", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.models)).toBe(true);

      const modelIds = data.models.map((m) => m.model_id);
      expect(modelIds).toContain("gpt-4");
      expect(modelIds).toContain("gpt-3.5");
      expect(modelIds).toContain("dall-e-3");

      const disabled = data.models.find((m) => m.model_id === "gpt-3.5");
      expect(disabled.enabled).toBe(false);
    });
  });

  describe("GET /api/admin/models/:id", () => {
    test("returns model detail with metadata", async () => {
      const res = await makeRequest(app, "GET", `/api/admin/models/${enabledModelId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.model).toBeDefined();
      expect(data.model.model_id).toBe("gpt-4");
      expect(data.model.display_name).toBe("GPT-4");
      expect(data.model.metadata.context_window).toBe(128000);
      expect(data.model.metadata.max_output_tokens).toBe(4096);
      expect(data.model.metadata.supports_vision).toBe(true);
      expect(data.model.metadata.supports_tools).toBe(true);
    });

    test("returns 404 for non-existent model", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/models/99999", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/admin/models/:id", () => {
    test("updates display name", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/models/${enabledModelId}`, {
        body: { displayName: "GPT-4 Turbo" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const detailRes = await makeRequest(app, "GET", `/api/admin/models/${enabledModelId}`, {
        cookie: adminCookie,
      });
      expect(detailRes.status).toBe(200);
      const detailData = await detailRes.json();
      expect(detailData.model.display_name).toBe("GPT-4 Turbo");
    });

    test("returns 404 for non-existent model", async () => {
      const res = await makeRequest(app, "PUT", "/api/admin/models/99999", {
        body: { displayName: "Nope" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/admin/models/:id/default", () => {
    test("sets model as default", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/models/${enabledModelId}/default`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const detail = await makeRequest(app, "GET", `/api/admin/models/${enabledModelId}`, {
        cookie: adminCookie,
      });
      const detailData = await detail.json();
      expect(detailData.model.is_default).toBe(true);
    });
  });

  describe("updateModel default atomicity", () => {
    test("only the most recently set default model has is_default = 1", () => {
      const modelA = dbUtils.createModel(providerId, "atomic-a", "Atomic A", true, "text");
      const modelB = dbUtils.createModel(providerId, "atomic-b", "Atomic B", true, "text");

      dbUtils.updateModel(modelA, { isDefault: true });
      dbUtils.updateModel(modelB, { isDefault: true });

      const a = dbUtils.getModelById(modelA);
      const b = dbUtils.getModelById(modelB);

      expect(a.is_default).toBe(0);
      expect(b.is_default).toBe(1);
    });
  });

  describe("DELETE /api/admin/models/:id", () => {
    let deleteModelId;

    beforeAll(() => {
      deleteModelId = dbUtils.createModel(providerId, "delete-me", "Delete Me", true, "text");
    });

    test("deletes model", async () => {
      const res = await makeRequest(app, "DELETE", `/api/admin/models/${deleteModelId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const detailRes = await makeRequest(app, "GET", `/api/admin/models/${deleteModelId}`, {
        cookie: adminCookie,
      });
      expect(detailRes.status).toBe(404);
    });

    test("returns 404 for non-existent model", async () => {
      const res = await makeRequest(app, "DELETE", "/api/admin/models/99999", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });
});
