import {
  advanceRunner,
  startRunner,
  type RunnerEvent,
} from '../../features/runner/domain/runnerMachine';
import { remainingMs } from '../../features/runner/domain/runnerTime';
import { makeSteps } from '../support/fixtures';
import type { ActiveSession } from '../../domain/session/ActiveSession';
import type { RoutineStep } from '../../domain/routine/RoutineStep';

/** Small harness that drives the pure machine with an explicit timeline. */
function createHarness(steps: RoutineStep[], startAtMs = 0) {
  let session: ActiveSession = startRunner({
    sessionId: 'session-1',
    routineId: 'routine-1',
    steps,
    nowMs: startAtMs,
  }).session;

  return {
    get session() {
      return session;
    },
    advance(nowMs: number): RunnerEvent[] {
      const result = advanceRunner(session, steps, nowMs);
      session = result.session;
      return result.events;
    },
  };
}

describe('runner state machine — normal progression (T040)', () => {
  it('starts on the first step with a start cue', () => {
    const steps = makeSteps([['A', 10, 0]]);
    const result = startRunner({ sessionId: 's', routineId: 'r', steps, nowMs: 5_000 });

    expect(result.session.state).toBe('RUNNING_STEP');
    expect(result.session.currentStepIndex).toBe(0);
    expect(result.session.phaseStartedAtEpochMs).toBe(5_000);
    expect(result.events).toEqual([{ type: 'STEP_STARTED', stepIndex: 0, suppressed: false }]);
  });

  it('refuses to start an empty routine', () => {
    expect(() => startRunner({ sessionId: 's', routineId: 'r', steps: [], nowMs: 0 })).toThrow(
      '流程没有可播放的步骤',
    );
  });

  it('completes a single-step routine exactly at its duration', () => {
    const steps = makeSteps([['A', 10]]);
    const harness = createHarness(steps);

    expect(harness.advance(9_999)).toEqual([]);
    expect(harness.session.state).toBe('RUNNING_STEP');

    expect(harness.advance(10_000)).toEqual([{ type: 'COMPLETED' }]);
    expect(harness.session.state).toBe('COMPLETED');
    expect(harness.session.phaseStartedAtEpochMs).toBeNull();
  });

  it('runs a multi-step routine through transitions in order', () => {
    const steps = makeSteps([
      ['A', 10, 5],
      ['B', 20, 0],
      ['C', 30, 0],
    ]);
    const harness = createHarness(steps);

    // t=10s: step A ends and its 5s transition starts, preparing step B.
    expect(harness.advance(10_000)).toEqual([
      { type: 'TRANSITION_STARTED', fromStepIndex: 0, toStepIndex: 1, suppressed: false },
    ]);
    expect(harness.session.state).toBe('RUNNING_TRANSITION');
    expect(harness.session.currentStepIndex).toBe(1);
    expect(remainingMs(harness.session, 12_000)).toBe(3_000);

    // t=15s: transition ends, step B begins.
    expect(harness.advance(15_000)).toEqual([
      { type: 'STEP_STARTED', stepIndex: 1, suppressed: false },
    ]);
    expect(harness.session.state).toBe('RUNNING_STEP');

    // Step B has no transition, so t=35s goes straight into step C.
    expect(harness.advance(34_999)).toEqual([]);
    expect(harness.advance(35_000)).toEqual([
      { type: 'STEP_STARTED', stepIndex: 2, suppressed: false },
    ]);
    expect(harness.session.state).toBe('RUNNING_STEP');

    // Final step: completion at 10 + 5 + 20 + 30 = 65s.
    expect(harness.advance(64_999)).toEqual([]);
    expect(harness.advance(65_000)).toEqual([{ type: 'COMPLETED' }]);
    expect(harness.session.state).toBe('COMPLETED');
  });

  it('skips the transition phase entirely when transitionSec is zero', () => {
    const steps = makeSteps([
      ['A', 10, 0],
      ['B', 10, 0],
    ]);
    const harness = createHarness(steps);

    expect(harness.advance(10_000)).toEqual([
      { type: 'STEP_STARTED', stepIndex: 1, suppressed: false },
    ]);
    expect(harness.session.state).toBe('RUNNING_STEP');
  });

  it('carries boundary overflow forward instead of drifting after a jump', () => {
    const steps = makeSteps([
      ['A', 10, 0],
      ['B', 10, 0],
    ]);
    const harness = createHarness(steps);

    // 12s elapsed: step B started at 10s, so it must have 8s left (not 10s).
    harness.advance(12_000);
    expect(harness.session.currentStepIndex).toBe(1);
    expect(remainingMs(harness.session, 12_000)).toBe(8_000);
    expect(harness.session.phaseStartedAtEpochMs).toBe(10_000);
  });

  it('resolves every boundary crossed during a long background gap', () => {
    const steps = makeSteps([
      ['A', 10, 5],
      ['B', 20, 0],
      ['C', 30, 0],
    ]);
    const harness = createHarness(steps);

    const events = harness.advance(65_000);

    expect(harness.session.state).toBe('COMPLETED');
    expect(events.at(-1)).toEqual({ type: 'COMPLETED' });
    // Only the newest cue survives: nothing from the passed steps is spoken.
    expect(events.slice(0, -1).every((event) => 'suppressed' in event && event.suppressed)).toBe(true);
    expect(events).toHaveLength(4);
  });

  it('marks the newest step cue as not suppressed when a gap lands mid-routine', () => {
    const steps = makeSteps([
      ['A', 10, 0],
      ['B', 10, 0],
      ['C', 10, 0],
    ]);
    const harness = createHarness(steps);

    const events = harness.advance(25_000);

    expect(harness.session.state).toBe('RUNNING_STEP');
    expect(harness.session.currentStepIndex).toBe(2);
    expect(events).toEqual([
      { type: 'STEP_STARTED', stepIndex: 1, suppressed: true },
      { type: 'STEP_STARTED', stepIndex: 2, suppressed: false },
    ]);
  });

  it('ignores ticks once the routine is finished', () => {
    const steps = makeSteps([['A', 10]]);
    const harness = createHarness(steps);
    harness.advance(10_000);
    expect(harness.session.state).toBe('COMPLETED');

    expect(harness.advance(120_000)).toEqual([]);
    expect(harness.session.state).toBe('COMPLETED');
  });

  it('records completed phase time as the routine progresses', () => {
    const steps = makeSteps([
      ['A', 10, 5],
      ['B', 20, 0],
    ]);
    const harness = createHarness(steps);
    harness.advance(10_000);
    expect(harness.session.completedPhaseMs).toBe(10_000);
    harness.advance(15_000);
    expect(harness.session.completedPhaseMs).toBe(15_000);
  });
});
