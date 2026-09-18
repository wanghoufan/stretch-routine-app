import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isActive, isPaused, isRunning, togglePauseState } from '../../../domain/session/RunnerState';
import type { RoutineStep } from '../../../domain/routine/RoutineStep';
import { ADD_TIME_MS } from '../../../domain/routine/constants';
import { RunnerError } from '../../../shared/errors';
import { phaseElapsedMs, phaseTotalMs, plannedCompletedMsBefore } from './runnerTime';
import {
  completeSession,
  shouldPlayTransition,
  startStepPhase,
  startTransitionPhase,
  stopSession,
} from './runnerTransitions';

/**
 * Pure runner state machine (Constitution §3.2/§3.3, PLAN §5, §7).
 *
 * The machine is a set of pure functions: given the current session, the
 * routine steps and an explicit `nowMs`, it returns the next session plus the
 * events the cue coordinator may speak. It never touches a timer, the UI or
 * TTS, which is what keeps runner behaviour deterministic and testable.
 */

export type RunnerEvent =
  | { type: 'STEP_STARTED'; stepIndex: number; suppressed: boolean }
  | { type: 'TRANSITION_STARTED'; fromStepIndex: number; toStepIndex: number; suppressed: boolean }
  | { type: 'COMPLETED' }
  | { type: 'STOPPED' };

export interface RunnerResult {
  session: ActiveSession;
  events: RunnerEvent[];
}

export type RunnerControl =
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ADD_TIME'; ms?: number }
  | { type: 'PREVIOUS' }
  | { type: 'SKIP' }
  | { type: 'END' };

export interface StartRunnerInput {
  sessionId: string;
  routineId: string;
  steps: readonly RoutineStep[];
  nowMs: number;
}

/** Start a routine at step 0 (SPEC US1 scenario 1). */
export function startRunner(input: StartRunnerInput): RunnerResult {
  if (input.steps.length === 0) {
    throw new RunnerError('流程没有可播放的步骤');
  }
  const first = input.steps[0];
  if (!first) {
    throw new RunnerError('流程没有可播放的步骤');
  }

  const session: ActiveSession = {
    sessionId: input.sessionId,
    routineId: input.routineId,
    state: 'RUNNING_STEP',
    currentStepIndex: 0,
    phaseStartedAtEpochMs: input.nowMs,
    pausedAtEpochMs: null,
    accumulatedPauseMs: 0,
    effectiveStepDurationMs: first.durationSec * 1000,
    effectiveTransitionDurationMs: first.transitionSec * 1000,
    runtimeExtensionMs: 0,
    completedPhaseMs: 0,
    updatedAtEpochMs: input.nowMs,
  };

  return { session, events: [{ type: 'STEP_STARTED', stepIndex: 0, suppressed: false }] };
}

/**
 * Resolve every phase boundary that `nowMs` has already crossed.
 *
 * A single call can cross several boundaries at once — that is exactly what
 * happens after the app sat in the background for a few minutes. Intermediate
 * step cues are marked `suppressed` so recovery never replays stale speech.
 */
export function advanceRunner(
  session: ActiveSession,
  steps: readonly RoutineStep[],
  nowMs: number,
): RunnerResult {
  if (steps.length === 0 || !isRunning(session.state)) {
    return { session, events: [] };
  }

  const batches: RunnerEvent[][] = [];
  const guard = steps.length * 2 + 4;
  let current = session;

  while (batches.length < guard && isRunning(current.state)) {
    const total = phaseTotalMs(current);
    const elapsed = phaseElapsedMs(current, nowMs);
    if (elapsed < total) {
      break;
    }

    const overflowMs = Math.max(0, elapsed - total);
    const completedPhaseMs = current.completedPhaseMs + total;
    const batch: RunnerEvent[] = [];

    if (current.state === 'RUNNING_STEP') {
      const fromIndex = current.currentStepIndex;
      const nextIndex = fromIndex + 1;

      if (shouldPlayTransition(steps, fromIndex)) {
        current = startTransitionPhase(current, steps, fromIndex, {
          overflowMs,
          nowMs,
          completedPhaseMs,
          keepPaused: false,
        });
        batch.push({
          type: 'TRANSITION_STARTED',
          fromStepIndex: fromIndex,
          toStepIndex: nextIndex,
          suppressed: false,
        });
      } else if (nextIndex < steps.length) {
        current = startStepPhase(current, steps, nextIndex, {
          overflowMs,
          nowMs,
          completedPhaseMs,
          keepPaused: false,
        });
        batch.push({ type: 'STEP_STARTED', stepIndex: nextIndex, suppressed: false });
      } else {
        // The final step must still count towards the routine's elapsed time.
        current = completeSession({ ...current, completedPhaseMs }, nowMs);
        batch.push({ type: 'COMPLETED' });
      }
    } else {
      // Transition finished: enter the step it was preparing.
      const targetIndex = current.currentStepIndex;
      if (targetIndex >= steps.length) {
        current = completeSession({ ...current, completedPhaseMs }, nowMs);
        batch.push({ type: 'COMPLETED' });
      } else {
        current = startStepPhase(current, steps, targetIndex, {
          overflowMs,
          nowMs,
          completedPhaseMs,
          keepPaused: false,
        });
        batch.push({ type: 'STEP_STARTED', stepIndex: targetIndex, suppressed: false });
      }
    }

    batches.push(batch);
  }

  const lastBatchIndex = batches.length - 1;
  const events: RunnerEvent[] = [];
  batches.forEach((batch, batchIndex) => {
    const suppressed = batchIndex < lastBatchIndex;
    for (const event of batch) {
      events.push(
        event.type === 'COMPLETED' || event.type === 'STOPPED' ? event : { ...event, suppressed },
      );
    }
  });

  return { session: current, events };
}

function applyPause(session: ActiveSession, nowMs: number): ActiveSession {
  if (!isRunning(session.state)) {
    return session;
  }
  return {
    ...session,
    state: togglePauseState(session.state),
    pausedAtEpochMs: nowMs,
    updatedAtEpochMs: nowMs,
  };
}

/**
 * Resume the exact prior phase by folding the pause length into
 * `accumulatedPauseMs`; `phaseStartedAtEpochMs` never moves (PLAN §5 rule 5).
 */
function applyResume(session: ActiveSession, nowMs: number): ActiveSession {
  if (!isPaused(session.state)) {
    return session;
  }
  const pausedFor = session.pausedAtEpochMs === null ? 0 : Math.max(0, nowMs - session.pausedAtEpochMs);
  return {
    ...session,
    state: togglePauseState(session.state),
    pausedAtEpochMs: null,
    accumulatedPauseMs: session.accumulatedPauseMs + pausedFor,
    updatedAtEpochMs: nowMs,
  };
}

/** +10s: extend the current step at runtime only (SPEC US5 scenario 2). */
function applyAddTime(session: ActiveSession, nowMs: number, extensionMs: number): ActiveSession {
  if (session.state !== 'RUNNING_STEP' && session.state !== 'PAUSED_STEP') {
    return session;
  }
  const safeExtension = Math.max(0, Math.round(extensionMs));
  return {
    ...session,
    effectiveStepDurationMs: session.effectiveStepDurationMs + safeExtension,
    runtimeExtensionMs: session.runtimeExtensionMs + safeExtension,
    updatedAtEpochMs: nowMs,
  };
}

/** Previous: restart the previous step at its full saved duration (PLAN §7). */
function applyPrevious(
  session: ActiveSession,
  steps: readonly RoutineStep[],
  nowMs: number,
): RunnerResult {
  const targetIndex = session.currentStepIndex - 1;
  if (targetIndex < 0) {
    // Defined no-op on the first step (SPEC edge cases).
    return { session, events: [] };
  }
  const next = startStepPhase(session, steps, targetIndex, {
    overflowMs: 0,
    nowMs,
    completedPhaseMs: plannedCompletedMsBefore(steps, targetIndex),
    keepPaused: isPaused(session.state),
  });
  return { session: next, events: [{ type: 'STEP_STARTED', stepIndex: targetIndex, suppressed: false }] };
}

/** Skip/Next: end the current phase now and move on (PLAN §7). */
function applySkip(
  session: ActiveSession,
  steps: readonly RoutineStep[],
  nowMs: number,
): RunnerResult {
  const keepPaused = isPaused(session.state);
  const elapsedContribMs = phaseElapsedMs(session, nowMs);
  const completedPhaseMs = session.completedPhaseMs + elapsedContribMs;

  // Skipping during a transition means "stop waiting, start the prepared step".
  const targetIndex =
    session.state === 'RUNNING_TRANSITION' || session.state === 'PAUSED_TRANSITION'
      ? session.currentStepIndex
      : session.currentStepIndex + 1;

  if (targetIndex >= steps.length) {
    return {
      session: completeSession({ ...session, completedPhaseMs }, nowMs),
      events: [{ type: 'COMPLETED' }],
    };
  }

  const next = startStepPhase(session, steps, targetIndex, {
    overflowMs: 0,
    nowMs,
    completedPhaseMs,
    keepPaused,
  });
  return { session: next, events: [{ type: 'STEP_STARTED', stepIndex: targetIndex, suppressed: false }] };
}

/**
 * Apply a user control. Any pending boundary is resolved first, so a control
 * can never land on a stale phase.
 */
export function applyRunnerControl(
  session: ActiveSession,
  steps: readonly RoutineStep[],
  control: RunnerControl,
  nowMs: number,
): RunnerResult {
  const ticked = advanceRunner(session, steps, nowMs);
  const base = ticked.session;
  const events = [...ticked.events];

  switch (control.type) {
    case 'PAUSE':
      return { session: applyPause(base, nowMs), events };

    case 'RESUME': {
      const resumed = applyResume(base, nowMs);
      const afterResume = advanceRunner(resumed, steps, nowMs);
      return { session: afterResume.session, events: [...events, ...afterResume.events] };
    }

    case 'ADD_TIME':
      return { session: applyAddTime(base, nowMs, control.ms ?? ADD_TIME_MS), events };

    case 'PREVIOUS': {
      if (!isActive(base.state)) {
        return { session: base, events };
      }
      const result = applyPrevious(base, steps, nowMs);
      return { session: result.session, events: [...events, ...result.events] };
    }

    case 'SKIP': {
      if (!isActive(base.state)) {
        return { session: base, events };
      }
      const result = applySkip(base, steps, nowMs);
      return { session: result.session, events: [...events, ...result.events] };
    }

    case 'END': {
      if (!isActive(base.state)) {
        return { session: base, events };
      }
      return { session: stopSession(base, nowMs), events: [...events, { type: 'STOPPED' }] };
    }

    default:
      return { session: base, events };
  }
}
