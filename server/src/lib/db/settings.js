export function createSettingUtils({ db, encryptApiKey, decryptApiKey }) {
  return {
    getSetting(key) {
      const stmt = db.prepare("SELECT value FROM settings WHERE key = ?");
      const result = stmt.get(key);
      return result ? result.value : null;
    },

    getAllSettings() {
      const stmt = db.prepare("SELECT key, value FROM settings");
      const rows = stmt.all();
      const settings = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      return settings;
    },

    setSetting(key, value) {
      const now = Date.now();
      const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
      stmt.run(key, value, now);
    },

    setSettings(settings) {
      const now = Date.now();
      const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, value, now);
      }
    },

    deleteSetting(key) {
      const stmt = db.prepare("DELETE FROM settings WHERE key = ?");
      const result = stmt.run(key);
      return result.changes > 0;
    },

    getWebSearchApiKey() {
      const encryptedKey = this.getSetting("web_search_api_key");
      const iv = this.getSetting("web_search_api_key_iv");
      const authTag = this.getSetting("web_search_api_key_auth_tag");

      if (!encryptedKey || !iv || !authTag) {
        return null;
      }
      try {
        return decryptApiKey(encryptedKey, iv, authTag);
      } catch {
        return null;
      }
    },

    setWebSearchApiKey(apiKey) {
      if (apiKey) {
        const { encryptedKey, iv, authTag } = encryptApiKey(apiKey);
        this.setSetting("web_search_api_key", encryptedKey);
        this.setSetting("web_search_api_key_iv", iv);
        this.setSetting("web_search_api_key_auth_tag", authTag);
      } else {
        this.deleteSetting("web_search_api_key");
        this.deleteSetting("web_search_api_key_iv");
        this.deleteSetting("web_search_api_key_auth_tag");
      }
    },
  };
}
