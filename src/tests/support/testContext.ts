import { createAppServices, initializeAppDatabase, type AppServices } from '../../app/providers/createAppServices';
import { FakeClock } from '../../services/clock/Clock';
import { createManualTicker, type ManualTicker } from '../../services/ticker/ticker';
import { createSequentialIdGenerator } from '../../shared/utils/id';
import { createNodeSqlDatabase, type NodeSqlDatabase } from './nodeSqlDatabase';

/**
 * A fully wired app against a real (in-memory) SQLite database, a fake clock and
 * a manual ticker. Nothing here touches native modules or real timers.
 */
export interface TestContext {
  services: AppServices;
  db: NodeSqlDatabase;
  clock: FakeClock;
  ticker: ManualTicker;
  dispose: () => void;
}

export async function createTestContext(nowMs = 1_700_000_000_000): Promise<TestContext> {
  const db = createNodeSqlDatabase();
  const clock = new FakeClock(nowMs);
  const ticker = createManualTicker();

  const services = createAppServices({
    db,
    clock,
    ticker,
    generateId: createSequentialIdGenerator(),
  });

  await initializeAppDatabase(services);

  return {
    services,
    db,
    clock,
    ticker,
    dispose: () => db.close(),
  };
}
