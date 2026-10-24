import { randomBytes } from "crypto";

export function createInviteUtils({ db }) {
  return {
    createInvite(createdBy, expiresInMs) {
      const token = randomBytes(24).toString("base64url");
      const now = Date.now();
      const expiresAt = now + expiresInMs;
      const result = db
        .prepare(
          "INSERT INTO invites (token, created_by, created_at, expires_at) VALUES (?, ?, ?, ?)"
        )
        .run(token, createdBy, now, expiresAt);
      return { id: result.lastInsertRowid, token, expiresAt };
    },

    getInviteByToken(token) {
      return db.prepare("SELECT * FROM invites WHERE token = ?").get(token);
    },

    getInviteById(id) {
      return db.prepare("SELECT * FROM invites WHERE id = ?").get(id);
    },

    getValidInvite(token) {
      const invite = this.getInviteByToken(token);
      if (!invite || invite.used_at || invite.revoked_at || invite.expires_at <= Date.now()) {
        return null;
      }
      return invite;
    },

    listInvites() {
      return db
        .prepare(
          `SELECT i.id, i.token, i.created_at, i.expires_at, i.used_at, i.revoked_at,
                  c.username AS created_by_username, u.username AS used_by_username
           FROM invites i
           LEFT JOIN users c ON c.id = i.created_by
           LEFT JOIN users u ON u.id = i.used_by
           ORDER BY i.created_at DESC`
        )
        .all();
    },

    markInviteUsed(id, userId) {
      db.prepare("UPDATE invites SET used_at = ?, used_by = ? WHERE id = ?").run(
        Date.now(),
        userId,
        id
      );
    },

    revokeInvite(id) {
      db.prepare("UPDATE invites SET revoked_at = ? WHERE id = ?").run(Date.now(), id);
    },
  };
}
