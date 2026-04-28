export function createProviderUtils({ db, buildUpdateFields }) {
  return {
    createProvider(name, displayName, providerType, baseUrl, encryptedKey, iv, authTag) {
      const now = Date.now();
      const stmt = db.prepare(`
      INSERT INTO providers (name, display_name, provider_type, base_url, encrypted_key, iv, auth_tag, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
      const result = stmt.run(
        name,
        displayName,
        providerType,
        baseUrl,
        encryptedKey,
        iv,
        authTag,
        now,
        now
      );
      return result.lastInsertRowid;
    },

    getProviderById(providerId) {
      const stmt = db.prepare("SELECT * FROM providers WHERE id = ?");
      return stmt.get(providerId);
    },

    getProviderByName(name) {
      const stmt = db.prepare("SELECT * FROM providers WHERE name = ?");
      return stmt.get(name);
    },

    getAllProviders() {
      const stmt = db.prepare("SELECT * FROM providers ORDER BY created_at ASC");
      return stmt.all();
    },

    getEnabledProviders() {
      const stmt = db.prepare("SELECT * FROM providers WHERE enabled = 1 ORDER BY created_at ASC");
      return stmt.all();
    },

    updateProvider(providerId, updates) {
      const fieldMap = {
        displayName: "display_name",
        baseUrl: "base_url",
        encryptedKey: "encrypted_key",
        iv: "iv",
        authTag: "auth_tag",
        enabled: "enabled",
      };

      const { fields, values } = buildUpdateFields(updates, fieldMap, {
        enabled: (value) => (value ? 1 : 0),
      });

      if (fields.length === 0) {
        return;
      }

      fields.push("updated_at = ?");
      values.push(Date.now());
      values.push(providerId);

      const stmt = db.prepare(`UPDATE providers SET ${fields.join(", ")} WHERE id = ?`);
      stmt.run(...values);
    },

    deleteProvider(providerId) {
      const stmt = db.prepare("DELETE FROM providers WHERE id = ?");
      stmt.run(providerId);
    },
  };
}
