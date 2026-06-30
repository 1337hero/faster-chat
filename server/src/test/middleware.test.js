import { describe, test, expect, beforeAll } from "bun:test";
import { Hono } from "hono";
import { createTestApp, resetDatabase, seedAdminUser, seedMemberUser } from "./helpers.js";
import { ensureSession, requireRole, optionalAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import { getClientIP } from "../lib/requestUtils.js";

describe("middleware", () => {
  describe("ensureSession", () => {
    let app, fullApp, adminCookie;

    beforeAll(async () => {
      resetDatabase();

      app = new Hono();
      app.use("/test/*", ensureSession);
      app.get("/test/protected", (c) => c.json({ user: c.get("user") }));

      fullApp = createTestApp();
      const admin = await seedAdminUser(fullApp);
      adminCookie = admin.cookie;
    });

    test("returns 401 without cookie", async () => {
      const res = await app.request("/test/protected");
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    test("returns 401 with invalid session cookie", async () => {
      const res = await app.request("/test/protected", {
        headers: { Cookie: "session=bogus-id" },
      });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Session expired");
    });

    test("sets user on context with valid session", async () => {
      const res = await app.request("/test/protected", {
        headers: { Cookie: adminCookie },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.username).toBe("admin");
      expect(data.user.role).toBe("admin");
      expect(data.user.id).toBeDefined();
    });
  });

  describe("requireRole", () => {
    let app, adminCookie, memberCookie;

    beforeAll(async () => {
      resetDatabase();

      app = new Hono();
      app.use("/admin/*", ensureSession, requireRole("admin"));
      app.get("/admin/dashboard", (c) => c.json({ ok: true }));

      const fullApp = createTestApp();
      const admin = await seedAdminUser(fullApp);
      adminCookie = admin.cookie;
      const member = await seedMemberUser(fullApp, adminCookie);
      memberCookie = member.cookie;
    });

    test("admin passes admin-required route", async () => {
      const res = await app.request("/admin/dashboard", {
        headers: { Cookie: adminCookie },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    test("member gets 403 on admin route", async () => {
      const res = await app.request("/admin/dashboard", {
        headers: { Cookie: memberCookie },
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Forbidden: insufficient permissions");
    });

    test("no session returns 401", async () => {
      const res = await app.request("/admin/dashboard");
      expect(res.status).toBe(401);
    });
  });

  describe("optionalAuth", () => {
    let app, adminCookie;

    beforeAll(async () => {
      resetDatabase();

      app = new Hono();
      app.use("/public/*", optionalAuth);
      app.get("/public/info", (c) => c.json({ user: c.get("user") }));

      const fullApp = createTestApp();
      const admin = await seedAdminUser(fullApp);
      adminCookie = admin.cookie;
    });

    test("sets user when cookie present", async () => {
      const res = await app.request("/public/info", {
        headers: { Cookie: adminCookie },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).not.toBeNull();
      expect(data.user.username).toBe("admin");
    });

    test("sets user to null when no cookie", async () => {
      const res = await app.request("/public/info");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeNull();
    });

    test("sets user to null with invalid cookie", async () => {
      const res = await app.request("/public/info", {
        headers: { Cookie: "session=invalid-garbage" },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user).toBeNull();
    });
  });

  describe("createRateLimiter", () => {
    test("allows requests under limit", async () => {
      const app = new Hono();
      const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 3 });
      app.use("/api/*", limiter);
      app.get("/api/data", (c) => c.json({ ok: true }));

      for (let i = 0; i < 3; i++) {
        const res = await app.request("/api/data");
        expect(res.status).toBe(200);
      }
    });

    test("returns 429 when limit exceeded", async () => {
      const app = new Hono();
      const limiter = createRateLimiter({ windowMs: 10000, maxRequests: 3 });
      app.use("/api/*", limiter);
      app.get("/api/data", (c) => c.json({ ok: true }));

      for (let i = 0; i < 3; i++) {
        await app.request("/api/data");
      }

      const res = await app.request("/api/data");
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toBe("Too many requests. Please try again later.");
    });

    test("uses custom key function", async () => {
      const app = new Hono();
      const limiter = createRateLimiter({
        windowMs: 10000,
        maxRequests: 2,
        keyFn: (c) => c.req.header("x-api-key") || "anon",
      });
      app.use("/api/*", limiter);
      app.get("/api/data", (c) => c.json({ ok: true }));

      // 2 requests from key-a
      for (let i = 0; i < 2; i++) {
        const res = await app.request("/api/data", {
          headers: { "x-api-key": "key-a" },
        });
        expect(res.status).toBe(200);
      }

      // key-a is now rate limited
      const blocked = await app.request("/api/data", {
        headers: { "x-api-key": "key-a" },
      });
      expect(blocked.status).toBe(429);

      // key-b still works
      const allowed = await app.request("/api/data", {
        headers: { "x-api-key": "key-b" },
      });
      expect(allowed.status).toBe(200);
    });
  });

  describe("getClientIP", () => {
    let app;

    beforeAll(() => {
      app = new Hono();
      app.get("/ip", (c) => c.text(getClientIP(c)));
    });

    test("returns x-forwarded-for first entry", async () => {
      const res = await app.request("/ip", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      });
      expect(await res.text()).toBe("1.2.3.4");
    });

    test("returns x-real-ip when forwarded-for absent", async () => {
      const res = await app.request("/ip", {
        headers: { "x-real-ip": "9.8.7.6" },
      });
      expect(await res.text()).toBe("9.8.7.6");
    });

    test("returns 'local' when no proxy headers and no socket", async () => {
      const res = await app.request("/ip");
      expect(await res.text()).toBe("local");
    });

    test("prefers x-forwarded-for over x-real-ip", async () => {
      const res = await app.request("/ip", {
        headers: {
          "x-forwarded-for": "10.0.0.1",
          "x-real-ip": "10.0.0.2",
        },
      });
      expect(await res.text()).toBe("10.0.0.1");
    });
  });
});
