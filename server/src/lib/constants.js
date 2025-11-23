/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_ATTEMPTS: 5,
};

/**
 * Authentication configuration
 */
export const AUTH = {
  TRUST_PROXY: process.env.TRUST_PROXY === "true",
  REGISTRATION_LOCK_MESSAGE: "Registration disabled. Ask an administrator to create an account.",
};
