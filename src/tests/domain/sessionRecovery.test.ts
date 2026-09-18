import { advanceRunner, startRunner } from '../../features/runner/domain/runnerMachine';
import {
  MAX_RECOVERY_AGE_MS,
  recoverSession,
} from '../../features/runner/services/sessionRecovery';
import { remainingMs } from '../../features/runner/domain/runnerTime';
import type { ActiveSession } from '../../domain/session/ActiveSession';
import { makeSteps } from '../support/fixtures';

const STEPS = makeSteps([
  ['A', 10, 5],
  ['B', 20, 0],
  ['C', 30, 0],
]);

function startSession(nowMs = 0): ActiveSession {
  return startRunner({ sessionId: 's1', routineId: 'routine-1', steps: STEPS, nowMs }).session;
}

describe('active session recovery (T061, T090)', () => {
  it('reports nothing to recover when no session is stored', () => {
    expect(recoverSession({ stored: null, steps: STEPS, nowMs: 0 })).toEqual({ kind: 'none' });
  });

  it('rebuilds the same step after a short lock-screen gap', () => {
    const stored = startSession(0);
    const outcome = recoverSession({ stored, steps: STEPS, nowMs: 4_000 });

    expect(outcome.kind).toBe('resumed');
    if (outcome.kind !== 'resumed') {
      return;
    }
    expect(outcome.session.currentStepIndex).toBe(0);
    expect(outcome.events).toEqual([]);
    expect(remainingMs(outcome.session, 4_000)).toBe(6_000);
  });

  it('catches up across boundaries crossed while backgrounded', () => {
    const stored = startSession(0);
    // The app was away for 40 seconds: step A, its transition, step B all passed.
    const outcome = recoverSession({ stored, steps: STEPS, nowMs: 40_000 });

    expect(outcome.kind).toBe('resumed');
    if (outcome.kind !== 'resumed') {
      return;
    }
    expect(outcome.session.state).toBe('RUNNING_STEP');
    expect(outcome.session.currentStepIndex).toBe(2);
    // Only the current step is announced; passed cues stay suppressed.
    expect(outcome.events).toEqual([
      { type: 'TRANSITION_STARTED', fromStepIndex: 0, toStepIndex: 1, suppressed: true },
      { type: 'STEP_STARTED', stepIndex: 1, suppressed: true },
      { type: 'STEP_STARTED', stepIndex: 2, suppressed: false },
    ]);
  });

  it('does not replay any cue when the app returns to the exact same phase', () => {
    const stored = startSession(0);
    const outcome = recoverSession({ stored, steps: STEPS, nowMs: 2_000 });
    expect(outcome.kind).toBe('resumed');
    if (outcome.kind === 'resumed') {
      expect(outcome.events).toEqual([]);
    }
  });

  it('completes immediately when the routine finished while away', () => {
    const stored = startSession(0);
    const outcome = recoverSession({ stored, steps: STEPS, nowMs: 200_000 });

    expect(outcome.kind).toBe('resumed');
    if (outcome.kind === 'resumed') {
      expect(outcome.session.state).toBe('COMPLETED');
    }
  });

  it('leaves a paused session exactly where it was', () => {
    const stored: ActiveSession = {
      ...startSession(0),
      state: 'PAUSED_STEP',
      pausedAtEpochMs: 4_000,
      accumulatedPauseMs: 0,
    };
    const outcome = recoverSession({ stored, steps: STEPS, nowMs: 600_000 });

    expect(outcome.kind).toBe('resumed');
    if (outcome.kind !== 'resumed') {
      return;
    }
    expect(outcome.session.state).toBe('PAUSED_STEP');
    expect(outcome.session.accumulatedPauseMs).toBe(0);
    expect(remainingMs(outcome.session, 600_000)).toBe(6_000);
  });

  it('discards a session whose step index no longer exists', () => {
    const stored: ActiveSession = { ...startSession(0), currentStepIndex: 9 };
    expect(recoverSession({ stored, steps: STEPS, nowMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'current step index is out of range',
    });
  });

  it('discards a session with no steps left', () => {
    const stored = startSession(0);
    const outcome = recoverSession({ stored, steps: [], nowMs: 1_000 });
    expect(outcome.kind).toBe('discarded');
  });

  it('discards an invalid duration instead of starting an ambiguous timer', () => {
    const stored: ActiveSession = { ...startSession(0), effectiveStepDurationMs: 0 };
    expect(recoverSession({ stored, steps: STEPS, nowMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'invalid step duration',
    });
  });

  it('discards a session with a missing phase timestamp', () => {
    const stored: ActiveSession = { ...startSession(0), phaseStartedAtEpochMs: null };
    expect(recoverSession({ stored, steps: STEPS, nowMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'missing phase start timestamp',
    });
  });

  it('discards a session whose phase started in the future beyond clock skew', () => {
    const stored: ActiveSession = { ...startSession(100_000), updatedAtEpochMs: 100_000 };
    const outcome = recoverSession({ stored, steps: STEPS, nowMs: 1_000 });
    expect(outcome).toEqual({ kind: 'discarded', reason: 'phase start is in the future' });
  });

  it('tolerates small clock skew', () => {
    const stored: ActiveSession = { ...startSession(5_000), updatedAtEpochMs: 5_000 };
    const outcome = recoverSession({ stored, steps: STEPS, nowMs: 3_000 });
    expect(outcome.kind).toBe('resumed');
  });

  it('discards a stale session instead of showing a late completion screen', () => {
    const stored = startSession(0);
    const outcome = recoverSession({
      stored: { ...stored, updatedAtEpochMs: 0 },
      steps: STEPS,
      nowMs: MAX_RECOVERY_AGE_MS + 1,
    });
    expect(outcome).toEqual({ kind: 'discarded', reason: 'session is stale' });
  });

  it('discards non-active stored states', () => {
    const stored: ActiveSession = { ...startSession(0), state: 'COMPLETED' };
    expect(recoverSession({ stored, steps: STEPS, nowMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'stored session is not active',
    });
  });

  it('is idempotent: recovering a recovered session changes nothing', () => {
    const stored = startSession(0);
    const first = recoverSession({ stored, steps: STEPS, nowMs: 40_000 });
    expect(first.kind).toBe('resumed');
    if (first.kind !== 'resumed') {
      return;
    }
    const second = advanceRunner(first.session, STEPS, 40_000);
    expect(second.session).toBe(first.session);
    expect(second.events).toEqual([]);
  });
});
