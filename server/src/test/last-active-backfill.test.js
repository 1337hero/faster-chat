import { describe, test, expect, beforeAll } from "bun:test";
import db, { dbUtils } from "../lib/db.js";
import { resetDatabase } from "./helpers.js";
import { backfillLastActive } from "../lib/db/migrations/007_add_last_active.js";

function insertLogin(userId, createdAt) {
  db.exec(
    `INSERT INTO audit_log (user_id, action, target_type, target_id, created_at)
     VALUES (?, 'login', 'user', ?, ?)`,
    [userId, String(userId), createdAt]
  );
}

function lastActive(userId) {
  return db.prepare("SELECT last_active FROM users WHERE id = ?").get(userId).last_active;
}

describe("last_active backfill", () => {
  beforeAll(() => {
    resetDatabase();
  });

  test("sets last_active from the login audit entry", () => {
    const userId = dbUtils.createUser("backfillone", "x", "member");
    insertLogin(userId, 1700000000000);
    backfillLastActive(db);
    expect(lastActive(userId)).toBe(1700000000000);
  });

  test("uses the most recent of multiple login entries", () => {
    const userId = dbUtils.createUser("backfillmulti", "x", "member");
    insertLogin(userId, 1000);
    insertLogin(userId, 2000);
    backfillLastActive(db);
    expect(lastActive(userId)).toBe(2000);
  });

  test("leaves last_active null when the user has no login entry", () => {
    const userId = dbUtils.createUser("backfillnone", "x", "member");
    backfillLastActive(db);
    expect(lastActive(userId)).toBeNull();
  });

  test("ignores non-login audit actions", () => {
    const userId = dbUtils.createUser("backfillnonlogin", "x", "member");
    db.exec(
      `INSERT INTO audit_log (user_id, action, target_type, target_id, created_at)
       VALUES (?, 'password_changed', 'user', ?, ?)`,
      [userId, String(userId), 5000]
    );
    backfillLastActive(db);
    expect(lastActive(userId)).toBeNull();
  });

  test("does not overwrite an existing last_active", () => {
    const userId = dbUtils.createUser("backfillext", "x", "member");
    dbUtils.updateLastActive(userId);
    const existing = lastActive(userId);
    insertLogin(userId, 1);
    backfillLastActive(db);
    expect(lastActive(userId)).toBe(existing);
  });
});
