export const migration = {
  id: 9,
  up(database) {
    database.exec(`ALTER TABLE model_metadata ADD COLUMN supports_image_to_image INTEGER`);
  },
};
