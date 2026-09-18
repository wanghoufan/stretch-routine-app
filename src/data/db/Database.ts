/**
 * Minimal SQL port used by the data layer.
 *
 * Repositories depend on this interface instead of `expo-sqlite` directly so
 * the exact same SQL can be exercised in Jest against a real SQLite engine
 * (`node:sqlite`), which is what the persistence and migration tests do.
 */

export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

export interface SqlDatabase {
  /** Run one or more statements without parameters (DDL, PRAGMA). */
  exec(sql: string): Promise<void>;
  /** Run a parameterised statement that returns no rows. */
  run(sql: string, params?: SqlParams): Promise<void>;
  /** Run a parameterised query and return all rows. */
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  /** Run a parameterised query and return the first row, or null. */
  get<T>(sql: string, params?: SqlParams): Promise<T | null>;
  /** Run `fn` atomically: every statement inside commits or rolls back together. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}
