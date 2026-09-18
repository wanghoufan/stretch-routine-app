import type { Action, ActionDraft } from '../../../domain/action/Action';
import type { ActionRepository } from '../../../data/repositories/actionRepository';
import { clampDuration, ROUTINE_NAME_MAX_LENGTH } from '../../../domain/routine/constants';
import { ValidationError } from '../../../shared/errors';

/**
 * Action Library use-cases (T076).
 *
 * The UI calls these instead of the repository directly so validation messages
 * stay consistent in one place.
 */

export function validateActionDraft(draft: ActionDraft): void {
  if (draft.name.trim().length === 0) {
    throw new ValidationError('请填写动作名称');
  }
  if (draft.name.trim().length > ROUTINE_NAME_MAX_LENGTH) {
    throw new ValidationError(`动作名称不能超过 ${ROUTINE_NAME_MAX_LENGTH} 个字`);
  }
}

export function sanitizeActionDraft(draft: ActionDraft): ActionDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    defaultDurationSec: clampDuration(draft.defaultDurationSec),
    defaultSpeakText: draft.defaultSpeakText?.trim() || undefined,
  };
}

export async function listLibraryActions(repository: ActionRepository): Promise<Action[]> {
  return repository.list();
}

export async function createLibraryAction(
  repository: ActionRepository,
  draft: ActionDraft,
): Promise<Action> {
  validateActionDraft(draft);
  return repository.create(sanitizeActionDraft(draft));
}

export async function updateLibraryAction(
  repository: ActionRepository,
  id: string,
  patch: Partial<ActionDraft>,
): Promise<Action> {
  if (patch.name !== undefined && patch.name.trim().length === 0) {
    throw new ValidationError('请填写动作名称');
  }
  return repository.update(id, {
    ...patch,
    name: patch.name?.trim(),
    defaultSpeakText: patch.defaultSpeakText === undefined ? undefined : patch.defaultSpeakText.trim() || undefined,
  });
}
