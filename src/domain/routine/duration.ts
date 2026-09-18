import type { RoutineStep } from './RoutineStep';

/**
 * Total routine duration (T022).
 *
 * A routine of N steps has N step phases and N-1 transitions: no transition is
 * played after the final step, because the runner goes straight to COMPLETED.
 */

/** Total playback seconds for an already-ordered step list. */
export function totalDurationSec(steps: readonly RoutineStep[]): number {
  return steps.reduce((total, step, index) => {
    const isLast = index === steps.length - 1;
    return total + step.durationSec + (isLast ? 0 : step.transitionSec);
  }, 0);
}

export type RoutinePhaseKind = 'step' | 'transition';

export interface RoutinePhase {
  kind: RoutinePhaseKind;
  /** Index of the step this phase belongs to. */
  stepIndex: number;
  durationSec: number;
}

/**
 * Expand a routine into its ordered playback phases. Used by duration tests and
 * by the runner tests to assert boundary ordering.
 */
export function buildPhasePlan(steps: readonly RoutineStep[]): RoutinePhase[] {
  const phases: RoutinePhase[] = [];
  steps.forEach((step, index) => {
    phases.push({ kind: 'step', stepIndex: index, durationSec: step.durationSec });
    const isLast = index === steps.length - 1;
    if (!isLast && step.transitionSec > 0) {
      phases.push({ kind: 'transition', stepIndex: index, durationSec: step.transitionSec });
    }
  });
  return phases;
}

/** Sum of the step durations only (no transitions). */
export function totalStepDurationSec(steps: readonly RoutineStep[]): number {
  return steps.reduce((total, step) => total + step.durationSec, 0);
}

/** Sum of the transitions actually played (excludes the final step). */
export function totalTransitionDurationSec(steps: readonly RoutineStep[]): number {
  return steps.reduce((total, step, index) => {
    const isLast = index === steps.length - 1;
    return total + (isLast ? 0 : step.transitionSec);
  }, 0);
}
