import type { Routine } from '../../../domain/routine/Routine';
import type { RoutineRepository, RoutineWithSteps } from '../../../data/repositories/routineRepository';
import { generateId, type IdGenerator } from '../../../shared/utils/id';
import { ValidationError } from '../../../shared/errors';

/**
 * Duplicate a routine into a fully independent copy (T066, FR-009).
 *
 * Independence is enforced structurally: every step gets a new id, and every
 * bilateral pair gets a new `pairGroupId`, so editing the copy can never touch
 * the original.
 */

/** `拉伸 副本`, then `拉伸 副本 2`, ... so repeated duplication stays readable. */
export function buildCopyName(sourceName: string, existingNames: readonly string[]): string {
  const base = `${sourceName} 副本`;
  if (!existingNames.includes(base)) {
    return base;
  }
  let index = 2;
  while (existingNames.includes(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
}

export async function duplicateRoutine(
  repository: RoutineRepository,
  sourceRoutineId: string,
  options: { generateId?: IdGenerator } = {},
): Promise<RoutineWithSteps> {
  const nextId = options.generateId ?? generateId;
  const source = await repository.getWithSteps(sourceRoutineId);
  if (!source) {
    throw new ValidationError('流程不存在');
  }

  const allRoutines: Routine[] = await repository.list();
  const copyName = buildCopyName(
    source.routine.name,
    allRoutines.map((routine) => routine.name),
  );

  const pairIdMap = new Map<string, string>();

  const steps = source.steps.map((step) => {
    let pairGroupId = step.pairGroupId;
    if (pairGroupId) {
      const mapped = pairIdMap.get(pairGroupId);
      if (mapped) {
        pairGroupId = mapped;
      } else {
        const newPairId = nextId('pair');
        pairIdMap.set(pairGroupId, newPairId);
        pairGroupId = newPairId;
      }
    }

    return {
      id: nextId('step'),
      sourceActionId: step.sourceActionId,
      displayName: step.displayName,
      speakText: step.speakText,
      durationSec: step.durationSec,
      transitionSec: step.transitionSec,
      pairGroupId,
      side: step.side,
    };
  });

  return repository.create({
    name: copyName,
    defaultDurationSec: source.routine.defaultDurationSec,
    defaultTransitionSec: source.routine.defaultTransitionSec,
    steps,
  });
}
