import { describe, test, expect, beforeAll } from "bun:test";
import { createTestApp, resetDatabase, seedAdminUser } from "./helpers.js";

describe("test infrastructure", () => {
  let app;

  beforeAll(() => {
    resetDatabase();
    app = createTestApp();
  });

  test("app responds to routes", async () => {
    const res = await app.request("/api/auth/session");
    expect(res.status).toBe(401);
  });

  test("can register first user as admin", async () => {
    const { user, cookie } = await seedAdminUser(app);
    expect(user.role).toBe("admin");
    expect(cookie).toBeTruthy();
  });
});
