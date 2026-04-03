/**
 * Reusable per-user in-memory rate limiter factory
 * @param {{ windowMs: number, maxRequests: number, keyFn?: (c: any) => string }} options
 * @returns Hono middleware
 */
export function createRateLimiter({ windowMs, maxRequests, keyFn }) {
  const store = new Map();
  const resolveKey = keyFn || ((c) => c.get("user")?.id?.toString() || "anon");

  // Cleanup: evict stale entries every 5 minutes
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, timestamps] of store.entries()) {
        const fresh = timestamps.filter((t) => now - t < windowMs);
        if (fresh.length === 0) {
          store.delete(key);
        } else {
          store.set(key, fresh);
        }
      }
    },
    5 * 60 * 1000
  );

  return async (c, next) => {
    const key = resolveKey(c);
    const now = Date.now();
    const timestamps = store.get(key) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= maxRequests) {
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }

    recent.push(now);
    store.set(key, recent);
    await next();
  };
}
