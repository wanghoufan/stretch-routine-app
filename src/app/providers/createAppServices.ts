import type { SqlDatabase } from '../../data/db/Database';
import { ExpoSqlDatabase } from '../../data/db/expoSqlDatabase';
import { runMigrations } from '../../data/migrations';
import { runSeeds, type SeedOutcome } from '../../data/seeds';
import { createActionRepository, type ActionRepository } from '../../data/repositories/actionRepository';
import { createRoutineRepository, type RoutineRepository } from '../../data/repositories/routineRepository';
import { createSessionRepository, type SessionRepository } from '../../data/repositories/sessionRepository';
import { createSettingsKeyValueStore } from '../../data/repositories/settingsKeyValueStore';
import { createSettingsRepository, type SettingsRepository } from '../../features/settings/settingsRepository';
import { SystemClock, type Clock } from '../../services/clock/Clock';
import { createSystemTicker, type Ticker } from '../../services/ticker/ticker';
import { generateId, type IdGenerator } from '../../shared/utils/id';

/** How often the runner re-renders. Presentation only (Constitution V). */
export const DEFAULT_TICK_INTERVAL_MS = 250;

/**
 * Composition root for the local-only data layer.
 *
 * The whole app shares one `AppServices` instance, which is also what makes the
 * integration tests able to swap in an in-memory / Node SQLite database and a
 * manual ticker.
 */
export interface AppServices {
  db: SqlDatabase;
  clock: Clock;
  ticker: Ticker;
  tickIntervalMs: number;
  actions: ActionRepository;
  routines: RoutineRepository;
  sessions: SessionRepository;
  settings: SettingsRepository;
  generateId: IdGenerator;
}

export interface CreateAppServicesOptions {
  db?: SqlDatabase;
  clock?: Clock;
  ticker?: Ticker;
  tickIntervalMs?: number;
  generateId?: IdGenerator;
}

export function createAppServices(options: CreateAppServicesOptions = {}): AppServices {
  const db = options.db ?? new ExpoSqlDatabase();
  const clock = options.clock ?? new SystemClock();
  const idGenerator = options.generateId ?? generateId;

  return {
    db,
    clock,
    ticker: options.ticker ?? createSystemTicker(),
    tickIntervalMs: options.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS,
    actions: createActionRepository({ db, clock, generateId: idGenerator }),
    routines: createRoutineRepository({ db, clock, generateId: idGenerator }),
    sessions: createSessionRepository(db),
    settings: createSettingsRepository(createSettingsKeyValueStore(db)),
    generateId: idGenerator,
  };
}

/** Bring the local schema up to date. Safe to call on every launch. */
export async function initializeAppDatabase(services: AppServices): Promise<number> {
  return runMigrations(services.db);
}

export interface AppInitialization {
  schemaVersion: number;
  seed: SeedOutcome;
}

/**
 * Full boot sequence: schema first, then the one-time seed library (TASK-005).
 *
 * Seeding is a no-op once `seed_version` is stored or as soon as the device
 * holds user data, so upgrading an existing install never injects content.
 */
export async function initializeApp(services: AppServices): Promise<AppInitialization> {
  const schemaVersion = await initializeAppDatabase(services);
  const seed = await runSeeds({
    db: services.db,
    clock: services.clock,
    generateId: services.generateId,
  });
  return { schemaVersion, seed };
}
