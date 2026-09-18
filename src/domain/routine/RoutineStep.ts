/**
 * Domain: RoutineStep (SPEC §7, PLAN §4).
 *
 * A RoutineStep owns its own *snapshot* of every playback-facing value:
 * `displayName`, `speakText`, `durationSec`, `transitionSec`.
 *
 * Editing or deleting the reusable `Action` it came from MUST NOT rewrite an
 * already-saved step (Constitution XI, FR-015).
 */

export type StepSide = 'none' | 'left' | 'right';

export interface RoutineStep {
  id: string;
  routineId: string;
  /** Set when the step was created from a library Action. Never a live link. */
  sourceActionId?: string;
  orderIndex: number;

  // Snapshot values used by this routine.
  displayName: string;
  speakText: string;
  durationSec: number;
  transitionSec: number;

  /** Shared by the two steps of one bilateral pair. */
  pairGroupId?: string;
  side: StepSide;
}

/** Step values accepted by the editor before ids / ordering are assigned. */
export interface RoutineStepDraft {
  id: string;
  sourceActionId?: string;
  displayName: string;
  speakText: string;
  durationSec: number;
  transitionSec: number;
  pairGroupId?: string;
  side: StepSide;
}
