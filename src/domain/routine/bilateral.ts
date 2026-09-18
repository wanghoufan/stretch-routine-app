import type { Action } from '../action/Action';
import { generateId, type IdGenerator } from '../../shared/utils/id';
import type { RoutineStepDraft, StepSide } from './RoutineStep';

/**
 * Bilateral / left-right pairing rules (Constitution IX, PLAN §12).
 *
 * A bilateral Action expands into two ordered steps that share one
 * `pairGroupId`, so paired editing can find the sibling while a deliberate
 * one-side override stays possible (SPEC US4 scenario 3).
 */

export const LEFT_SPEAK_PREFIX = '左侧';
export const RIGHT_SPEAK_PREFIX = '右侧';

export interface BilateralNames {
  leftDisplayName: string;
  rightDisplayName: string;
  leftSpeakText: string;
  rightSpeakText: string;
}

/** Predictable, editable naming: `肩部拉伸（左）` / `肩部拉伸（右）`. */
export function buildBilateralNames(actionName: string): BilateralNames {
  const base = actionName.trim();
  return {
    leftDisplayName: `${base}（左）`,
    rightDisplayName: `${base}（右）`,
    leftSpeakText: `${LEFT_SPEAK_PREFIX}${base}`,
    rightSpeakText: `${RIGHT_SPEAK_PREFIX}${base}`,
  };
}

export interface BilateralStepOptions {
  /** Transition applied to both sides; the pair keeps symmetrical timing. */
  transitionSec: number;
  /** Used when the Action has no usable default duration. */
  fallbackDurationSec: number;
  generateId?: IdGenerator;
  /** Optional explicit pair id, e.g. when re-generating an existing pair. */
  pairGroupId?: string;
}

/**
 * Build the two snapshot steps for a bilateral Action. Each side is its own
 * snapshot: editing the Action later must not rewrite either step.
 */
export function createBilateralStepDrafts(
  action: Pick<Action, 'id' | 'name' | 'defaultDurationSec' | 'defaultSpeakText'>,
  options: BilateralStepOptions,
): [RoutineStepDraft, RoutineStepDraft] {
  const nextId = options.generateId ?? generateId;
  const pairGroupId = options.pairGroupId ?? nextId('pair');
  const names = buildBilateralNames(action.name);
  const durationSec =
    action.defaultDurationSec > 0 ? action.defaultDurationSec : options.fallbackDurationSec;
  const speakBase = action.defaultSpeakText?.trim();

  const make = (
    side: Exclude<StepSide, 'none'>,
    displayName: string,
    defaultSpeakText: string,
  ): RoutineStepDraft => ({
    id: nextId('step'),
    sourceActionId: action.id,
    displayName,
    speakText: speakBase ? `${side === 'left' ? LEFT_SPEAK_PREFIX : RIGHT_SPEAK_PREFIX}${speakBase}` : defaultSpeakText,
    durationSec,
    transitionSec: options.transitionSec,
    pairGroupId,
    side,
  });

  return [
    make('left', names.leftDisplayName, names.leftSpeakText),
    make('right', names.rightDisplayName, names.rightSpeakText),
  ];
}

/** Minimal shape every pairing helper needs; satisfied by both step types. */
export interface PairAwareStep {
  id: string;
  pairGroupId?: string;
  side: StepSide;
  displayName: string;
  speakText: string;
  durationSec: number;
  transitionSec: number;
}

/** True when the step belongs to a bilateral pair. */
export function isPairedStep(step: Pick<PairAwareStep, 'pairGroupId' | 'side'>): boolean {
  return step.side !== 'none' && Boolean(step.pairGroupId);
}

/** The other side of the pair, if it is still present in the routine. */
export function findPairMate<T extends PairAwareStep>(
  steps: readonly T[],
  step: Pick<PairAwareStep, 'id' | 'pairGroupId' | 'side'>,
): T | undefined {
  if (!isPairedStep(step)) {
    return undefined;
  }
  return steps.find(
    (candidate) => candidate.id !== step.id && candidate.pairGroupId === step.pairGroupId,
  );
}

/**
 * "Edit both sides": apply compatible values (duration, transition) to the
 * whole pair. Display name and spoken text stay side-specific so left and
 * right remain distinguishable while timing stays symmetrical.
 */
export function updatePairValues<T extends PairAwareStep>(
  steps: readonly T[],
  pairGroupId: string,
  values: { durationSec?: number; transitionSec?: number },
): T[] {
  return steps.map((step) =>
    step.pairGroupId === pairGroupId
      ? ({
          ...step,
          durationSec: values.durationSec ?? step.durationSec,
          transitionSec: values.transitionSec ?? step.transitionSec,
        } as T)
      : step,
  );
}

/**
 * "Edit this side": override one side only. Pair metadata is preserved so the
 * intentional difference survives (SPEC US4 scenario 3).
 */
export function updateSingleSide<T extends PairAwareStep>(
  steps: readonly T[],
  stepId: string,
  values: Partial<Pick<PairAwareStep, 'displayName' | 'speakText' | 'durationSec' | 'transitionSec'>>,
): T[] {
  return steps.map((step) => (step.id === stepId ? ({ ...step, ...values } as T) : step));
}

/** True when every side of a pair currently shares the same duration. */
export function isPairSymmetric(
  steps: readonly Pick<PairAwareStep, 'pairGroupId' | 'durationSec'>[],
  pairGroupId: string,
): boolean {
  const durations = steps
    .filter((step) => step.pairGroupId === pairGroupId)
    .map((step) => step.durationSec);
  if (durations.length < 2) {
    return true;
  }
  return durations.every((duration) => duration === durations[0]);
}
