import type { ActionRepository } from '../../../data/repositories/actionRepository';
import type { SqlDatabase } from '../../../data/db/Database';
import { ValidationError } from '../../../shared/errors';

/**
 * Safe Action deletion (T079, FR-015, SPEC US6).
 *
 * Deleting a reusable Action must never invalidate a saved routine. Routine
 * steps keep their own snapshot values, so the only thing that changes is that
 * the step loses its `source_action_id` back-reference.
 */

export interface ActionDeletionImpact {
  /** How many saved routine steps referenced this Action. */
  affectedStepCount: number;
}

export async function countActionUsage(db: SqlDatabase, actionId: string): Promise<number> {
  const row = await db.get<{ total: number }>(
    'SELECT COUNT(*) AS total FROM routine_steps WHERE source_action_id = ?',
    [actionId],
  );
  return row?.total ?? 0;
}

export async function deleteAction(
  repository: ActionRepository,
  db: SqlDatabase,
  actionId: string,
): Promise<ActionDeletionImpact> {
  const existing = await repository.getById(actionId);
  if (!existing) {
    throw new ValidationError('动作不存在');
  }
  const affectedStepCount = await countActionUsage(db, actionId);
  await repository.remove(actionId);
  return { affectedStepCount };
}

/** Copy shown in the destructive confirmation dialog (T091). */
export function buildDeleteActionMessage(actionName: string, affectedStepCount: number): string {
  if (affectedStepCount === 0) {
    return `删除「${actionName}」后无法恢复。`;
  }
  return `「${actionName}」已被 ${affectedStepCount} 个流程步骤使用。删除动作不会修改这些步骤的内容与时长。`;
}
