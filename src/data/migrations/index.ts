import type { SqlDatabase } from '../db/Database';

/**
 * Versioned schema migrations (Constitution XI, PLAN §10).
 *
 * Each migration is applied once and recorded in SQLite's `user_version`
 * pragma. Production upgrades never rely on dropping the database.
 */

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

export const INITIAL_SCHEMA_VERSION = 1;

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS actions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        default_duration_sec INTEGER NOT NULL,
        side_mode TEXT NOT NULL,
        default_speak_text TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        default_duration_sec INTEGER NOT NULL,
        default_transition_sec INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS routine_steps (
        id TEXT PRIMARY KEY NOT NULL,
        routine_id TEXT NOT NULL REFERENCES routines (id) ON DELETE CASCADE,
        source_action_id TEXT,
        order_index INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        speak_text TEXT NOT NULL,
        duration_sec INTEGER NOT NULL,
        transition_sec INTEGER NOT NULL,
        pair_group_id TEXT,
        side TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_routine_steps_routine
        ON routine_steps (routine_id, order_index)`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS active_session (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        session_id TEXT NOT NULL,
        routine_id TEXT NOT NULL,
        state TEXT NOT NULL,
        current_step_index INTEGER NOT NULL,
        phase_started_at_epoch_ms INTEGER,
        paused_at_epoch_ms INTEGER,
        accumulated_pause_ms INTEGER NOT NULL,
        effective_step_duration_ms INTEGER NOT NULL,
        effective_transition_duration_ms INTEGER NOT NULL,
        runtime_extension_ms INTEGER NOT NULL,
        completed_phase_ms INTEGER NOT NULL,
        updated_at_epoch_ms INTEGER NOT NULL
      )`,
    ],
  },
];

/** Highest schema version this build knows how to produce. */
export function latestSchemaVersion(): number {
  return MIGRATIONS.reduce((max, migration) => Math.max(max, migration.version), 0);
}

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/**
 * Apply every migration newer than the stored schema version. Safe to call on
 * every launch: already-applied migrations are skipped.
 */
export async function runMigrations(db: SqlDatabase): Promise<number> {
  // SQLite ignores this pragma inside a transaction, so it must be issued first
  // and on its own. Older Android SQLite builds default it to OFF.
  await db.exec('PRAGMA foreign_keys = ON');

  let current = await getSchemaVersion(db);

  for (const migration of [...MIGRATIONS].sort((a, b) => a.version - b.version)) {
    if (migration.version <= current) {
      continue;
    }
    await db.transaction(async () => {
      for (const statement of migration.statements) {
        await db.exec(statement);
      }
      // PRAGMA cannot be parameterised; the value is a validated integer literal.
      await db.exec(`PRAGMA user_version = ${Math.trunc(migration.version)}`);
    });
    current = migration.version;
  }

  return current;
}

/** Test/qa helper: drop everything and start from an empty database. */
export async function resetSchema(db: SqlDatabase): Promise<void> {
  const tables = ['routine_steps', 'routines', 'actions', 'app_settings', 'active_session'];
  for (const table of tables) {
    await db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
  await db.exec('PRAGMA user_version = 0');
}
