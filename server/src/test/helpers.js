import { Hono } from "hono";
import db, { dbUtils } from "../lib/db.js";
import { hashPassword } from "../lib/security.js";
import { authRouter, _resetRateLimits } from "../routes/auth.js";
import { chatsRouter } from "../routes/chats.js";
import { adminRouter } from "../routes/admin.js";
import { providersRouter } from "../routes/providers.js";
import { filesRouter } from "../routes/files.js";
import { foldersRouter } from "../routes/folders.js";
import { settingsRouter } from "../routes/settings.js";
import { modelsRouter } from "../routes/models.js";
import { importRouter } from "../routes/import.js";
import { versionRouter } from "../routes/version.js";

export function createTestApp() {
  const app = new Hono();

  app.route("/api/auth", authRouter);
  app.route("/api/admin", adminRouter);
  app.route("/api/admin/providers", providersRouter);
  app.route("/api", modelsRouter);
  app.route("/api/files", filesRouter);
  app.route("/api/chats", chatsRouter);
  app.route("/api/settings", settingsRouter);
  app.route("/api/import", importRouter);
  app.route("/api/folders", foldersRouter);
  app.route("/api/version", versionRouter);

  return app;
}

export function resetDatabase() {
  _resetRateLimits();
  db.exec("DELETE FROM audit_log");
  db.exec("DELETE FROM model_metadata");
  db.exec("DELETE FROM messages");
  db.exec("DELETE FROM files");
  db.exec("DELETE FROM chats");
  db.exec("DELETE FROM folders");
  db.exec("DELETE FROM sessions");
  db.exec("DELETE FROM models");
  db.exec("DELETE FROM providers");
  db.exec("DELETE FROM settings");
  db.exec("DELETE FROM users");
}

export async function createTestUser({
  username = "testuser",
  password = "testpassword123",
  role = "member",
} = {}) {
  const passwordHash = await hashPassword(password);
  const userId = dbUtils.createUser(username, passwordHash, role);
  return { id: userId, username, password, role };
}

export async function getAuthCookie(app, { username, password }) {
  const res = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/session=([^;]+)/);
  return match ? `session=${match[1]}` : null;
}

export async function seedAdminUser(app) {
  const res = await app.request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "adminpassword123" }),
  });

  const body = await res.json();
  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/session=([^;]+)/);
  const cookie = match ? `session=${match[1]}` : null;

  return { user: body.user, cookie };
}

export async function seedMemberUser(app, adminCookie) {
  const res = await app.request("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({ username: "member", password: "memberpassword123", role: "member" }),
  });

  const body = await res.json();
  const cookie = await getAuthCookie(app, { username: "member", password: "memberpassword123" });

  return { user: body.user, cookie };
}

export function makeRequest(app, method, path, { body, cookie, headers = {} } = {}) {
  const opts = { method, headers: { ...headers } };
  if (body) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  if (cookie) {
    opts.headers.Cookie = cookie;
  }
  return app.request(path, opts);
}
