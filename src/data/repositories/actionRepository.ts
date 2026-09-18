import type { Action, ActionDraft } from '../../domain/action/Action';
import {
  clampDuration,
  ROUTINE_NAME_MAX_LENGTH,
  SPEAK_TEXT_MAX_LENGTH,
} from '../../domain/routine/constants';
import type { SqlDatabase } from '../db/Database';
import { rowToAction, type ActionRow } from '../mappers/actionMapper';
import type { Clock } from '../../services/clock/Clock';
import { generateId, type IdGenerator } from '../../shared/utils/id';
import { PersistenceError, ValidationError } from '../../shared/errors';

export interface ActionRepository {
  list(): Promise<Action[]>;
  getById(id: string): Promise<Action | null>;
  create(draft: ActionDraft): Promise<Action>;
  update(id: string, patch: Partial<ActionDraft>): Promise<Action>;
  remove(id: string): Promise<void>;
}

export interface ActionRepositoryDeps {
  db: SqlDatabase;
  clock: Clock;
  generateId?: IdGenerator;
}

function normalizeName(name: string): string {
  const trimmed = name.trim().slice(0, ROUTINE_NAME_MAX_LENGTH);
  if (trimmed.length === 0) {
    throw new ValidationError('动作名称不能为空');
  }
  return trimmed;
}

function normalizeSpeakText(text: string | undefined): string | null {
  const trimmed = text?.trim();
  return trimmed && trimmed.length > 0 ? trimmed.slice(0, SPEAK_TEXT_MAX_LENGTH) : null;
}

export function createActionRepository(deps: ActionRepositoryDeps): ActionRepository {
  const { db, clock } = deps;
  const nextId = deps.generateId ?? generateId;

  async function getById(id: string): Promise<Action | null> {
    const row = await db.get<ActionRow>('SELECT * FROM actions WHERE id = ?', [id]);
    return row ? rowToAction(row) : null;
  }

  return {
    async list(): Promise<Action[]> {
      const rows = await db.all<ActionRow>('SELECT * FROM actions ORDER BY name COLLATE NOCASE ASC');
      return rows.map(rowToAction);
    },

    getById,

    async create(draft: ActionDraft): Promise<Action> {
      const now = new Date(clock.nowMs()).toISOString();
      const action: Action = {
        id: nextId('act'),
        name: normalizeName(draft.name),
        defaultDurationSec: clampDuration(draft.defaultDurationSec),
        sideMode: draft.sideMode === 'bilateral' ? 'bilateral' : 'single',
        defaultSpeakText: normalizeSpeakText(draft.defaultSpeakText) ?? undefined,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await db.run(
          `INSERT INTO actions
             (id, name, default_duration_sec, side_mode, default_speak_text, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            action.id,
            action.name,
            action.defaultDurationSec,
            action.sideMode,
            action.defaultSpeakText ?? null,
            action.createdAt,
            action.updatedAt,
          ],
        );
      } catch (error) {
        throw new PersistenceError('保存动作失败', error);
      }

      return action;
    },

    async update(id: string, patch: Partial<ActionDraft>): Promise<Action> {
      const existing = await getById(id);
      if (!existing) {
        throw new ValidationError('动作不存在');
      }

      const updated: Action = {
        ...existing,
        name: patch.name === undefined ? existing.name : normalizeName(patch.name),
        defaultDurationSec:
          patch.defaultDurationSec === undefined
            ? existing.defaultDurationSec
            : clampDuration(patch.defaultDurationSec),
        sideMode: patch.sideMode ?? existing.sideMode,
        defaultSpeakText:
          patch.defaultSpeakText === undefined
            ? existing.defaultSpeakText
            : normalizeSpeakText(patch.defaultSpeakText) ?? undefined,
        updatedAt: new Date(clock.nowMs()).toISOString(),
      };

      try {
        await db.run(
          `UPDATE actions
              SET name = ?, default_duration_sec = ?, side_mode = ?, default_speak_text = ?, updated_at = ?
            WHERE id = ?`,
          [
            updated.name,
            updated.defaultDurationSec,
            updated.sideMode,
            updated.defaultSpeakText ?? null,
            updated.updatedAt,
            updated.id,
          ],
        );
      } catch (error) {
        throw new PersistenceError('更新动作失败', error);
      }

      return updated;
    },

    /**
     * Deleting a reusable Action never touches saved routines: their steps keep
     * their own snapshot values (FR-015, T079).
     */
    async remove(id: string): Promise<void> {
      await db.transaction(async () => {
        await db.run('UPDATE routine_steps SET source_action_id = NULL WHERE source_action_id = ?', [id]);
        await db.run('DELETE FROM actions WHERE id = ?', [id]);
      });
    },
  };
}
