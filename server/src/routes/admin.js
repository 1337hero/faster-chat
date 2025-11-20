import { Hono } from "hono";
import { z } from "zod";
import { hash } from "@node-rs/argon2";
import { dbUtils } from "../lib/db.js";
import { ensureSession, requireRole } from "../middleware/auth.js";

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

/**
 * GET /api/admin/users
 * List all users
 */
adminRouter.get("/users", async (c) => {
  try {
    const users = dbUtils.getAllUsers();
    return c.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return c.json({ error: "Failed to list users" }, 500);
  }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
adminRouter.post("/users", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { username, password, role } = CreateUserSchema.parse(body);

    // Check if username already exists
    const existingUser = dbUtils.getUserByUsername(username);
    if (existingUser) {
      return c.json({ error: "Username already exists" }, 400);
    }

    // Hash password
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Create user
    const userId = dbUtils.createUser(username, passwordHash, role, currentUser.id);

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Create user error:", error);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
adminRouter.put("/users/:id/role", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"), 10);
    const currentUser = c.get("user");

    // Prevent self-demotion
    if (userId === currentUser.id) {
      return c.json({ error: "Cannot change your own role" }, 400);
    }

    const body = await c.req.json();
    const { role } = UpdateRoleSchema.parse(body);

    // Check if user exists
    const user = dbUtils.getUserById(userId);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Update role
    dbUtils.updateUserRole(userId, role);

    // Invalidate all sessions for this user (force re-login to get new role)
    dbUtils.deleteUserSessions(userId);

    return c.json({
      user: {
        id: userId,
        username: user.username,
        role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Update role error:", error);
    return c.json({ error: "Failed to update role" }, 500);
  }
});

/**
 * PUT /api/admin/users/:id/password
 * Reset user password
 */
adminRouter.put("/users/:id/password", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"), 10);
    const body = await c.req.json();
    const { password } = ResetPasswordSchema.parse(body);

    // Check if user exists
    const user = dbUtils.getUserById(userId);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Hash new password
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Update password
    dbUtils.updateUserPassword(userId, passwordHash);

    // Invalidate all sessions for this user (force re-login)
    dbUtils.deleteUserSessions(userId);

    return c.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Reset password error:", error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user
 */
adminRouter.delete("/users/:id", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"), 10);
    const currentUser = c.get("user");

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return c.json({ error: "Cannot delete your own account" }, 400);
    }

    // Check if user exists
    const user = dbUtils.getUserById(userId);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Delete user (sessions will cascade delete)
    dbUtils.deleteUser(userId);

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return c.json({ error: "Failed to delete user" }, 500);
  }
});
