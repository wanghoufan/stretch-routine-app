/** Domain: reusable Action template (SPEC §7, PLAN §4). */

export type ActionSideMode = 'single' | 'bilateral';

export interface Action {
  id: string;
  name: string;
  defaultDurationSec: number;
  sideMode: ActionSideMode;
  defaultSpeakText?: string;
  createdAt: string;
  updatedAt: string;
}

/** Values accepted when creating an Action from the UI. */
export interface ActionDraft {
  name: string;
  defaultDurationSec: number;
  sideMode: ActionSideMode;
  defaultSpeakText?: string;
}
