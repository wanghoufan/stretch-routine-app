import type { Action, ActionSideMode } from '../../domain/action/Action';
import {
  normalizeDifficulty,
  splitTagList,
  type TagFields,
} from '../../domain/tags';

/** Row shape of the `actions` table. */
export interface ActionRow {
  id: string;
  name: string;
  default_duration_sec: number;
  side_mode: string;
  default_speak_text: string | null;
  created_at: string;
  updated_at: string;
  category: string | null;
  difficulty: string | null;
  bodypart: string | null;
}

function toSideMode(value: string): ActionSideMode {
  return value === 'bilateral' ? 'bilateral' : 'single';
}

/** Tag fields decoded from the comma-separated columns. */
export function rowToActionTags(row: Pick<ActionRow, 'category' | 'difficulty' | 'bodypart'>): TagFields {
  return {
    category: splitTagList(row.category),
    difficulty: normalizeDifficulty(row.difficulty),
    bodypart: splitTagList(row.bodypart),
  };
}

export function rowToAction(row: ActionRow): Action {
  return {
    id: row.id,
    name: row.name,
    defaultDurationSec: row.default_duration_sec,
    sideMode: toSideMode(row.side_mode),
    defaultSpeakText: row.default_speak_text ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...rowToActionTags(row),
  };
}
