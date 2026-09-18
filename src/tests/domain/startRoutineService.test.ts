import { createStartRoutineService, buildResumeEvents } from '../../features/runner/services/startRoutineService';
import { createRoutineRepository } from '../../data/repositories/routineRepository';
import { createSessionRepository } from '../../data/repositories/sessionRepository';
import { runMigrations } from '../../data/migrations';
import { FakeClock, FakeMonotonicClock } from '../../services/clock';
import { FakeBootInfoProvider } from '../../services/runtime/BootInfo';
import { createSequentialIdGenerator } from '../../shared/utils/id';
import { createNodeSqlDatabase, type NodeSqlDatabase } from '../support/nodeSqlDatabase';

/**
 * R014–R018: the Start Result Contract and the no-silent-replace guarantee.
 */
async function setup() {
  const db: NodeSqlDatabase = createNodeSqlDatabase();
  await runMigrations(db);

  const clock = new FakeClock(1_700_000_000_000);
  const monotonic = new FakeMonotonicClock(0);
  const bootInfo = new FakeBootInfoProvider(1);
  const sessions = createSessionRepository(db);
  const routines = createRoutineRepository({
    db,
    clock,
    generateId: createSequentialIdGenerator('rtn'),
  });
  const service = createStartRoutineService({
    routines,
    sessions,
    monotonic,
    wallClock: clock,
    bootInfo,
    generateId: createSequentialIdGenerator('ses'),
  });

  const routineA = await routines.create({
    name: '流程A',
    defaultDurationSec: 10,
    defaultTransitionSec: 0,
    steps: [{ displayName: 'A1', durationSec: 10, transitionSec: 0 }],
  });
  const routineB = await routines.create({
    name: '流程B',
    defaultDurationSec: 10,
    defaultTransitionSec: 0,
    steps: [{ displayName: 'B1', durationSec: 10, transitionSec: 0 }],
  });

  return { db, clock, monotonic, bootInfo, sessions, routines, service, routineA, routineB };
}

async function countRows(db: NodeSqlDatabase): Promise<number> {
  const row = await db.get<{ total: number }>('SELECT COUNT(*) AS total FROM active_session');
  return row?.total ?? 0;
}

describe('StartRoutineService (R014–R018)', () => {
  it('starts a routine with an INSERT and returns the first-step cue', async () => {
    const { db, service, routineA, sessions } = await setup();

    const result = await service.start(routineA.routine.id);

    expect(result.kind).toBe('started');
    if (result.kind === 'started') {
      expect(result.session.routineId).toBe(routineA.routine.id);
      expect(result.session.snapshot.steps[0]?.displayName).toBe('A1');
      expect(result.events).toEqual([{ type: 'STEP_STARTED', stepIndex: 0, suppressed: false }]);
    }
    expect(await countRows(db)).toBe(1);
    expect((await sessions.loadActive()).status).toBe('ok');
    db.close();
  });

  it('continues the same routine instead of creating a second session', async () => {
    const { db, service, routineA } = await setup();

    const first = await service.start(routineA.routine.id);
    const second = await service.start(routineA.routine.id);

    expect(second.kind).toBe('continue-current');
    if (first.kind === 'started' && second.kind === 'continue-current') {
      expect(second.session.sessionId).toBe(first.session.sessionId);
      expect(second.events).toEqual([{ type: 'STEP_STARTED', stepIndex: 0, suppressed: false }]);
    }
    expect(await countRows(db)).toBe(1);
    db.close();
  });

  it('reports a conflict for a different routine and changes nothing', async () => {
    const { db, service, routineA, routineB } = await setup();
    const first = await service.start(routineA.routine.id);

    const conflict = await service.start(routineB.routine.id);

    expect(conflict.kind).toBe('conflict');
    if (conflict.kind === 'conflict' && first.kind === 'started') {
      expect(conflict.current.sessionId).toBe(first.session.sessionId);
      expect(conflict.current.routineId).toBe(routineA.routine.id);
    }
    // No silent replace: still exactly one row, still routine A.
    const loaded = await service.continueCurrent();
    expect(loaded.kind === 'continue-current' ? loaded.session.routineId : null).toBe(
      routineA.routine.id,
    );
    expect(await countRows(db)).toBe(1);
    db.close();
  });

  it('replaces only when explicitly asked, after the conflict', async () => {
    const { db, service, routineA, routineB } = await setup();
    const first = await service.start(routineA.routine.id);

    const replaced = await service.replaceWith(routineB.routine.id);

    expect(replaced.kind).toBe('started');
    if (replaced.kind === 'started' && first.kind === 'started') {
      expect(replaced.session.routineId).toBe(routineB.routine.id);
      expect(replaced.session.sessionId).not.toBe(first.session.sessionId);
    }
    expect(await countRows(db)).toBe(1);
    db.close();
  });

  it('fails clearly when the routine or the session does not exist', async () => {
    const { db, service } = await setup();

    expect((await service.start('missing')).kind).toBe('failed');
    expect((await service.continueCurrent()).kind).toBe('failed');
    db.close();
  });

  it('does not let a session from a previous boot block a new start', async () => {
    const { db, service, routineA, routineB, bootInfo } = await setup();
    await service.start(routineA.routine.id);

    // The process restarted: the stored session's monotonic origin is gone.
    bootInfo.setBootCount(2);
    const result = await service.start(routineB.routine.id);

    expect(result.kind).toBe('started');
    if (result.kind === 'started') {
      expect(result.session.routineId).toBe(routineB.routine.id);
      expect(result.session.bootCount).toBe(2);
    }
    expect(await countRows(db)).toBe(1);
    db.close();
  });

  it('builds a resume cue for the current phase of an explicit continue', async () => {
    const { db, service, routineA } = await setup();
    const started = await service.start(routineA.routine.id);
    if (started.kind !== 'started') {
      throw new Error('expected started');
    }

    expect(buildResumeEvents(started.session)).toEqual([
      { type: 'STEP_STARTED', stepIndex: 0, suppressed: false },
    ]);
    db.close();
  });
});
