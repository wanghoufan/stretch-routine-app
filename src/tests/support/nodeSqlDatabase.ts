import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase, SqlParams } from '../../data/db/Database';

/**
 * Real SQLite for tests, backed by Node's built-in `node:sqlite`.
 *
 * Repository and migration tests therefore exercise the exact SQL the device
 * runs, without adding a native test dependency.
 */
export interface NodeSqlDatabase extends SqlDatabase {
  close(): void;
}

export function createNodeSqlDatabase(): NodeSqlDatabase {
  const db = new DatabaseSync(':memory:');

  const bind = (params: SqlParams): (string | number | null)[] => [...params];

  return {
    async exec(sql: string): Promise<void> {
      db.exec(sql);
    },

    async run(sql: string, params: SqlParams = []): Promise<void> {
      db.prepare(sql).run(...bind(params));
    },

    async all<T>(sql: string, params: SqlParams = []): Promise<T[]> {
      return db.prepare(sql).all(...bind(params)) as T[];
    },

    async get<T>(sql: string, params: SqlParams = []): Promise<T | null> {
      const row = db.prepare(sql).get(...bind(params));
      return (row ?? null) as T | null;
    },

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      db.exec('BEGIN');
      try {
        const result = await fn();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },

    close(): void {
      db.close();
    },
  };
}
