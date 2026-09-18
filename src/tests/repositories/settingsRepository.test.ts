import { createSettingsKeyValueStore } from '../../data/repositories/settingsKeyValueStore';
import { createSettingsRepository } from '../../features/settings/settingsRepository';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../features/settings/settingsModel';
import { runMigrations } from '../../data/migrations';
import { createNodeSqlDatabase, type NodeSqlDatabase } from '../support/nodeSqlDatabase';

async function setup() {
  const db: NodeSqlDatabase = createNodeSqlDatabase();
  await runMigrations(db);
  return { db, settings: createSettingsRepository(createSettingsKeyValueStore(db)) };
}

describe('settings persistence (T082)', () => {
  it('returns V1 defaults when nothing has been saved', async () => {
    const { db, settings } = await setup();
    expect(await settings.load()).toEqual(DEFAULT_SETTINGS);
    db.close();
  });

  it('persists and reloads changed values (survives app restart)', async () => {
    const { db, settings } = await setup();

    await settings.save({
      ...DEFAULT_SETTINGS,
      ttsEnabled: false,
      speechRate: 1.4,
      countdownWarningEnabled: false,
      countdownWarningSec: 8,
      defaultDurationSec: 45,
      defaultTransitionSec: 10,
      ambientSound: 'night',
    });

    const reloaded = await settings.load();
    expect(reloaded).toMatchObject({
      ttsEnabled: false,
      speechRate: 1.4,
      countdownWarningEnabled: false,
      countdownWarningSec: 8,
      defaultDurationSec: 45,
      defaultTransitionSec: 10,
      ambientSound: 'night',
    });
    db.close();
  });

  it('defaults the countdown background sound to tick (TASK-011)', async () => {
    const { db, settings } = await setup();
    expect((await settings.load()).ambientSound).toBe('tick');

    await settings.save({ ...DEFAULT_SETTINGS, ambientSound: 'silent' });
    expect((await settings.load()).ambientSound).toBe('silent');
    db.close();
  });

  it('falls back to tick for an unknown stored background sound', async () => {
    const { db, settings } = await setup();
    await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
      'ambientSound',
      'thunderstorm',
    ]);

    expect((await settings.load()).ambientSound).toBe('tick');
    db.close();
  });

  it('overwrites rather than duplicating keys', async () => {
    const { db, settings } = await setup();

    await settings.save({ ...DEFAULT_SETTINGS, defaultDurationSec: 40 });
    await settings.save({ ...DEFAULT_SETTINGS, defaultDurationSec: 50 });

    const rows = await db.get<{ total: number }>('SELECT COUNT(*) AS total FROM app_settings');
    expect(rows?.total).toBe(Object.keys(DEFAULT_SETTINGS).length);
    expect((await settings.load()).defaultDurationSec).toBe(50);
    db.close();
  });

  it('falls back to defaults instead of throwing on a corrupt row', async () => {
    const { db, settings } = await setup();
    await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', ['speechRate', 'not-a-number']);
    await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', ['ttsEnabled', 'maybe']);

    const loaded = await settings.load();
    expect(loaded.speechRate).toBe(DEFAULT_SETTINGS.speechRate);
    expect(loaded.ttsEnabled).toBe(DEFAULT_SETTINGS.ttsEnabled);
    db.close();
  });
});

describe('settings normalisation', () => {
  it('clamps out-of-range values', () => {
    const settings = normalizeSettings({
      speechRate: 9,
      countdownWarningSec: 900,
      defaultDurationSec: 0,
      defaultTransitionSec: -3,
    });

    expect(settings.speechRate).toBe(2);
    expect(settings.countdownWarningSec).toBe(15);
    expect(settings.defaultDurationSec).toBe(1);
    expect(settings.defaultTransitionSec).toBe(0);
  });

  it('rounds the speech rate to one decimal place', () => {
    expect(normalizeSettings({ speechRate: 1.234 }).speechRate).toBe(1.2);
  });

  it('normalises the background sound option', () => {
    expect(normalizeSettings({ ambientSound: 'ethereal' }).ambientSound).toBe('ethereal');
    expect(normalizeSettings({ ambientSound: 'nope' as never }).ambientSound).toBe('tick');
    expect(normalizeSettings({}).ambientSound).toBe('tick');
  });

  it('rewrites stored rain/waves/forest values to tick (TASK-016 forward compatibility)', async () => {
    for (const legacy of ['rain', 'waves', 'forest'] as const) {
      const { db, settings } = await setup();
      await db.run('INSERT INTO app_settings (key, value) VALUES (?, ?)', ['ambientSound', legacy]);

      expect((await settings.load()).ambientSound).toBe('tick');
      db.close();
    }
  });
});
