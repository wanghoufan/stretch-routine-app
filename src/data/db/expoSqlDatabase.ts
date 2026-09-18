import type { SqlDatabase, SqlParams } from './Database';

export type { SqlDatabase, SqlParams, SqlValue } from './Database';

/**
 * Lazy `expo-sqlite` adapter.
 *
 * The database handle is opened on first use so the app can mount its UI
 * without blocking on I/O. `expo-sqlite` is imported here and nowhere else in
 * the domain/data code, which keeps the data layer testable in Node.
 */
export class ExpoSqlDatabase implements SqlDatabase {
  private readonly databaseName: string;
  private opened: Promise<import('expo-sqlite').SQLiteDatabase> | null = null;

  constructor(databaseName = 'stretch-routine-v1.db') {
    this.databaseName = databaseName;
  }

  private async open(): Promise<import('expo-sqlite').SQLiteDatabase> {
    if (!this.opened) {
      // Imported lazily so importing the data layer never pulls in native code.
      const sqlite = await import('expo-sqlite');
      this.opened = sqlite.openDatabaseAsync(this.databaseName);
    }
    return this.opened;
  }

  async exec(sql: string): Promise<void> {
    const db = await this.open();
    await db.execAsync(sql);
  }

  async run(sql: string, params: SqlParams = []): Promise<void> {
    const db = await this.open();
    await db.runAsync(sql, params as (string | number | null)[]);
  }

  async all<T>(sql: string, params: SqlParams = []): Promise<T[]> {
    const db = await this.open();
    const rows = await db.getAllAsync(sql, params as (string | number | null)[]);
    return rows as T[];
  }

  async get<T>(sql: string, params: SqlParams = []): Promise<T | null> {
    const db = await this.open();
    const row = await db.getFirstAsync(sql, params as (string | number | null)[]);
    return (row ?? null) as T | null;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const db = await this.open();
    let result: T | undefined;
    await db.withTransactionAsync(async () => {
      result = await fn();
    });
    return result as T;
  }
}
