export function createUserUtils({ db, DB_CONSTANTS, randomBytes }) {
  return {
    getUserByUsername(username) {
      const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
      return stmt.get(username);
    },

    getUserById(userId) {
      const stmt = db.prepare("SELECT id, username, role, created_at FROM users WHERE id = ?");
      return stmt.get(userId);
    },

    createUser(username, passwordHash, role = "member", createdBy = null) {
      const stmt = db.prepare(
        "INSERT INTO users (username, password_hash, role, created_at, created_by) VALUES (?, ?, ?, ?, ?)"
      );
      const result = stmt.run(username, passwordHash, role, Date.now(), createdBy);
      return result.lastInsertRowid;
    },

    getUserCount() {
      const stmt = db.prepare("SELECT COUNT(*) as count FROM users");
      const result = stmt.get();
      return result.count;
    },

    createSession(userId, expiresInMs = DB_CONSTANTS.DEFAULT_SESSION_EXPIRY_MS) {
      const sessionId = randomBytes(DB_CONSTANTS.SESSION_ID_BYTES).toString("hex");
      const expiresAt = Date.now() + expiresInMs;

      const stmt = db.prepare(
        "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
      );
      stmt.run(sessionId, userId, expiresAt, Date.now());

      return { sessionId, expiresAt };
    },

    getSession(sessionId) {
      const stmt = db.prepare(`
      SELECT
        s.id as session_id,
        s.user_id,
        s.expires_at,
        u.username,
        u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > ?
    `);
      return stmt.get(sessionId, Date.now());
    },

    deleteSession(sessionId) {
      const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
      stmt.run(sessionId);
    },

    deleteUserSessions(userId) {
      const stmt = db.prepare("DELETE FROM sessions WHERE user_id = ?");
      stmt.run(userId);
    },

    cleanExpiredSessions() {
      const stmt = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");
      const result = stmt.run(Date.now());
      return result.changes;
    },

    getAllUsers() {
      const stmt = db.prepare(
        "SELECT id, username, role, created_at FROM users ORDER BY created_at DESC"
      );
      return stmt.all();
    },

    updateUserRole(userId, role) {
      const stmt = db.prepare("UPDATE users SET role = ? WHERE id = ?");
      stmt.run(role, userId);
    },

    updateUserPassword(userId, passwordHash) {
      const stmt = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
      stmt.run(passwordHash, userId);
    },

    deleteUser(userId) {
      const stmt = db.prepare("DELETE FROM users WHERE id = ?");
      stmt.run(userId);
    },
  };
}
