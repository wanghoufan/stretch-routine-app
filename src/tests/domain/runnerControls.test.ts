import {
  advanceRunner,
  applyRunnerControl,
  startRunner,
  type RunnerControl,
  type RunnerEvent,
} from '../../features/runner/domain/runnerMachine';
import { remainingMs } from '../../features/runner/domain/runnerTime';
import type { ActiveSession } from '../../domain/session/ActiveSession';
import type { RoutineStep } from '../../domain/routine/RoutineStep';
import { makeSteps } from '../support/fixtures';

function createHarness(steps: RoutineStep[]) {
  let session: ActiveSession = startRunner({
    sessionId: 'session-1',
    routineId: 'routine-1',
    steps,
    nowMs: 0,
  }).session;

  return {
    steps,
    get session() {
      return session;
    },
    advance(nowMs: number): RunnerEvent[] {
      const result = advanceRunner(session, steps, nowMs);
      session = result.session;
      return result.events;
    },
    control(action: RunnerControl, nowMs: number): RunnerEvent[] {
      const result = applyRunnerControl(session, steps, action, nowMs);
      session = result.session;
      return result.events;
    },
  };
}

describe('runner controls (T055)', () => {
  describe('pause / resume', () => {
    it('freezes effective elapsed time until resume', () => {
      const harness = createHarness(makeSteps([['A', 10]]));

      harness.advance(3_000);
      harness.control({ type: 'PAUSE' }, 3_000);
      expect(harness.session.state).toBe('PAUSED_STEP');
      expect(harness.session.pausedAtEpochMs).toBe(3_000);

      // A full minute passes with the routine paused.
      harness.advance(63_000);
      expect(harness.session.state).toBe('PAUSED_STEP');
      expect(remainingMs(harness.session, 63_000)).toBe(7_000);

      harness.control({ type: 'RESUME' }, 63_000);
      expect(harness.session.state).toBe('RUNNING_STEP');
      expect(harness.session.accumulatedPauseMs).toBe(60_000);
      expect(harness.session.phaseStartedAtEpochMs).toBe(0);
      expect(remainingMs(harness.session, 63_000)).toBe(7_000);

      // 7 more seconds of *running* time finish the step.
      expect(harness.advance(69_999)).toEqual([]);
      expect(harness.advance(70_000)).toEqual([{ type: 'COMPLETED' }]);
    });

    it('is a no-op when the routine is not running', () => {
      const harness = createHarness(makeSteps([['A', 10]]));
      harness.advance(10_000);
      harness.control({ type: 'PAUSE' }, 10_000);
      expect(harness.session.state).toBe('COMPLETED');
    });

    it('preserves the transition phase across a pause', () => {
      const harness = createHarness(
        makeSteps([
          ['A', 10, 5],
          ['B', 20, 0],
        ]),
      );

      harness.advance(10_000);
      expect(harness.session.state).toBe('RUNNING_TRANSITION');

      harness.control({ type: 'PAUSE' }, 12_000);
      expect(harness.session.state).toBe('PAUSED_TRANSITION');
      expect(remainingMs(harness.session, 12_000)).toBe(3_000);
      expect(remainingMs(harness.session, 60_000)).toBe(3_000);

      harness.control({ type: 'RESUME' }, 20_000);
      expect(harness.session.state).toBe('RUNNING_TRANSITION');
      expect(remainingMs(harness.session, 20_000)).toBe(3_000);
      // The transition still ends at 23s of effective time.
      expect(harness.advance(22_999)).toEqual([]);
      expect(harness.advance(23_000)).toEqual([
        { type: 'STEP_STARTED', stepIndex: 1, suppressed: false },
      ]);
    });
  });

  describe('+10 seconds', () => {
    it('extends only the current step, at runtime', () => {
      const steps = makeSteps([
        ['A', 10, 0],
        ['B', 10, 0],
      ]);
      const harness = createHarness(steps);

      harness.advance(9_000);
      harness.control({ type: 'ADD_TIME' }, 9_000);

      expect(harness.session.effectiveStepDurationMs).toBe(20_000);
      expect(harness.session.runtimeExtensionMs).toBe(10_000);
      expect(remainingMs(harness.session, 9_000)).toBe(11_000);
      // The saved routine is untouched.
      expect(steps[0]?.durationSec).toBe(10);
      expect(steps[1]?.durationSec).toBe(10);
    });

    it('works while paused and does not create a boundary race', () => {
      const harness = createHarness(makeSteps([['A', 10]]));
      harness.advance(9_999);
      harness.control({ type: 'PAUSE' }, 9_999);
      harness.control({ type: 'ADD_TIME' }, 9_999);

      expect(harness.session.state).toBe('PAUSED_STEP');
      expect(remainingMs(harness.session, 60_000)).toBe(10_001);

      harness.control({ type: 'RESUME' }, 60_000);
      expect(harness.advance(70_000)).toEqual([]);
      expect(harness.advance(70_001)).toEqual([{ type: 'COMPLETED' }]);
    });

    it('is ignored during a transition', () => {
      const harness = createHarness(
        makeSteps([
          ['A', 10, 5],
          ['B', 10, 0],
        ]),
      );
      harness.advance(11_000);
      const before = harness.session.effectiveStepDurationMs;
      harness.control({ type: 'ADD_TIME' }, 11_000);
      expect(harness.session.effectiveStepDurationMs).toBe(before);
      expect(harness.session.runtimeExtensionMs).toBe(0);
    });
  });

  describe('previous', () => {
    it('restarts the previous step at its full saved duration and drops +10', () => {
      const steps = makeSteps([
        ['A', 10, 0],
        ['B', 20, 0],
        ['C', 30, 0],
      ]);
      const harness = createHarness(steps);

      harness.advance(35_000); // now on C
      harness.control({ type: 'ADD_TIME' }, 35_000);
      expect(harness.session.runtimeExtensionMs).toBe(10_000);

      const events = harness.control({ type: 'PREVIOUS' }, 35_000);

      expect(harness.session.state).toBe('RUNNING_STEP');
      expect(harness.session.currentStepIndex).toBe(1);
      expect(harness.session.effectiveStepDurationMs).toBe(20_000);
      expect(harness.session.runtimeExtensionMs).toBe(0);
      expect(harness.session.phaseStartedAtEpochMs).toBe(35_000);
      expect(harness.session.completedPhaseMs).toBe(10_000);
      expect(events).toEqual([{ type: 'STEP_STARTED', stepIndex: 1, suppressed: false }]);
    });

    it('goes back to the step whose transition is running', () => {
      const harness = createHarness(
        makeSteps([
          ['A', 10, 5],
          ['B', 20, 0],
        ]),
      );
      harness.advance(11_000);
      expect(harness.session.currentStepIndex).toBe(1);
      expect(harness.session.state).toBe('RUNNING_TRANSITION');

      harness.control({ type: 'PREVIOUS' }, 11_000);
      expect(harness.session.currentStepIndex).toBe(0);
      expect(harness.session.state).toBe('RUNNING_STEP');
      expect(harness.session.effectiveStepDurationMs).toBe(10_000);
    });

    it('is a defined no-op on the first step', () => {
      const harness = createHarness(makeSteps([['A', 10]]));
      harness.advance(2_000);
      const before = harness.session;

      const events = harness.control({ type: 'PREVIOUS' }, 2_000);

      expect(events).toEqual([]);
      expect(harness.session).toBe(before);
    });
  });

  describe('skip / next', () => {
    it('advances immediately and skips the pending transition', () => {
      const steps = makeSteps([
        ['A', 10, 5],
        ['B', 20, 0],
        ['C', 30, 0],
      ]);
      const harness = createHarness(steps);

      harness.advance(4_000);
      const events = harness.control({ type: 'SKIP' }, 4_000);

      expect(harness.session.state).toBe('RUNNING_STEP');
      expect(harness.session.currentStepIndex).toBe(1);
      expect(harness.session.phaseStartedAtEpochMs).toBe(4_000);
      expect(harness.session.completedPhaseMs).toBe(4_000);
      expect(harness.session.runtimeExtensionMs).toBe(0);
      expect(events).toEqual([{ type: 'STEP_STARTED', stepIndex: 1, suppressed: false }]);
    });

    it('leaves the transition early and starts the prepared step', () => {
      const harness = createHarness(
        makeSteps([
          ['A', 10, 5],
          ['B', 20, 0],
        ]),
      );
      harness.advance(12_000);
      const events = harness.control({ type: 'SKIP' }, 12_000);

      expect(harness.session.state).toBe('RUNNING_STEP');
      expect(harness.session.currentStepIndex).toBe(1);
      expect(events).toEqual([{ type: 'STEP_STARTED', stepIndex: 1, suppressed: false }]);
    });

    it('finishes the routine when skipping the final step', () => {
      const harness = createHarness(
        makeSteps([
          ['A', 10, 0],
          ['B', 10, 0],
        ]),
      );
      harness.advance(12_000);
      expect(harness.session.currentStepIndex).toBe(1);

      const events = harness.control({ type: 'SKIP' }, 12_000);
      expect(events).toEqual([{ type: 'COMPLETED' }]);
      expect(harness.session.state).toBe('COMPLETED');
    });

    it('keeps the paused state when skipping while paused', () => {
      const harness = createHarness(
        makeSteps([
          ['A', 10, 0],
          ['B', 10, 0],
        ]),
      );
      harness.advance(4_000);
      harness.control({ type: 'PAUSE' }, 4_000);
      harness.control({ type: 'SKIP' }, 4_000);

      expect(harness.session.state).toBe('PAUSED_STEP');
      expect(harness.session.currentStepIndex).toBe(1);
      expect(remainingMs(harness.session, 40_000)).toBe(10_000);
    });
  });

  describe('end', () => {
    it('stops the routine into a stable non-running state', () => {
      const harness = createHarness(makeSteps([['A', 10]]));
      harness.advance(3_000);

      const events = harness.control({ type: 'END' }, 3_000);

      expect(events).toEqual([{ type: 'STOPPED' }]);
      expect(harness.session.state).toBe('STOPPED');
      expect(harness.session.phaseStartedAtEpochMs).toBeNull();
      expect(harness.session.pausedAtEpochMs).toBeNull();
    });

    it('is a no-op after completion', () => {
      const harness = createHarness(makeSteps([['A', 10]]));
      harness.advance(10_000);
      expect(harness.control({ type: 'END' }, 10_000)).toEqual([]);
      expect(harness.session.state).toBe('COMPLETED');
    });
  });

  it('resolves a pending boundary before applying the control', () => {
    const harness = createHarness(
      makeSteps([
        ['A', 10, 0],
        ['B', 10, 0],
      ]),
    );
    // The pause request arrives 5s after step A actually ended.
    harness.control({ type: 'PAUSE' }, 15_000);

    expect(harness.session.currentStepIndex).toBe(1);
    expect(harness.session.state).toBe('PAUSED_STEP');
    expect(remainingMs(harness.session, 15_000)).toBe(5_000);
  });
});
