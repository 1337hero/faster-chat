import { describe, test, expect, beforeAll } from "bun:test";
import { createTestApp, resetDatabase, createTestUser, makeRequest } from "./helpers.js";
import { dbUtils } from "../lib/db.js";

function directCookie(userId) {
  const { sessionId } = dbUtils.createSession(userId);
  return `session=${sessionId}`;
}

describe("auth routes", () => {
  let app;

  beforeAll(() => {
    resetDatabase();
    app = createTestApp();
  });

  describe("registration", () => {
    test("first user succeeds with 201 and admin role", async () => {
      const res = await makeRequest(app, "POST", "/api/auth/register", {
        body: { username: "firstadmin", password: "adminpassword123" },
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.username).toBe("firstadmin");
      expect(data.user.role).toBe("admin");

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("session=");
    });

    test("second registration returns 403", async () => {
      const res = await makeRequest(app, "POST", "/api/auth/register", {
        body: { username: "second", password: "secondpass123" },
      });
      expect(res.status).toBe(403);
    });

    test("short username returns 400", async () => {
      resetDatabase();
      const res = await makeRequest(app, "POST", "/api/auth/register", {
        body: { username: "ab", password: "validpassword123" },
      });
      expect(res.status).toBe(400);
    });

    test("short password returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/auth/register", {
        body: { username: "validuser", password: "short" },
      });
      expect(res.status).toBe(400);
    });
  });

  describe("login", () => {
    beforeAll(async () => {
      resetDatabase();
      await createTestUser({ username: "admin", password: "adminpassword123", role: "admin" });
    });

    test("valid credentials returns 200 with user and cookie", async () => {
      const res = await makeRequest(app, "POST", "/api/auth/login", {
        body: { username: "admin", password: "adminpassword123" },
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.username).toBe("admin");
      expect(data.user.role).toBe("admin");
      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toContain("session=");
    });

    test("wrong password returns 401", async () => {
      const res = await makeRequest(app, "POST", "/api/auth/login", {
        body: { username: "admin", password: "wrongpassword" },
      });
      expect(res.status).toBe(401);
    });

    test("non-existent username returns 401", async () => {
      const res = await makeRequest(app, "POST", "/api/auth/login", {
        body: { username: "nonexistent", password: "whatever123" },
      });
      expect(res.status).toBe(401);
    });

    test("response never includes password_hash", async () => {
      const res = await makeRequest(app, "POST", "/api/auth/login", {
        body: { username: "admin", password: "adminpassword123" },
      });
      const data = await res.json();
      expect(data.user.password_hash).toBeUndefined();
      expect(data.password_hash).toBeUndefined();
    });
  });

  describe("session", () => {
    let cookie;

    beforeAll(async () => {
      resetDatabase();
      const user = await createTestUser({
        username: "admin",
        password: "adminpassword123",
        role: "admin",
      });
      cookie = directCookie(user.id);
    });

    test("valid cookie returns user info", async () => {
      const res = await makeRequest(app, "GET", "/api/auth/session", { cookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.username).toBe("admin");
      expect(data.user.role).toBe("admin");
    });

    test("no cookie returns 401", async () => {
      const res = await makeRequest(app, "GET", "/api/auth/session");
      expect(res.status).toBe(401);
    });

    test("invalid cookie returns 401", async () => {
      const res = await makeRequest(app, "GET", "/api/auth/session", {
        cookie: "session=bogus-session-id",
      });
      expect(res.status).toBe(401);
    });
  });

  describe("logout", () => {
    let cookie;

    beforeAll(async () => {
      resetDatabase();
      const user = await createTestUser({
        username: "admin",
        password: "adminpassword123",
        role: "admin",
      });
      cookie = directCookie(user.id);
    });

    test("clears session so subsequent /session returns 401", async () => {
      const logoutRes = await makeRequest(app, "POST", "/api/auth/logout", { cookie });
      expect(logoutRes.status).toBe(200);

      const sessionRes = await makeRequest(app, "GET", "/api/auth/session", { cookie });
      expect(sessionRes.status).toBe(401);
    });
  });

  describe("password change", () => {
    let cookie;

    beforeAll(async () => {
      resetDatabase();
      const user = await createTestUser({
        username: "admin",
        password: "adminpassword123",
        role: "admin",
      });
      cookie = directCookie(user.id);
    });

    test("correct current password succeeds", async () => {
      const res = await makeRequest(app, "PUT", "/api/auth/change-password", {
        body: { currentPassword: "adminpassword123", newPassword: "newpassword456" },
        cookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      // Old session invalidated; grab new cookie from response
      const setCookieHeader = res.headers.get("set-cookie");
      const match = setCookieHeader.match(/session=([^;]+)/);
      cookie = `session=${match[1]}`;
    });

    test("wrong current password returns 401", async () => {
      const res = await makeRequest(app, "PUT", "/api/auth/change-password", {
        body: { currentPassword: "wrongpassword", newPassword: "newpassword789" },
        cookie,
      });
      expect(res.status).toBe(401);
    });

    test("short new password returns 400", async () => {
      const res = await makeRequest(app, "PUT", "/api/auth/change-password", {
        body: { currentPassword: "newpassword456", newPassword: "short" },
        cookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("login rate limiting", () => {
    beforeAll(async () => {
      resetDatabase();
      await createTestUser({ username: "ratelimited", password: "validpassword123", role: "member" });
    });

    test("returns 429 after 5 failed login attempts", async () => {
      for (let i = 0; i < 5; i++) {
        await makeRequest(app, "POST", "/api/auth/login", {
          body: { username: "ratelimited", password: "wrongpassword" },
        });
      }
      const res = await makeRequest(app, "POST", "/api/auth/login", {
        body: { username: "ratelimited", password: "wrongpassword" },
      });
      expect(res.status).toBe(429);
    });
  });

  describe("logout cookie", () => {
    test("logout response clears session cookie", async () => {
      resetDatabase();
      const user = await createTestUser({ username: "logoutuser", password: "logoutpassword123", role: "admin" });
      const cookie = directCookie(user.id);

      const logoutRes = await makeRequest(app, "POST", "/api/auth/logout", { cookie });
      expect(logoutRes.status).toBe(200);

      const setCookieHeader = logoutRes.headers.get("set-cookie");
      expect(setCookieHeader).toContain("session=");
      expect(setCookieHeader).toContain("Max-Age=0");
    });
  });

  describe("password change session invalidation", () => {
    test("old session is invalidated after password change", async () => {
      resetDatabase();
      const user = await createTestUser({ username: "sessuser", password: "oldpassword123", role: "admin" });
      const oldCookie = directCookie(user.id);

      const changeRes = await makeRequest(app, "PUT", "/api/auth/change-password", {
        body: { currentPassword: "oldpassword123", newPassword: "newpassword456" },
        cookie: oldCookie,
      });
      expect(changeRes.status).toBe(200);

      const sessionRes = await makeRequest(app, "GET", "/api/auth/session", { cookie: oldCookie });
      expect(sessionRes.status).toBe(401);

      const newSetCookie = changeRes.headers.get("set-cookie");
      const match = newSetCookie.match(/session=([^;]+)/);
      const newCookie = `session=${match[1]}`;
      const newSessionRes = await makeRequest(app, "GET", "/api/auth/session", { cookie: newCookie });
      expect(newSessionRes.status).toBe(200);
    });
  });
});
