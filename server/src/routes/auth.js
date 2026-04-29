import { Hono } from "hono";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { dbUtils } from "../lib/db.js";
import { hashPassword, verifyPassword } from "../lib/security.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { RATE_LIMIT, AUTH } from "../lib/constants.js";
import { getClientIP } from "../lib/requestUtils.js";
import { ensureSession } from "../middleware/auth.js";

export const authRouter = new Hono();

// Validation schemas
const RegisterSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export function _resetRateLimits() {
  dbUtils.clearRateLimits();
}

function checkRateLimit(bucketKey) {
  if (process.env.DISABLE_RATE_LIMIT === "true") {
    return true;
  }
  return dbUtils.checkRateLimit(bucketKey, RATE_LIMIT.WINDOW_MS, RATE_LIMIT.MAX_ATTEMPTS);
}

// Cookie settings
const COOKIE_NAME = "session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: "/",
};

authRouter.post("/register", async (c) => {
  const ip = getClientIP(c);
  if (!checkRateLimit(`register:ip:${ip}`)) {
    return c.json(
      { error: "Too many attempts. Please try again later." },
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }

  const body = await c.req.json();
  const { username, password } = RegisterSchema.parse(body);

  if (!checkRateLimit(`register:user:${username.toLowerCase()}`)) {
    return c.json({ error: "Too many attempts for this username." }, HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  const userCount = dbUtils.getUserCount();
  if (userCount > 0) {
    return c.json({ error: AUTH.REGISTRATION_LOCK_MESSAGE }, HTTP_STATUS.FORBIDDEN);
  }

  // Check if username already exists
  const existingUser = dbUtils.getUserByUsername(username);
  if (existingUser) {
    return c.json({ error: "Registration failed" }, HTTP_STATUS.BAD_REQUEST);
  }

  const role = "admin";

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const userId = dbUtils.createUser(username, passwordHash, role);

  dbUtils.createAuditLog(userId, "register", "user", String(userId), null, ip);

  // Create session
  const { sessionId, expiresAt } = dbUtils.createSession(userId);

  // Set cookie
  setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTIONS);

  return c.json(
    {
      user: {
        id: userId,
        username,
        role,
      },
      session: {
        expiresAt,
      },
    },
    201
  );
});

authRouter.post("/login", async (c) => {
  const ip = getClientIP(c);

  const body = await c.req.json();
  const { username, password } = LoginSchema.parse(body);

  if (
    !checkRateLimit(`login:ip:${ip}`) ||
    !checkRateLimit(`login:user:${username.toLowerCase()}`)
  ) {
    return c.json(
      { error: "Too many attempts. Please try again later." },
      HTTP_STATUS.TOO_MANY_REQUESTS
    );
  }

  // Get user
  const user = dbUtils.getUserByUsername(username);
  if (!user) {
    dbUtils.createAuditLog(null, "login_failed", "user", null, `username: ${username}`, ip);
    return c.json({ error: "Invalid credentials" }, HTTP_STATUS.UNAUTHORIZED);
  }

  // Verify password
  const valid = await verifyPassword(user.password_hash, password);
  if (!valid) {
    dbUtils.createAuditLog(user.id, "login_failed", "user", String(user.id), null, ip);
    return c.json({ error: "Invalid credentials" }, HTTP_STATUS.UNAUTHORIZED);
  }

  dbUtils.createAuditLog(user.id, "login", "user", String(user.id), null, ip);

  // Create session
  const { sessionId, expiresAt } = dbUtils.createSession(user.id);

  // Set cookie
  setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTIONS);

  return c.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    session: {
      expiresAt,
    },
  });
});

authRouter.post("/logout", async (c) => {
  const sessionId = getCookie(c, COOKIE_NAME);

  if (sessionId) {
    const session = dbUtils.getSession(sessionId);
    if (session) {
      dbUtils.createAuditLog(
        session.user_id,
        "logout",
        "user",
        String(session.user_id),
        null,
        getClientIP(c)
      );
    }
    dbUtils.deleteSession(sessionId);
  }

  // Clear cookie
  deleteCookie(c, COOKIE_NAME, {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
  });

  return c.json({ success: true });
});

authRouter.get("/session", async (c) => {
  const sessionId = getCookie(c, COOKIE_NAME);

  if (!sessionId) {
    return c.json({ user: null }, HTTP_STATUS.UNAUTHORIZED);
  }

  const session = dbUtils.getSession(sessionId);

  if (!session) {
    // Session expired or invalid
    deleteCookie(c, COOKIE_NAME, {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: COOKIE_OPTIONS.path,
    });
    return c.json({ user: null }, HTTP_STATUS.UNAUTHORIZED);
  }

  return c.json({
    user: {
      id: session.user_id,
      username: session.username,
      role: session.role,
    },
    session: {
      expiresAt: session.expires_at,
    },
  });
});

authRouter.put("/change-password", ensureSession, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();
  const { currentPassword, newPassword } = z
    .object({
      currentPassword: z.string(),
      newPassword: z.string().min(8).max(100),
    })
    .parse(body);

  const dbUser = dbUtils.getUserByUsername(user.username);
  const valid = await verifyPassword(dbUser.password_hash, currentPassword);
  if (!valid) {
    return c.json({ error: "Current password is incorrect" }, HTTP_STATUS.UNAUTHORIZED);
  }

  const hash = await hashPassword(newPassword);
  dbUtils.updateUserPassword(user.id, hash);

  // Invalidate all sessions then re-create current one
  dbUtils.deleteUserSessions(user.id);
  const { sessionId, expiresAt } = dbUtils.createSession(user.id);
  setCookie(c, COOKIE_NAME, sessionId, COOKIE_OPTIONS);

  dbUtils.createAuditLog(
    user.id,
    "password_changed",
    "user",
    String(user.id),
    null,
    getClientIP(c)
  );

  return c.json({ success: true, session: { expiresAt } });
});
