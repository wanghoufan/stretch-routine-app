import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isPaused } from '../../../domain/session/RunnerState';
import type { RoutineStep } from '../../../domain/routine/RoutineStep';
import { totalDurationSec } from '../../../domain/routine/duration';

/**
 * Timestamp-based timing math (Constitution V, PLAN §5, FR-027).
 *
 * `remaining = duration - effectiveElapsedTime`, where the effective elapsed
 * time is derived from timestamps and completed pauses. Nothing in this file
 * depends on how many interval callbacks the platform delivered.
 */

/**
 * Elapsed time inside the current phase.
 *
 * While paused the reference is `pausedAtEpochMs`, so effective elapsed time
 * freezes no matter how much real time passes.
 */
export function phaseElapsedMs(session: ActiveSession, nowMs: number): number {
  if (session.phaseStartedAtEpochMs === null) {
    return 0;
  }
  const referenceNow = isPaused(session.state) && session.pausedAtEpochMs !== null
    ? session.pausedAtEpochMs
    : nowMs;
  const elapsed = referenceNow - session.phaseStartedAtEpochMs - session.accumulatedPauseMs;
  return Math.max(0, elapsed);
}

/** The nominal length of the current phase, including any runtime extension. */
export function phaseTotalMs(session: ActiveSession): number {
  switch (session.state) {
    case 'RUNNING_STEP':
    case 'PAUSED_STEP':
      return session.effectiveStepDurationMs;
    case 'RUNNING_TRANSITION':
    case 'PAUSED_TRANSITION':
      return session.effectiveTransitionDurationMs;
    default:
      return 0;
  }
}

/** Remaining time in the current phase; never negative. */
export function remainingMs(session: ActiveSession, nowMs: number): number {
  return Math.max(0, phaseTotalMs(session) - phaseElapsedMs(session, nowMs));
}

/** Remaining time rounded up to whole seconds, for display and cue decisions. */
export function remainingSec(session: ActiveSession, nowMs: number): number {
  return Math.ceil(remainingMs(session, nowMs) / 1000);
}

/** Routine time already completed, including the part of the current phase. */
export function routineElapsedMs(session: ActiveSession, nowMs: number): number {
  return session.completedPhaseMs + phaseElapsedMs(session, nowMs);
}

/** Planned routine length in ms, from saved values (runtime +10 excluded). */
export function routineTotalMs(steps: readonly RoutineStep[]): number {
  return totalDurationSec(steps) * 1000;
}

/** 0..1 progress used by the runner progress bar. */
export function routineProgress(session: ActiveSession, steps: readonly RoutineStep[], nowMs: number): number {
  const total = routineTotalMs(steps);
  if (total <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, routineElapsedMs(session, nowMs) / total));
}

/** Step the runner is currently on (or heading into, during a transition). */
export function currentStep(
  steps: readonly RoutineStep[],
  session: ActiveSession,
): RoutineStep | undefined {
  return steps[session.currentStepIndex];
}

/** The step that will play after the current one, when there is one. */
export function upcomingStep(
  steps: readonly RoutineStep[],
  session: ActiveSession,
): RoutineStep | undefined {
  if (session.state === 'RUNNING_TRANSITION' || session.state === 'PAUSED_TRANSITION') {
    return steps[session.currentStepIndex];
  }
  return steps[session.currentStepIndex + 1];
}

/** Step that just finished. Only meaningful during a transition. */
export function previousStep(
  steps: readonly RoutineStep[],
  session: ActiveSession,
): RoutineStep | undefined {
  const index = session.currentStepIndex - 1;
  return index >= 0 ? steps[index] : undefined;
}

/**
 * Planned ms of step + transition phases that come strictly before `index`.
 * Used by Previous, which restarts a step at its full saved duration.
 */
export function plannedCompletedMsBefore(steps: readonly RoutineStep[], index: number): number {
  let total = 0;
  for (let i = 0; i < index && i < steps.length; i += 1) {
    const step = steps[i];
    if (!step) {
      break;
    }
    total += step.durationSec * 1000;
    const isLast = i === steps.length - 1;
    if (!isLast) {
      total += step.transitionSec * 1000;
    }
  }
  return total;
}
