import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isActive, isRunning } from '../../../domain/session/RunnerState';
import { advanceRunner, type RunnerEvent } from '../domain/runnerMachine';
import { isConservativeTermination, type TerminationSignal } from '../../../services/runtime/Termination';

/**
 * Reconstruction of runner state from an authoritative ActiveSession (R012).
 *
 * Inputs and rules (PRODUCT_PLAN_V1.2 Termination policy + Technical Approach):
 * 1. Same boot  -> the monotonic elapsed values are valid; catch up with them.
 *    The wall clock is never read, so a wall-clock jump of any size is ignored.
 * 2. Boot change -> the elapsed origin is gone; the session is discarded
 *    (fail-safe), never resumed on meaningless numbers.
 * 3. Conservative termination signal (`REASON_USER_REQUESTED`, or no
 *    trustworthy signal at all on API < 30 / native unavailable) -> the session
 *    may be reconstructed but MUST NOT auto-announce; only an explicit
 *    Start/Continue may resume playback.
 * 4. Any structurally impossible row is discarded instead of starting an
 *    ambiguous timer (PLAN §15).
 *
 * Steps always come from `stored.snapshot` — recovery never re-reads the source
 * Routine, which is what lets a session survive its routine being edited or
 * deleted (R019/R021).
 */

/**
 * A same-boot session whose last monotonic update is older than this is treated
 * as abandoned rather than resumed: the user is not shown a completion screen
 * for a routine they finished hours ago. Monotonic, so wall jumps cannot fake
 * staleness in either direction.
 */
export const MAX_RECOVERY_AGE_MS = 12 * 60 * 60 * 1000;

export interface RecoveryInput {
  stored: ActiveSession | null;
  /** Monotonic elapsed ms now (`MonotonicClock`). */
  nowElapsedMs: number;
  /** Boot identity of the current process (`BootInfoProvider`). */
  currentBootCount: number;
  /** Last process exit signal (`ProcessTerminationProvider`). */
  termination: TerminationSignal;
}

export type RecoveryOutcome =
  | { kind: 'none' }
  /**
   * `autoPlay: false` means the session may be shown/continued but must not
   * speak automatically (conservative termination signal / API < 30 fail-safe).
   */
  | { kind: 'resumed'; session: ActiveSession; events: RunnerEvent[]; autoPlay: boolean }
  | { kind: 'discarded'; reason: string };

export function recoverSession(input: RecoveryInput): RecoveryOutcome {
  const { stored, nowElapsedMs, currentBootCount, termination } = input;

  if (!stored) {
    return { kind: 'none' };
  }
  if (!isActive(stored.state)) {
    return { kind: 'discarded', reason: 'stored session is not active' };
  }

  // Rule 2: a different boot means `phaseStartedElapsedMs` etc. are relative to
  // an origin that no longer exists. Never interpret them.
  if (stored.bootCount !== currentBootCount) {
    return { kind: 'discarded', reason: 'boot count changed' };
  }

  const steps = stored.snapshot.steps;
  if (steps.length === 0) {
    return { kind: 'discarded', reason: 'snapshot has no steps' };
  }
  if (stored.currentStepIndex < 0 || stored.currentStepIndex >= steps.length) {
    return { kind: 'discarded', reason: 'current step index is out of range' };
  }
  if (!Number.isFinite(stored.effectiveStepDurationMs) || stored.effectiveStepDurationMs <= 0) {
    return { kind: 'discarded', reason: 'invalid step duration' };
  }
  if (stored.phaseStartedElapsedMs === null) {
    return { kind: 'discarded', reason: 'missing phase start timestamp' };
  }
  if (stored.phaseStartedElapsedMs > nowElapsedMs) {
    return { kind: 'discarded', reason: 'phase start is in the future' };
  }
  if (nowElapsedMs - stored.lastUpdatedElapsedMs > MAX_RECOVERY_AGE_MS) {
    return { kind: 'discarded', reason: 'session is stale' };
  }

  // A paused session does not advance while away; a running one catches up.
  const caughtUp = isRunning(stored.state)
    ? advanceRunner(stored, steps, nowElapsedMs)
    : { session: stored, events: [] as RunnerEvent[] };

  const autoPlay = !isConservativeTermination(termination);

  return { kind: 'resumed', session: caughtUp.session, events: caughtUp.events, autoPlay };
}
