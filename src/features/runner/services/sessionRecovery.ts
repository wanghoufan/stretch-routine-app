import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isActive, isRunning } from '../../../domain/session/RunnerState';
import type { RoutineStep } from '../../../domain/routine/RoutineStep';
import { advanceRunner, type RunnerEvent } from '../domain/runnerMachine';

/**
 * Reconstruction of runner state from timestamps after the app was backgrounded,
 * the screen was locked, or the process/UI was recreated (T058, T090, FR-030,
 * FR-032).
 *
 * The stored session is the only input that matters: time is re-derived, never
 * replayed. If the stored row is impossible, we fail safe to a non-running
 * state instead of starting an ambiguous timer (PLAN §15).
 */

/**
 * A stored session older than this is treated as abandoned rather than
 * resumed: the user is not shown a completion screen for a routine they
 * finished days ago.
 */
export const MAX_RECOVERY_AGE_MS = 12 * 60 * 60 * 1000;

export interface RecoveryInput {
  stored: ActiveSession | null;
  steps: readonly RoutineStep[];
  nowMs: number;
  /** Allow a small clock skew between a stored timestamp and `nowMs`. */
  clockSkewMs?: number;
}

export type RecoveryOutcome =
  | { kind: 'none' }
  | { kind: 'resumed'; session: ActiveSession; events: RunnerEvent[] }
  | { kind: 'discarded'; reason: string };

export function recoverSession(input: RecoveryInput): RecoveryOutcome {
  const { stored, steps, nowMs } = input;
  const skew = input.clockSkewMs ?? 5_000;

  if (!stored) {
    return { kind: 'none' };
  }
  if (!isActive(stored.state)) {
    return { kind: 'discarded', reason: 'stored session is not active' };
  }
  if (steps.length === 0) {
    return { kind: 'discarded', reason: 'routine has no steps' };
  }
  if (stored.currentStepIndex < 0 || stored.currentStepIndex >= steps.length) {
    return { kind: 'discarded', reason: 'current step index is out of range' };
  }
  if (!Number.isFinite(stored.effectiveStepDurationMs) || stored.effectiveStepDurationMs <= 0) {
    return { kind: 'discarded', reason: 'invalid step duration' };
  }
  if (stored.phaseStartedAtEpochMs === null) {
    return { kind: 'discarded', reason: 'missing phase start timestamp' };
  }
  if (stored.phaseStartedAtEpochMs > nowMs + skew) {
    return { kind: 'discarded', reason: 'phase start is in the future' };
  }
  if (nowMs - stored.updatedAtEpochMs > MAX_RECOVERY_AGE_MS) {
    return { kind: 'discarded', reason: 'session is stale' };
  }

  // A paused session does not advance while away; a running one catches up.
  const caughtUp = isRunning(stored.state)
    ? advanceRunner(stored, steps, nowMs)
    : { session: stored, events: [] as RunnerEvent[] };

  return { kind: 'resumed', session: caughtUp.session, events: caughtUp.events };
}
