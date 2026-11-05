export const migration = {
  id: 7,
  up(database) {
    database.exec("ALTER TABLE users ADD COLUMN last_active INTEGER");
  },
};
