export function createModelUtils({ db, buildUpdateFields }) {
  return {
    createModel(providerId, modelId, displayName, enabled = true, modelType = "text") {
      const now = Date.now();
      const stmt = db.prepare(`
      INSERT INTO models (provider_id, model_id, display_name, enabled, model_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
      const result = stmt.run(
        providerId,
        modelId,
        displayName,
        enabled ? 1 : 0,
        modelType,
        now,
        now
      );
      return result.lastInsertRowid;
    },

    getModelById(modelId) {
      const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.id = ?
    `);
      return stmt.get(modelId);
    },

    getAllModels() {
      const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      ORDER BY p.name ASC, m.display_name ASC
    `);
      return stmt.all();
    },

    getModelsByType(modelType) {
      if (!modelType) {
        return this.getAllModels();
      }

      const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.model_type = ?
      ORDER BY p.name ASC, m.display_name ASC
    `);
      return stmt.all(modelType);
    },

    getEnabledModels() {
      const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.enabled = 1 AND p.enabled = 1
      ORDER BY p.name ASC, m.display_name ASC
    `);
      return stmt.all();
    },

    getEnabledModelsByType(modelType) {
      if (!modelType) {
        return this.getEnabledModels();
      }

      const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name, p.display_name as provider_display_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.enabled = 1 AND p.enabled = 1 AND m.model_type = ?
      ORDER BY p.name ASC, m.display_name ASC
    `);
      return stmt.all(modelType);
    },

    getEnabledModelWithProvider(modelIdentifier) {
      const stmt = db.prepare(`
      SELECT
        m.*,
        p.name as provider_name,
        p.display_name as provider_display_name,
        p.base_url as provider_base_url,
        p.encrypted_key as provider_encrypted_key,
        p.iv as provider_iv,
        p.auth_tag as provider_auth_tag,
        md.context_window,
        md.max_output_tokens,
        md.input_price_per_1m,
        md.output_price_per_1m,
        md.supports_streaming,
        md.supports_vision,
        md.supports_tools
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      LEFT JOIN model_metadata md ON m.id = md.model_id
      WHERE m.model_id = ? AND m.enabled = 1 AND p.enabled = 1
      LIMIT 1
    `);
      return stmt.get(modelIdentifier);
    },

    getModelsByProvider(providerId) {
      const stmt = db.prepare(
        "SELECT * FROM models WHERE provider_id = ? ORDER BY display_name ASC"
      );
      return stmt.all(providerId);
    },

    updateModel(modelId, updates) {
      const fieldMap = {
        displayName: "display_name",
        enabled: "enabled",
        isDefault: "is_default",
      };

      db.transaction(() => {
        if (updates.isDefault) {
          db.prepare("UPDATE models SET is_default = 0").run();
        }

        const { fields, values } = buildUpdateFields(updates, fieldMap, {
          enabled: (value) => (value ? 1 : 0),
          isDefault: (value) => (value ? 1 : 0),
        });

        if (fields.length === 0) {
          return;
        }

        fields.push("updated_at = ?");
        values.push(Date.now());
        values.push(modelId);

        const stmt = db.prepare(`UPDATE models SET ${fields.join(", ")} WHERE id = ?`);
        stmt.run(...values);
      })();
    },

    deleteModel(modelId) {
      const stmt = db.prepare("DELETE FROM models WHERE id = ?");
      stmt.run(modelId);
    },

    deleteModelsForProvider(providerId) {
      const stmt = db.prepare("DELETE FROM models WHERE provider_id = ?");
      stmt.run(providerId);
    },

    setModelsEnabledForProvider(providerId, enabled) {
      const stmt = db.prepare(
        "UPDATE models SET enabled = ?, updated_at = ? WHERE provider_id = ?"
      );
      stmt.run(enabled ? 1 : 0, Date.now(), providerId);
    },

    getDefaultModel() {
      const stmt = db.prepare(`
      SELECT m.*, p.name as provider_name
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      WHERE m.is_default = 1 AND m.enabled = 1 AND p.enabled = 1
      LIMIT 1
    `);
      return stmt.get();
    },

    setModelMetadata(modelId, metadata) {
      const stmt = db.prepare(`
      INSERT INTO model_metadata (
        model_id, context_window, max_output_tokens,
        input_price_per_1m, output_price_per_1m,
        supports_streaming, supports_vision, supports_tools
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(model_id) DO UPDATE SET
        context_window = excluded.context_window,
        max_output_tokens = excluded.max_output_tokens,
        input_price_per_1m = excluded.input_price_per_1m,
        output_price_per_1m = excluded.output_price_per_1m,
        supports_streaming = excluded.supports_streaming,
        supports_vision = excluded.supports_vision,
        supports_tools = excluded.supports_tools
    `);

      stmt.run(
        modelId,
        metadata.context_window ?? metadata.contextWindow ?? null,
        metadata.max_output_tokens ?? metadata.maxOutputTokens ?? null,
        metadata.input_price_per_1m ?? metadata.inputPrice ?? null,
        metadata.output_price_per_1m ?? metadata.outputPrice ?? null,
        (metadata.supports_streaming ?? metadata.supportsStreaming) ? 1 : 0,
        (metadata.supports_vision ?? metadata.supportsVision) ? 1 : 0,
        (metadata.supports_tools ?? metadata.supportsTools) ? 1 : 0
      );
    },

    getModelMetadata(modelId) {
      const stmt = db.prepare("SELECT * FROM model_metadata WHERE model_id = ?");
      return stmt.get(modelId);
    },

    getModelWithMetadata(modelId) {
      const stmt = db.prepare(`
      SELECT
        m.*,
        p.name as provider_name,
        p.display_name as provider_display_name,
        md.context_window,
        md.max_output_tokens,
        md.input_price_per_1m,
        md.output_price_per_1m,
        md.supports_streaming,
        md.supports_vision,
        md.supports_tools
      FROM models m
      JOIN providers p ON m.provider_id = p.id
      LEFT JOIN model_metadata md ON m.id = md.model_id
      WHERE m.id = ?
    `);
      return stmt.get(modelId);
    },
  };
}
