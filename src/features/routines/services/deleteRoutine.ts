import type { RoutineRepository } from '../../../data/repositories/routineRepository';
import { ValidationError } from '../../../shared/errors';

/**
 * Confirmed routine deletion (T067, FR-010).
 *
 * Deleting a routine only removes the routine and its own steps. Reusable
 * Actions in the library are untouched, because they are independent records.
 */
export async function deleteRoutine(
  repository: RoutineRepository,
  routineId: string,
): Promise<void> {
  const existing = await repository.getById(routineId);
  if (!existing) {
    throw new ValidationError('流程不存在');
  }
  await repository.remove(routineId);
}

/** Copy shown in the destructive confirmation dialog (T091). */
export function buildDeleteRoutineMessage(routineName: string, stepCount: number): string {
  return `删除「${routineName}」后无法恢复，其中 ${stepCount} 个步骤会一并删除。动作库中的动作不受影响。`;
}
