#!/usr/bin/env bun
import { Database } from "bun:sqlite";
import path from "path";
import { hashPassword } from "../server/src/lib/security.js";

const [, , usernameArg, passwordArg] = process.argv;
if (!usernameArg || !passwordArg) {
  console.error("Usage: bun scripts/reset-admin-password.js <username> <new-password>");
  process.exit(1);
}

const dbPath =
  process.env.DATABASE_URL?.replace("sqlite://", "") ||
  path.join(import.meta.dir, "..", "server", "data", "chat.db");

console.log("Using DB:", dbPath);

const db = new Database(dbPath);
const user = db.prepare("SELECT id, username, role FROM users WHERE username = ?").get(usernameArg);
if (!user) {
  console.error(`User "${usernameArg}" not found.`);
  console.error(
    "Existing users:",
    db.prepare("SELECT username, role FROM users").all()
  );
  process.exit(1);
}

const passwordHash = await hashPassword(passwordArg);

db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, user.id);
db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);

console.log(`Password reset for ${user.username} (${user.role}). All sessions cleared.`);
