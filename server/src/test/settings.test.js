import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";

describe("settings routes", () => {
  let app, adminCookie, memberCookie;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
  });

  describe("GET /api/settings", () => {
    test("returns 200 with appName and logoIcon (no auth required)", async () => {
      const res = await makeRequest(app, "GET", "/api/settings");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.appName).toBeDefined();
      expect(data.logoIcon).toBeDefined();
    });
  });

  describe("PUT /api/settings", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "PUT", "/api/settings", {
        body: { appName: "Test App" },
      });
      expect(res.status).toBe(401);
    });

    test("returns 403 for member", async () => {
      const res = await makeRequest(app, "PUT", "/api/settings", {
        body: { appName: "Test App" },
        cookie: memberCookie,
      });
      expect(res.status).toBe(403);
    });

    test("admin updates appName successfully", async () => {
      const res = await makeRequest(app, "PUT", "/api/settings", {
        body: { appName: "Updated App" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.appName).toBe("Updated App");
    });

    test("empty object returns 400", async () => {
      const res = await makeRequest(app, "PUT", "/api/settings", {
        body: {},
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("No valid settings to update");
    });
  });

  describe("GET /api/settings/web-search", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "GET", "/api/settings/web-search");
      expect(res.status).toBe(401);
    });

    test("returns 403 for member", async () => {
      const res = await makeRequest(app, "GET", "/api/settings/web-search", {
        cookie: memberCookie,
      });
      expect(res.status).toBe(403);
    });

    test("admin gets response with apiKey field", async () => {
      const res = await makeRequest(app, "GET", "/api/settings/web-search", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect("apiKey" in data).toBe(true);
    });
  });

  describe("PUT /api/settings/web-search", () => {
    test("returns 401 without auth", async () => {
      const res = await makeRequest(app, "PUT", "/api/settings/web-search", {
        body: { apiKey: "BSA_test_key_1234567890" },
      });
      expect(res.status).toBe(401);
    });

    test("admin sets key, subsequent GET returns masked key", async () => {
      const putRes = await makeRequest(app, "PUT", "/api/settings/web-search", {
        body: { apiKey: "BSA_test_key_1234567890" },
        cookie: adminCookie,
      });
      expect(putRes.status).toBe(200);
      const putData = await putRes.json();
      expect(putData.success).toBe(true);

      const getRes = await makeRequest(app, "GET", "/api/settings/web-search", {
        cookie: adminCookie,
      });
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.apiKey).toContain("••••");
      expect(getData.apiKey).toContain("7890");
    });
  });
});
