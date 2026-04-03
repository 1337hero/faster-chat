import { describe, test, expect, beforeAll } from "bun:test";
import {
  createTestApp,
  resetDatabase,
  seedAdminUser,
  seedMemberUser,
  makeRequest,
} from "./helpers.js";

describe("admin routes", () => {
  let app, adminCookie, memberCookie, adminUser, memberUser;

  beforeAll(async () => {
    resetDatabase();
    app = createTestApp();
    const admin = await seedAdminUser(app);
    adminCookie = admin.cookie;
    adminUser = admin.user;
    const member = await seedMemberUser(app, adminCookie);
    memberCookie = member.cookie;
    memberUser = member.user;
  });

  describe("access control", () => {
    test("GET /api/admin/users returns 401 without session", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/users");
      expect(res.status).toBe(401);
    });

    test("GET /api/admin/users returns 403 for member", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/users", { cookie: memberCookie });
      expect(res.status).toBe(403);
    });

    test("POST /api/admin/users returns 401 without session", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/users", {
        body: { username: "x", password: "x", role: "member" },
      });
      expect(res.status).toBe(401);
    });

    test("POST /api/admin/users returns 403 for member", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/users", {
        body: { username: "x", password: "x", role: "member" },
        cookie: memberCookie,
      });
      expect(res.status).toBe(403);
    });

    test("GET /api/admin/audit-log returns 401 without session", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/audit-log");
      expect(res.status).toBe(401);
    });

    test("GET /api/admin/audit-log returns 403 for member", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/audit-log", { cookie: memberCookie });
      expect(res.status).toBe(403);
    });

    test("DELETE /api/admin/chats/purge returns 401 without session", async () => {
      const res = await makeRequest(app, "DELETE", "/api/admin/chats/purge");
      expect(res.status).toBe(401);
    });

    test("DELETE /api/admin/chats/purge returns 403 for member", async () => {
      const res = await makeRequest(app, "DELETE", "/api/admin/chats/purge", {
        cookie: memberCookie,
      });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/admin/users", () => {
    test("returns all users for admin", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/users", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.users.length).toBeGreaterThanOrEqual(2);
      const usernames = data.users.map((u) => u.username);
      expect(usernames).toContain("admin");
      expect(usernames).toContain("member");
    });
  });

  describe("POST /api/admin/users", () => {
    test("creates new user with specified role", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/users", {
        body: { username: "newuser", password: "newpassword123", role: "member" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.username).toBe("newuser");
      expect(data.user.role).toBe("member");
      expect(data.user.id).toBeDefined();
    });

    test("duplicate username returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/users", {
        body: { username: "member", password: "anotherpassword123", role: "member" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("already exists");
    });

    test("invalid role returns 400", async () => {
      const res = await makeRequest(app, "POST", "/api/admin/users", {
        body: { username: "badrole", password: "password12345", role: "superadmin" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/admin/users/:id/role", () => {
    test("changes user role", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/users/${memberUser.id}/role`, {
        body: { role: "readonly" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.role).toBe("readonly");
      expect(data.user.id).toBe(memberUser.id);
    });

    test("prevents self-demotion", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/users/${adminUser.id}/role`, {
        body: { role: "member" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("own role");
    });

    test("non-existent user returns 404", async () => {
      const res = await makeRequest(app, "PUT", "/api/admin/users/99999/role", {
        body: { role: "member" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });

    test("invalid role returns 400", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/users/${memberUser.id}/role`, {
        body: { role: "godmode" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/admin/users/:id/password", () => {
    test("resets password (admin only)", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/users/${memberUser.id}/password`, {
        body: { password: "resetpassword123" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("non-existent user returns 404", async () => {
      const res = await makeRequest(app, "PUT", "/api/admin/users/99999/password", {
        body: { password: "resetpassword123" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });

    test("short password returns 400", async () => {
      const res = await makeRequest(app, "PUT", `/api/admin/users/${memberUser.id}/password`, {
        body: { password: "short" },
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/admin/users/:id", () => {
    let expendableUserId;

    beforeAll(async () => {
      const res = await makeRequest(app, "POST", "/api/admin/users", {
        body: { username: "expendable", password: "expendable123", role: "member" },
        cookie: adminCookie,
      });
      const data = await res.json();
      expendableUserId = data.user.id;
    });

    test("deletes user", async () => {
      const res = await makeRequest(app, "DELETE", `/api/admin/users/${expendableUserId}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test("prevents self-deletion", async () => {
      const res = await makeRequest(app, "DELETE", `/api/admin/users/${adminUser.id}`, {
        cookie: adminCookie,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("own account");
    });

    test("non-existent user returns 404", async () => {
      const res = await makeRequest(app, "DELETE", "/api/admin/users/99999", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/admin/audit-log", () => {
    test("returns audit entries array", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/audit-log", { cookie: adminCookie });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.logs)).toBe(true);
      expect(data.logs.length).toBeGreaterThan(0);
    });

    test("contains user_created entries from seeded users", async () => {
      const res = await makeRequest(app, "GET", "/api/admin/audit-log", { cookie: adminCookie });
      const data = await res.json();
      const actions = data.logs.map((l) => l.action);
      expect(actions).toContain("user_created");
    });
  });

  describe("DELETE /api/admin/chats/purge", () => {
    test("returns purge count", async () => {
      const res = await makeRequest(app, "DELETE", "/api/admin/chats/purge?days=30", {
        cookie: adminCookie,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(typeof data.purged).toBe("number");
    });
  });
});
