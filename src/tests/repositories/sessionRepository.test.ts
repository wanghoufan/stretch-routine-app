import { createSessionRepository } from '../../data/repositories/sessionRepository';
import { runMigrations } from '../../data/migrations';
import type { ActiveSession } from '../../domain/session/ActiveSession';
import { createNodeSqlDatabase, type NodeSqlDatabase } from '../support/nodeSqlDatabase';

function makeSession(overrides: Partial<ActiveSession> = {}): ActiveSession {
  return {
    sessionId: 'session-1',
    routineId: 'routine-1',
    state: 'RUNNING_STEP',
    currentStepIndex: 1,
    phaseStartedAtEpochMs: 1_700_000_000_000,
    pausedAtEpochMs: null,
    accumulatedPauseMs: 3_000,
    effectiveStepDurationMs: 45_000,
    effectiveTransitionDurationMs: 5_000,
    runtimeExtensionMs: 10_000,
    completedPhaseMs: 12_000,
    updatedAtEpochMs: 1_700_000_010_000,
    ...overrides,
  };
}

async function setup() {
  const db: NodeSqlDatabase = createNodeSqlDatabase();
  await runMigrations(db);
  return { db, sessions: createSessionRepository(db) };
}

describe('active session repository', () => {
  it('round-trips every authoritative field', async () => {
    const { db, sessions } = await setup();
    const session = makeSession();

    await sessions.save(session);
    expect(await sessions.loadActive()).toEqual(session);
    db.close();
  });

  it('keeps a single singleton row across repeated saves', async () => {
    const { db, sessions } = await setup();

    await sessions.save(makeSession());
    await sessions.save(makeSession({ state: 'PAUSED_STEP', pausedAtEpochMs: 1_700_000_020_000 }));

    const rows = await db.get<{ total: number }>('SELECT COUNT(*) AS total FROM active_session');
    expect(rows?.total).toBe(1);
    expect((await sessions.loadActive())?.state).toBe('PAUSED_STEP');
    db.close();
  });

  it('preserves nullable timestamps', async () => {
    const { db, sessions } = await setup();
    await sessions.save(makeSession({ pausedAtEpochMs: null, phaseStartedAtEpochMs: null }));

    const loaded = await sessions.loadActive();
    expect(loaded?.pausedAtEpochMs).toBeNull();
    expect(loaded?.phaseStartedAtEpochMs).toBeNull();
    db.close();
  });

  it('clears the session so recovery cannot resurrect a finished routine', async () => {
    const { db, sessions } = await setup();
    await sessions.save(makeSession());
    await sessions.clear();
    expect(await sessions.loadActive()).toBeNull();
    db.close();
  });

  it('returns null when nothing is stored', async () => {
    const { db, sessions } = await setup();
    expect(await sessions.loadActive()).toBeNull();
    db.close();
  });

  it('surfaces an unknown stored state as ERROR instead of guessing', async () => {
    const { db, sessions } = await setup();
    await db.run(
      `INSERT INTO active_session
         (id, session_id, routine_id, state, current_step_index, phase_started_at_epoch_ms,
          paused_at_epoch_ms, accumulated_pause_ms, effective_step_duration_ms,
          effective_transition_duration_ms, runtime_extension_ms, completed_phase_ms, updated_at_epoch_ms)
       VALUES (1, 's', 'r', 'NOT_A_STATE', 0, 1000, NULL, 0, 10000, 0, 0, 0, 1000)`,
    );

    expect((await sessions.loadActive())?.state).toBe('ERROR');
    db.close();
  });
});
