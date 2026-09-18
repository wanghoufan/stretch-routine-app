import type { KeyValueStore } from '../../data/repositories/settingsKeyValueStore';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  settingsFromRecord,
  settingsToRecord,
  type AppSettings,
} from './settingsModel';

/**
 * Settings persistence (T082).
 *
 * Reads are tolerant: a missing or corrupt row falls back to V1 defaults rather
 * than blocking app start (PLAN §15).
 */
export interface SettingsRepository {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}

export function createSettingsRepository(store: KeyValueStore): SettingsRepository {
  return {
    async load(): Promise<AppSettings> {
      try {
        const record = await store.readAll();
        if (Object.keys(record).length === 0) {
          return { ...DEFAULT_SETTINGS };
        }
        return settingsFromRecord(record);
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },

    async save(settings: AppSettings): Promise<void> {
      await store.write(settingsToRecord(normalizeSettings(settings)));
    },
  };
}
