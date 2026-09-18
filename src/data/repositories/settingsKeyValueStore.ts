import type { SqlDatabase } from '../db/Database';

/**
 * Tiny key/value store for `app_settings` (PLAN §10).
 *
 * Settings are deliberately a flat string map: they are small preferences, not
 * structured data, so they do not need their own typed schema.
 */
export interface KeyValueStore {
  readAll(): Promise<Record<string, string>>;
  write(values: Record<string, string>): Promise<void>;
}

export function createSettingsKeyValueStore(db: SqlDatabase): KeyValueStore {
  return {
    async readAll(): Promise<Record<string, string>> {
      const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM app_settings');
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.key] = row.value;
      }
      return result;
    },

    async write(values: Record<string, string>): Promise<void> {
      await db.transaction(async () => {
        for (const [key, value] of Object.entries(values)) {
          // INSERT OR REPLACE rather than upsert: older Android SQLite builds
          // (pre-Android 11) do not support `ON CONFLICT ... DO UPDATE`.
          await db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
        }
      });
    },
  };
}

export { createSettingsKeyValueStore as createSettingsRepository };
