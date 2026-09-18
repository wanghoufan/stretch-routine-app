import { advanceRunner, startRunner } from '../../features/runner/domain/runnerMachine';
import { MAX_RECOVERY_AGE_MS, recoverSession } from '../../features/runner/services/sessionRecovery';
import { remainingMs } from '../../features/runner/domain/runnerTime';
import type { ActiveSession } from '../../domain/session/ActiveSession';
import { FakeClock, FakeMonotonicClock } from '../../services/clock';
import {
  USER_REQUESTED_REASON,
  isConservativeTermination,
  type TerminationSignal,
} from '../../services/runtime/Termination';
import { makeSteps } from '../support/fixtures';

const STEPS = makeSteps([
  ['A', 10, 5],
  ['B', 20, 0],
  ['C', 30, 0],
]);

const BOOT = 7;
const TRUSTED: TerminationSignal = { trusted: true, lastReason: null };
const USER_REQUESTED: TerminationSignal = { trusted: true, lastReason: USER_REQUESTED_REASON };
/** API < 30 / native unavailable: no trustworthy signal at all. */
const UNTRUSTED: TerminationSignal = { trusted: false, lastReason: null };

function startSession(nowElapsedMs = 0): ActiveSession {
  return startRunner({
    sessionId: 's1',
    routineId: 'routine-1',
    routineName: '测试流程',
    steps: STEPS,
    nowElapsedMs,
    wallMs: 1_700_000_000_000,
    bootCount: BOOT,
  }).session;
}

function recover(overrides: Partial<Parameters<typeof recoverSession>[0]> = {}) {
  return recoverSession({
    stored: startSession(0),
    nowElapsedMs: 0,
    currentBootCount: BOOT,
    termination: TRUSTED,
    ...overrides,
  });
}

describe('active session recovery (T061, T090, R012)', () => {
  it('reports nothing to recover when no session is stored', () => {
    expect(recover({ stored: null })).toEqual({ kind: 'none' });
  });

  it('rebuilds the same step after a short lock-screen gap', () => {
    const outcome = recover({ nowElapsedMs: 4_000 });

    expect(outcome.kind).toBe('resumed');
    if (outcome.kind !== 'resumed') {
      return;
    }
    expect(outcome.session.currentStepIndex).toBe(0);
    expect(outcome.events).toEqual([]);
    expect(outcome.autoPlay).toBe(true);
    expect(remainingMs(outcome.session, 4_000)).toBe(6_000);
  });

  it('catches up across boundaries crossed while backgrounded', () => {
    const outcome = recover({ nowElapsedMs: 40_000 });

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
    const outcome = recover({ nowElapsedMs: 2_000 });
    expect(outcome.kind).toBe('resumed');
    if (outcome.kind === 'resumed') {
      expect(outcome.events).toEqual([]);
    }
  });

  it('completes immediately when the routine finished while away', () => {
    const outcome = recover({ nowElapsedMs: 200_000 });
    expect(outcome.kind).toBe('resumed');
    if (outcome.kind === 'resumed') {
      expect(outcome.session.state).toBe('COMPLETED');
    }
  });

  it('leaves a paused session exactly where it was', () => {
    const stored: ActiveSession = {
      ...startSession(0),
      state: 'PAUSED_STEP',
      pausedAtElapsedMs: 4_000,
      accumulatedPauseMs: 0,
    };
    const outcome = recover({ stored, nowElapsedMs: 600_000 });

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
    expect(recover({ stored, nowElapsedMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'current step index is out of range',
    });
  });

  it('discards an invalid duration instead of starting an ambiguous timer', () => {
    const stored: ActiveSession = { ...startSession(0), effectiveStepDurationMs: 0 };
    expect(recover({ stored, nowElapsedMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'invalid step duration',
    });
  });

  it('discards a session with a missing phase timestamp', () => {
    const stored: ActiveSession = { ...startSession(0), phaseStartedElapsedMs: null };
    expect(recover({ stored, nowElapsedMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'missing phase start timestamp',
    });
  });

  it('discards a session whose phase started after the current elapsed time', () => {
    const stored: ActiveSession = { ...startSession(100_000), lastUpdatedElapsedMs: 100_000 };
    expect(recover({ stored, nowElapsedMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'phase start is in the future',
    });
  });

  it('discards a stale session instead of showing a late completion screen', () => {
    const stored = startSession(0);
    const outcome = recover({
      stored: { ...stored, lastUpdatedElapsedMs: 0 },
      nowElapsedMs: MAX_RECOVERY_AGE_MS + 1,
    });
    expect(outcome).toEqual({ kind: 'discarded', reason: 'session is stale' });
  });

  it('discards non-active stored states', () => {
    const stored: ActiveSession = { ...startSession(0), state: 'COMPLETED' };
    expect(recover({ stored, nowElapsedMs: 1_000 })).toEqual({
      kind: 'discarded',
      reason: 'stored session is not active',
    });
  });

  it('is idempotent: recovering a recovered session changes nothing', () => {
    const first = recover({ nowElapsedMs: 40_000 });
    expect(first.kind).toBe('resumed');
    if (first.kind !== 'resumed') {
      return;
    }
    const second = advanceRunner(first.session, STEPS, 40_000);
    expect(second.session).toBe(first.session);
    expect(second.events).toEqual([]);
  });
});

describe('recovery V2 — boot, wall clock and termination policy (R012)', () => {
  it('discards a session from a previous boot instead of trusting its elapsed origin', () => {
    expect(recover({ currentBootCount: BOOT + 1 })).toEqual({
      kind: 'discarded',
      reason: 'boot count changed',
    });
  });

  it('ignores wall-clock jumps: ±1h and ±1d do not move the countdown', () => {
    const wall = new FakeClock(1_700_000_000_000);
    const monotonic = new FakeMonotonicClock(0);
    const session = startRunner({
      sessionId: 's1',
      routineId: 'routine-1',
      routineName: '测试流程',
      steps: STEPS,
      nowElapsedMs: monotonic.nowElapsedMs(),
      wallMs: wall.nowMs(),
      bootCount: BOOT,
    }).session;

    monotonic.advance(4_000);
    expect(remainingMs(session, monotonic.nowElapsedMs())).toBe(6_000);

    // The user travels / the network syncs the clock: a full hour forward.
    wall.advance(60 * 60 * 1000);
    expect(remainingMs(session, monotonic.nowElapsedMs())).toBe(6_000);

    // ...then a day backwards for good measure.
    wall.advance(-24 * 60 * 60 * 1000);
    expect(remainingMs(session, monotonic.nowElapsedMs())).toBe(6_000);
  });

  it('does not auto-play after a conservative REASON_USER_REQUESTED signal', () => {
    const outcome = recover({ termination: USER_REQUESTED });
    expect(outcome.kind).toBe('resumed');
    if (outcome.kind === 'resumed') {
      expect(outcome.autoPlay).toBe(false);
    }
  });

  it('fails safe (no auto-play) when no trustworthy termination signal exists (API < 30)', () => {
    const outcome = recover({ termination: UNTRUSTED });
    expect(outcome.kind).toBe('resumed');
    if (outcome.kind === 'resumed') {
      expect(outcome.autoPlay).toBe(false);
    }
  });

  it('classifies termination signals conservatively', () => {
    expect(isConservativeTermination(TRUSTED)).toBe(false);
    expect(isConservativeTermination(USER_REQUESTED)).toBe(true);
    expect(isConservativeTermination(UNTRUSTED)).toBe(true);
    expect(isConservativeTermination({ trusted: true, lastReason: 'REASON_OTHER' })).toBe(false);
  });

  it('drives playback from the snapshot, so a deleted source routine cannot matter', () => {
    // The snapshot carries its own steps; recovery never consults a repository.
    const stored = startSession(0);
    const outcome = recover({ stored, nowElapsedMs: 40_000 });
    expect(outcome.kind).toBe('resumed');
    if (outcome.kind === 'resumed') {
      expect(outcome.session.snapshot.steps.map((step) => step.displayName)).toEqual([
        'A',
        'B',
        'C',
      ]);
    }
  });
});
