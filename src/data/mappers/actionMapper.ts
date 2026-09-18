import type { Action, ActionSideMode } from '../../domain/action/Action';

/** Row shape of the `actions` table. */
export interface ActionRow {
  id: string;
  name: string;
  default_duration_sec: number;
  side_mode: string;
  default_speak_text: string | null;
  created_at: string;
  updated_at: string;
}

function toSideMode(value: string): ActionSideMode {
  return value === 'bilateral' ? 'bilateral' : 'single';
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
  };
}
