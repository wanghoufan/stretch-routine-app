/** Domain: reusable Action template (SPEC §7, PLAN §4). */

import type { TagFields } from '../tags';

export type ActionSideMode = 'single' | 'bilateral';

export interface Action extends TagFields {
  id: string;
  name: string;
  defaultDurationSec: number;
  sideMode: ActionSideMode;
  defaultSpeakText?: string;
  createdAt: string;
  updatedAt: string;
}

/** Values accepted when creating an Action from the UI. */
export interface ActionDraft extends TagFields {
  name: string;
  defaultDurationSec: number;
  sideMode: ActionSideMode;
  defaultSpeakText?: string;
}
