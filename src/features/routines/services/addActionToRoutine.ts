import type { Action } from '../../../domain/action/Action';
import type { RoutineStepDraft } from '../../../domain/routine/RoutineStep';
import { createBilateralStepDrafts } from '../../../domain/routine/bilateral';
import { clampDuration, clampTransition, STEP_NAME_MAX_LENGTH } from '../../../domain/routine/constants';
import { generateId, type IdGenerator } from '../../../shared/utils/id';

/**
 * Add library Actions to a routine draft (T070, T078, FR-014).
 *
 * Every added step **copies** the Action's current values into the step
 * snapshot. There is no live reference, so renaming or deleting the Action
 * later leaves existing routines exactly as they were (Constitution XI).
 */
export interface AddActionOptions {
  transitionSec: number;
  /** Used when an Action has no usable default duration. */
  fallbackDurationSec: number;
  generateId?: IdGenerator;
}

export function draftsFromAction(action: Action, options: AddActionOptions): RoutineStepDraft[] {
  if (action.sideMode === 'bilateral') {
    return [...createBilateralStepDrafts(action, options)];
  }

  const nextId = options.generateId ?? generateId;
  const name = action.name.trim().slice(0, STEP_NAME_MAX_LENGTH);
  return [
    {
      id: nextId('step'),
      sourceActionId: action.id,
      displayName: name,
      speakText: (action.defaultSpeakText?.trim() || name).slice(0, STEP_NAME_MAX_LENGTH),
      durationSec: clampDuration(
        action.defaultDurationSec > 0 ? action.defaultDurationSec : options.fallbackDurationSec,
      ),
      transitionSec: clampTransition(options.transitionSec),
      side: 'none',
    },
  ];
}

/** Multi-select "从动作库添加": order follows the selection order (FR-014). */
export function draftsFromActions(
  actions: readonly Action[],
  options: AddActionOptions,
): RoutineStepDraft[] {
  return actions.flatMap((action) => draftsFromAction(action, options));
}
