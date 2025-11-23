import { Hono } from "hono";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { dbUtils } from "../lib/db.js";
import { hashPassword, verifyPassword } from "../lib/security.js";
import { HTTP_STATUS } from "../lib/httpStatus.js";
import { RATE_LIMIT, AUTH } from "../lib/constants.js";

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

// Simple in-memory rate limiting (per key)
const loginAttempts = new Map();

function checkRateLimit(bucketKey) {
  const now = Date.now();
  const attempts = loginAttempts.get(bucketKey) || [];

  // Clean old attempts
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < RATE_LIMIT.WINDOW_MS);

  if (recentAttempts.length >= RATE_LIMIT.MAX_ATTEMPTS) {
    return false;
  }

  recentAttempts.push(now);
  loginAttempts.set(bucketKey, recentAttempts);
  return true;
}

// Helper to get client IP
function getClientIP(c) {
  if (AUTH.TRUST_PROXY) {
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    const real = c.req.header("x-real-ip");
    if (real) {
      return real;
    }
  }

  const incoming = c.env?.incoming;
  const socket =
    incoming?.socket || incoming?.connection || incoming?.req?.socket || incoming?.req?.connection;

  return socket?.remoteAddress || "local";
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

/**
 * POST /api/auth/register
 * Register a new user. First user becomes admin.
 */
authRouter.post("/register", async (c) => {
  try {
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
      return c.json(
        { error: "Too many attempts for this username." },
        HTTP_STATUS.TOO_MANY_REQUESTS
      );
    }

    const userCount = dbUtils.getUserCount();
    if (userCount > 0) {
      return c.json({ error: AUTH.REGISTRATION_LOCK_MESSAGE }, HTTP_STATUS.FORBIDDEN);
    }

    // Check if username already exists
    const existingUser = dbUtils.getUserByUsername(username);
    if (existingUser) {
      return c.json({ error: "Username already exists" }, HTTP_STATUS.BAD_REQUEST);
    }

    const role = "admin";

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = dbUtils.createUser(username, passwordHash, role);

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
    console.error("Register error:", error);
    return c.json({ error: "Registration failed" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
authRouter.post("/login", async (c) => {
  try {
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
      return c.json({ error: "Invalid credentials" }, HTTP_STATUS.UNAUTHORIZED);
    }

    // Verify password
    const valid = await verifyPassword(user.password_hash, password);
    if (!valid) {
      return c.json({ error: "Invalid credentials" }, HTTP_STATUS.UNAUTHORIZED);
    }

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid input", details: error.errors }, HTTP_STATUS.BAD_REQUEST);
    }
    console.error("Login error:", error);
    return c.json({ error: "Login failed" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * POST /api/auth/logout
 * Logout and clear session
 */
authRouter.post("/logout", async (c) => {
  try {
    const sessionId = getCookie(c, COOKIE_NAME);

    if (sessionId) {
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
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ error: "Logout failed" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

/**
 * GET /api/auth/session
 * Get current session info
 */
authRouter.get("/session", async (c) => {
  try {
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
  } catch (error) {
    console.error("Session check error:", error);
    return c.json({ error: "Session check failed" }, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});
