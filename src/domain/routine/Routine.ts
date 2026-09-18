/** Domain: Routine (SPEC §7, PLAN §4). */

import type { TagFields } from '../tags';

export interface Routine extends TagFields {
  id: string;
  name: string;
  defaultDurationSec: number;
  defaultTransitionSec: number;
  createdAt: string;
  updatedAt: string;
}

/** Routine plus derived figures used by Home / Detail lists. */
export interface RoutineSummary extends Routine {
  stepCount: number;
  totalDurationSec: number;
}
