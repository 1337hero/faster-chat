import { getCookie } from "hono/cookie";
import { dbUtils } from "../lib/db.js";

const COOKIE_NAME = "session";

/**
 * Middleware to ensure a valid session exists
 * Attaches user info to context: c.get('user')
 */
export async function ensureSession(c, next) {
  const sessionId = getCookie(c, COOKIE_NAME);

  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = dbUtils.getSession(sessionId);

  if (!session) {
    return c.json({ error: "Session expired" }, 401);
  }

  // Attach user info to context
  c.set("user", {
    id: session.user_id,
    username: session.username,
    role: session.role,
  });

  await next();
}

/**
 * Middleware to require a specific role
 * Must be used after ensureSession
 * @param {...string} allowedRoles - Roles that are allowed to access this route
 */
export function requireRole(...allowedRoles) {
  return async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: "Forbidden: insufficient permissions" }, 403);
    }

    await next();
  };
}

/**
 * Optional auth middleware - doesn't fail if no session, just sets user to null
 * Useful for routes that work both authenticated and unauthenticated
 */
export async function optionalAuth(c, next) {
  const sessionId = getCookie(c, COOKIE_NAME);

  if (sessionId) {
    const session = dbUtils.getSession(sessionId);

    if (session) {
      c.set("user", {
        id: session.user_id,
        username: session.username,
        role: session.role,
      });
    }
  }

  // Set user to null if not authenticated
  if (!c.get("user")) {
    c.set("user", null);
  }

  await next();
}
