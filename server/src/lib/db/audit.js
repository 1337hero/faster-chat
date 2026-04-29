export function createAuditUtils({ db }) {
  return {
    createAuditLog(userId, action, targetType, targetId, details, ipAddress) {
      const stmt = db.prepare(`
      INSERT INTO audit_log (user_id, action, target_type, target_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
      stmt.run(userId, action, targetType, targetId, details, ipAddress, Date.now());
    },

    checkRateLimit(bucketKey, windowMs, maxAttempts) {
      const now = Date.now();
      const cutoff = now - windowMs;
      return db.transaction(() => {
        db.prepare("DELETE FROM rate_limits WHERE bucket_key = ? AND created_at < ?").run(
          bucketKey,
          cutoff
        );
        const { count } = db
          .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE bucket_key = ?")
          .get(bucketKey);
        if (count >= maxAttempts) {
          return false;
        }
        db.prepare("INSERT INTO rate_limits (bucket_key, created_at) VALUES (?, ?)").run(
          bucketKey,
          now
        );
        return true;
      })();
    },

    clearRateLimits() {
      db.prepare("DELETE FROM rate_limits").run();
    },

    getAuditLogs(limit = 50, offset = 0) {
      const stmt = db.prepare(`
      SELECT al.*, u.username
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `);
      return stmt.all(limit, offset);
    },
  };
}
