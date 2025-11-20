import { Hono } from "hono";
import { z } from "zod";
import { hash, verify } from "@node-rs/argon2";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { dbUtils } from "../lib/db.js";

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

// Simple in-memory rate limiting (per IP)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];

  // Clean old attempts
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return false;
  }

  recentAttempts.push(now);
  loginAttempts.set(ip, recentAttempts);
  return true;
}

// Helper to get client IP
function getClientIP(c) {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0].trim() || c.req.header("x-real-ip") || "unknown"
  );
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
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Too many attempts. Please try again later." }, 429);
    }

    const body = await c.req.json();
    const { username, password } = RegisterSchema.parse(body);

    // Check if username already exists
    const existingUser = dbUtils.getUserByUsername(username);
    if (existingUser) {
      return c.json({ error: "Username already exists" }, 400);
    }

    // Check if this is the first user
    const userCount = dbUtils.getUserCount();
    const role = userCount === 0 ? "admin" : "member";

    // Hash password
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

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
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Register error:", error);
    return c.json({ error: "Registration failed" }, 500);
  }
});

/**
 * POST /api/auth/login
 * Login with username and password
 */
authRouter.post("/login", async (c) => {
  try {
    const ip = getClientIP(c);
    if (!checkRateLimit(ip)) {
      return c.json({ error: "Too many attempts. Please try again later." }, 429);
    }

    const body = await c.req.json();
    const { username, password } = LoginSchema.parse(body);

    // Get user
    const user = dbUtils.getUserByUsername(username);
    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Verify password
    const valid = await verify(user.password_hash, password);
    if (!valid) {
      return c.json({ error: "Invalid credentials" }, 401);
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
      return c.json({ error: "Invalid input", details: error.errors }, 400);
    }
    console.error("Login error:", error);
    return c.json({ error: "Login failed" }, 500);
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
    return c.json({ error: "Logout failed" }, 500);
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
      return c.json({ user: null }, 401);
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
      return c.json({ user: null }, 401);
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
    return c.json({ error: "Session check failed" }, 500);
  }
});
