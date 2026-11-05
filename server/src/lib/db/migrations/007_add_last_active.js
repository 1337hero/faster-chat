export function backfillLastActive(database) {
  database.exec(`
    UPDATE users
    SET last_active = (
      SELECT MAX(a.created_at)
      FROM audit_log a
      WHERE a.user_id = users.id AND a.action = 'login'
    )
    WHERE last_active IS NULL
      AND EXISTS (
        SELECT 1 FROM audit_log a
        WHERE a.user_id = users.id AND a.action = 'login'
      )
  `);
}

export const migration = {
  id: 7,
  up(database) {
    database.exec("ALTER TABLE users ADD COLUMN last_active INTEGER");
    backfillLastActive(database);
  },
};
