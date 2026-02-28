import { AUTH } from "./constants.js";

/**
 * Extract client IP from request, respecting proxy headers when configured
 */
export function getClientIP(c) {
  if (AUTH.TRUST_PROXY) {
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    const real = c.req.header("x-real-ip");
    if (real) return real;
  }

  const incoming = c.env?.incoming;
  const socket =
    incoming?.socket || incoming?.connection || incoming?.req?.socket || incoming?.req?.connection;

  return socket?.remoteAddress || "local";
}
