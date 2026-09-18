import {
  INITIAL_SCHEMA_VERSION,
  MIGRATIONS,
  getSchemaVersion,
  latestSchemaVersion,
  resetSchema,
  runMigrations,
} from '../../data/migrations';
import { createNodeSqlDatabase } from '../support/nodeSqlDatabase';

describe('schema migrations (T092)', () => {
  it('applies the full schema to a fresh database', async () => {
    const db = createNodeSqlDatabase();
    expect(await getSchemaVersion(db)).toBe(0);

    const version = await runMigrations(db);

    expect(version).toBe(latestSchemaVersion());
    expect(version).toBeGreaterThanOrEqual(INITIAL_SCHEMA_VERSION);

    const tables = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    const names = tables.map((table) => table.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'actions',
        'routines',
        'routine_steps',
        'app_settings',
        'active_session',
      ]),
    );
    db.close();
  });

  it('is idempotent: running twice changes nothing', async () => {
    const db = createNodeSqlDatabase();
    const first = await runMigrations(db);
    const second = await runMigrations(db);

    expect(second).toBe(first);

    const indexes = await db.all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_routine_steps_routine'",
    );
    expect(indexes).toHaveLength(1);
    db.close();
  });

  it('upgrades an existing database without losing data', async () => {
    const db = createNodeSqlDatabase();
    await runMigrations(db);
    await db.run(
      'INSERT INTO routines (id, name, default_duration_sec, default_transition_sec, created_at, updated_at) VALUES (?,?,?,?,?,?)',
      ['r1', '已有流程', 30, 5, 'now', 'now'],
    );

    // Simulate a re-launch on an already-migrated database.
    await runMigrations(db);

    const row = await db.get<{ name: string }>('SELECT name FROM routines WHERE id = ?', ['r1']);
    expect(row?.name).toBe('已有流程');
    db.close();
  });

  it('can rebuild the schema from scratch after resetSchema', async () => {
    const db = createNodeSqlDatabase();
    await runMigrations(db);
    await resetSchema(db);
    expect(await getSchemaVersion(db)).toBe(0);

    const version = await runMigrations(db);
    expect(version).toBe(latestSchemaVersion());
    db.close();
  });

  it('declares one migration per version, in ascending order', () => {
    const versions = MIGRATIONS.map((migration) => migration.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    expect(latestSchemaVersion()).toBe(versions[versions.length - 1]);
  });

  it('enforces the routine_steps -> routines foreign key', async () => {
    const db = createNodeSqlDatabase();
    await runMigrations(db);

    await expect(
      db.run(
        `INSERT INTO routine_steps
           (id, routine_id, source_action_id, order_index, display_name, speak_text,
            duration_sec, transition_sec, pair_group_id, side)
         VALUES ('s1', 'missing-routine', NULL, 0, 'A', 'A', 30, 0, NULL, 'none')`,
      ),
    ).rejects.toThrow();

    db.close();
  });
});
