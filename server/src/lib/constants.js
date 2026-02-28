/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_ATTEMPTS: 5,
};

/**
 * Per-endpoint rate limits for expensive operations
 */
export const ENDPOINT_RATE_LIMITS = {
  COMPLETION: { windowMs: 60 * 1000, maxRequests: 20 },      // 20/min per user
  IMAGE_GEN: { windowMs: 60 * 1000, maxRequests: 5 },        // 5/min per user
  FILE_UPLOAD: { windowMs: 60 * 1000, maxRequests: 10 },     // 10/min per user
  OLLAMA_PULL: { windowMs: 5 * 60 * 1000, maxRequests: 3 },  // 3/5min per user
};

/**
 * Authentication configuration
 */
export const AUTH = {
  TRUST_PROXY: process.env.TRUST_PROXY === "true",
  REGISTRATION_LOCK_MESSAGE: "Registration disabled. Ask an administrator to create an account.",
};
