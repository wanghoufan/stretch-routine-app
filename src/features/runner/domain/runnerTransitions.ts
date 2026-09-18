import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isPaused } from '../../../domain/session/RunnerState';
import type { RoutineStep } from '../../../domain/routine/RoutineStep';

/**
 * Phase transition helpers (T039).
 *
 * These functions only *build session states*; they never read the wall clock
 * themselves, so every transition stays deterministic and unit-testable.
 *
 * Phase model:
 * - `RUNNING_STEP` / `PAUSED_STEP`  -> `currentStepIndex` is the active step.
 * - `RUNNING_TRANSITION` / `PAUSED_TRANSITION` -> the transition that follows
 *   step `currentStepIndex - 1`; `currentStepIndex` is the step being prepared.
 */

export function hasStepAt(steps: readonly RoutineStep[], index: number): boolean {
  return index >= 0 && index < steps.length;
}

export function isFinalStepIndex(steps: readonly RoutineStep[], index: number): boolean {
  return index === steps.length - 1;
}

export function stepDurationMs(step: RoutineStep): number {
  return step.durationSec * 1000;
}

export function transitionDurationMs(step: RoutineStep): number {
  return step.transitionSec * 1000;
}

/** True when the step at `fromIndex` should be followed by a transition phase. */
export function shouldPlayTransition(steps: readonly RoutineStep[], fromIndex: number): boolean {
  const step = steps[fromIndex];
  if (!step) {
    return false;
  }
  return transitionDurationMs(step) > 0 && hasStepAt(steps, fromIndex + 1);
}

export interface PhaseOptions {
  /** ms of the previous phase that spilled past its boundary (background jumps). */
  overflowMs: number;
  nowMs: number;
  completedPhaseMs: number;
  /** Keep the paused flag across the phase change (skip while paused). */
  keepPaused: boolean;
}

function buildPhase(
  session: ActiveSession,
  options: PhaseOptions,
  state: ActiveSession['state'],
  pausedState: ActiveSession['state'],
  currentStepIndex: number,
  effectiveStepDurationMs: number,
  effectiveTransitionDurationMs: number,
): ActiveSession {
  const paused = options.keepPaused && isPaused(session.state);
  return {
    ...session,
    state: paused ? pausedState : state,
    currentStepIndex,
    // The overflow is carried forward so a long background gap does not shift
    // every following boundary by the amount that was missed.
    phaseStartedAtEpochMs: options.nowMs - Math.max(0, options.overflowMs),
    pausedAtEpochMs: paused ? options.nowMs : null,
    accumulatedPauseMs: 0,
    effectiveStepDurationMs,
    effectiveTransitionDurationMs,
    runtimeExtensionMs: 0,
    completedPhaseMs: options.completedPhaseMs,
    updatedAtEpochMs: options.nowMs,
  };
}

/** Begin a step phase for `index`, restarting its runtime-only extension. */
export function startStepPhase(
  session: ActiveSession,
  steps: readonly RoutineStep[],
  index: number,
  options: PhaseOptions,
): ActiveSession {
  const step = steps[index];
  if (!step) {
    throw new Error(`没有索引为 ${index} 的步骤`);
  }
  return buildPhase(
    session,
    options,
    'RUNNING_STEP',
    'PAUSED_STEP',
    index,
    stepDurationMs(step),
    transitionDurationMs(step),
  );
}

/** Begin the transition that follows `fromIndex` and prepares `fromIndex + 1`. */
export function startTransitionPhase(
  session: ActiveSession,
  steps: readonly RoutineStep[],
  fromIndex: number,
  options: PhaseOptions,
): ActiveSession {
  const fromStep = steps[fromIndex];
  const toStep = steps[fromIndex + 1];
  if (!fromStep || !toStep) {
    throw new Error(`索引 ${fromIndex} 之后没有可过渡的步骤`);
  }
  return buildPhase(
    session,
    options,
    'RUNNING_TRANSITION',
    'PAUSED_TRANSITION',
    fromIndex + 1,
    stepDurationMs(toStep),
    transitionDurationMs(fromStep),
  );
}

/** Mark the session finished. The safe, terminal end of a normal routine. */
export function completeSession(session: ActiveSession, nowMs: number): ActiveSession {
  return {
    ...session,
    state: 'COMPLETED',
    phaseStartedAtEpochMs: null,
    pausedAtEpochMs: null,
    runtimeExtensionMs: 0,
    completedPhaseMs: session.completedPhaseMs,
    updatedAtEpochMs: nowMs,
  };
}

/** End the routine early (user pressed 结束). */
export function stopSession(session: ActiveSession, nowMs: number): ActiveSession {
  return {
    ...session,
    state: 'STOPPED',
    phaseStartedAtEpochMs: null,
    pausedAtEpochMs: null,
    runtimeExtensionMs: 0,
    updatedAtEpochMs: nowMs,
  };
}

/** Mark an unrecoverable session problem; the UI offers a safe exit. */
export function failSession(session: ActiveSession, nowMs: number): ActiveSession {
  return {
    ...session,
    state: 'ERROR',
    phaseStartedAtEpochMs: null,
    pausedAtEpochMs: null,
    updatedAtEpochMs: nowMs,
  };
}
