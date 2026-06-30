import { Hono } from "hono";
import { z } from "zod";
import { dbUtils } from "../lib/db.js";
import { ensureSession, requireRole } from "../middleware/auth.js";
import { hashPassword } from "../lib/security.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { getClientIP } from "../lib/requestUtils.js";

export const adminRouter = new Hono();

// All admin routes require admin role
adminRouter.use("*", ensureSession, requireRole("admin"));

// Validation schemas
const CreateUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "member", "readonly"]).default("member"),
});

const UpdateRoleSchema = z.object({
  role: z.enum(["admin", "member", "readonly"]),
});

const ResetPasswordSchema = z.object({
  password: z.string().min(8).max(100),
});

adminRouter.get("/users", async (c) => {
  const users = dbUtils.getAllUsers();
  return c.json({ users });
});

adminRouter.post("/users", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json();
  const { username, password, role } = CreateUserSchema.parse(body);

  // Check if username already exists
  const existingUser = dbUtils.getUserByUsername(username);
  if (existingUser) {
    return c.json({ error: "Username already exists" }, HTTP_STATUS.BAD_REQUEST);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = dbUtils.createUser(username, passwordHash, role, currentUser.id);

  dbUtils.createAuditLog(
    currentUser.id,
    "user_created",
    "user",
    String(userId),
    username,
    getClientIP(c)
  );

  return c.json(
    {
      user: {
        id: userId,
        username,
        role,
      },
    },
    201
  );
});

adminRouter.put("/users/:id/role", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  const currentUser = c.get("user");

  // Prevent self-demotion
  if (userId === currentUser.id) {
    return c.json({ error: "Cannot change your own role" }, HTTP_STATUS.BAD_REQUEST);
  }

  const body = await c.req.json();
  const { role } = UpdateRoleSchema.parse(body);

  // Check if user exists
  const user = dbUtils.getUserById(userId);
  if (!user) {
    return c.json({ error: "User not found" }, HTTP_STATUS.NOT_FOUND);
  }

  // Update role
  dbUtils.updateUserRole(userId, role);

  // Invalidate all sessions for this user (force re-login to get new role)
  dbUtils.deleteUserSessions(userId);

  dbUtils.createAuditLog(
    currentUser.id,
    "role_changed",
    "user",
    String(userId),
    `${user.username} → ${role}`,
    getClientIP(c)
  );

  return c.json({
    user: {
      id: userId,
      username: user.username,
      role,
    },
  });
});

adminRouter.put("/users/:id/password", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  const currentUser = c.get("user");
  const body = await c.req.json();
  const { password } = ResetPasswordSchema.parse(body);

  // Check if user exists
  const user = dbUtils.getUserById(userId);
  if (!user) {
    return c.json({ error: "User not found" }, HTTP_STATUS.NOT_FOUND);
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update password
  dbUtils.updateUserPassword(userId, passwordHash);

  // Invalidate all sessions for this user (force re-login)
  dbUtils.deleteUserSessions(userId);

  dbUtils.createAuditLog(
    currentUser.id,
    "password_reset",
    "user",
    String(userId),
    user.username,
    getClientIP(c)
  );

  return c.json({ success: true });
});

adminRouter.delete("/users/:id", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  const currentUser = c.get("user");

  // Prevent self-deletion
  if (userId === currentUser.id) {
    return c.json({ error: "Cannot delete your own account" }, HTTP_STATUS.BAD_REQUEST);
  }

  // Check if user exists
  const user = dbUtils.getUserById(userId);
  if (!user) {
    return c.json({ error: "User not found" }, HTTP_STATUS.NOT_FOUND);
  }

  // Delete user (sessions will cascade delete)
  dbUtils.deleteUser(userId);

  dbUtils.createAuditLog(
    currentUser.id,
    "user_deleted",
    "user",
    String(userId),
    user.username,
    getClientIP(c)
  );

  return c.json({ success: true });
});

adminRouter.get("/audit-log", async (c) => {
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 200);
  const offset = parseInt(c.req.query("offset") || "0", 10);
  const logs = dbUtils.getAuditLogs(limit, offset);
  return c.json({ logs, limit, offset });
});

adminRouter.delete("/chats/purge", async (c) => {
  const daysParam = c.req.query("days") || "30";
  const olderThanDays = Number(daysParam);
  if (!Number.isInteger(olderThanDays) || olderThanDays < 1 || olderThanDays > 3650) {
    return c.json({ error: "days must be an integer between 1 and 3650" }, HTTP_STATUS.BAD_REQUEST);
  }

  const purged = dbUtils.purgeSoftDeletedChats(olderThanDays * 24 * 60 * 60 * 1000);
  dbUtils.createAuditLog(
    c.get("user").id,
    "chats_purged",
    "chat",
    null,
    `days: ${olderThanDays}, purged: ${purged}`,
    getClientIP(c)
  );
  return c.json({ purged });
});
