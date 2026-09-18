import type { RoutineStep, StepSide } from '../routine/RoutineStep';

/**
 * Immutable session snapshot (R009–R011, R021).
 *
 * The snapshot is captured once, when a routine starts, and contains everything
 * the runner needs to keep playing: the ordered steps and the display name.
 * Because the runner reads only this copy, editing, reordering, renaming or
 * deleting the source Routine afterwards can never change an in-flight session
 * (PRODUCT_PLAN_V1.2 User Flow 5 / DoD).
 *
 * It is stored as JSON in `active_session.snapshot` together with an explicit
 * `snapshotVersion`. Decoding validates both the version and the structure; an
 * unknown version or a malformed payload is a fail-safe, never a guess.
 */
export const ACTIVE_SESSION_SNAPSHOT_VERSION = 1;

export interface ActiveSessionSnapshot {
  /** Schema version of the snapshot payload itself. */
  version: number;
  /** Provenance only; the reference may dangle if the routine was deleted. */
  routineId: string;
  routineName: string;
  capturedAtWallMs: number;
  /** Ordered, immutable playback content. Never re-read from the repository. */
  steps: RoutineStep[];
}

export type SnapshotDecodeResult =
  | { ok: true; snapshot: ActiveSessionSnapshot }
  | { ok: false; reason: string };

const STEP_SIDES: readonly StepSide[] = ['none', 'left', 'right'];

export function createSnapshot(input: {
  routineId: string;
  routineName: string;
  steps: readonly RoutineStep[];
  capturedAtWallMs: number;
}): ActiveSessionSnapshot {
  return {
    version: ACTIVE_SESSION_SNAPSHOT_VERSION,
    routineId: input.routineId,
    routineName: input.routineName,
    capturedAtWallMs: input.capturedAtWallMs,
    // Deep copy: later mutation of the source array must not leak into the
    // snapshot object held by the session.
    steps: input.steps.map((step) => ({ ...step })),
  };
}

export function encodeSnapshot(snapshot: ActiveSessionSnapshot): string {
  return JSON.stringify(snapshot);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function validateStep(value: unknown, index: number): string | null {
  if (typeof value !== 'object' || value === null) {
    return `step ${index} is not an object`;
  }
  const step = value as Record<string, unknown>;
  if (!isNonEmptyString(step.id)) {
    return `step ${index} has no id`;
  }
  if (!isNonEmptyString(step.displayName)) {
    return `step ${index} has no displayName`;
  }
  if (typeof step.speakText !== 'string') {
    return `step ${index} has an invalid speakText`;
  }
  if (!isFiniteNumber(step.durationSec) || step.durationSec <= 0) {
    return `step ${index} has an invalid durationSec`;
  }
  if (!isFiniteNumber(step.transitionSec) || step.transitionSec < 0) {
    return `step ${index} has an invalid transitionSec`;
  }
  if (!isFiniteNumber(step.orderIndex)) {
    return `step ${index} has an invalid orderIndex`;
  }
  if (!STEP_SIDES.includes(step.side as StepSide)) {
    return `step ${index} has an invalid side`;
  }
  return null;
}

/**
 * Strict decoder. Any failure returns `{ ok: false }` with a machine-readable
 * reason so the caller can discard the row instead of starting an ambiguous
 * timer (PLAN §15, R011).
 */
export function decodeSnapshot(raw: string): SnapshotDecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'snapshot is not valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'snapshot is not an object' };
  }
  const value = parsed as Record<string, unknown>;

  if (!isFiniteNumber(value.version)) {
    return { ok: false, reason: 'snapshot has no version' };
  }
  if (value.version !== ACTIVE_SESSION_SNAPSHOT_VERSION) {
    return { ok: false, reason: `unknown snapshot version: ${String(value.version)}` };
  }
  if (!isNonEmptyString(value.routineId)) {
    return { ok: false, reason: 'snapshot has no routineId' };
  }
  if (typeof value.routineName !== 'string') {
    return { ok: false, reason: 'snapshot has no routineName' };
  }
  if (!isFiniteNumber(value.capturedAtWallMs)) {
    return { ok: false, reason: 'snapshot has an invalid capturedAtWallMs' };
  }
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    return { ok: false, reason: 'snapshot has no steps' };
  }

  for (let index = 0; index < value.steps.length; index += 1) {
    const problem = validateStep(value.steps[index], index);
    if (problem) {
      return { ok: false, reason: problem };
    }
  }

  return {
    ok: true,
    snapshot: {
      version: ACTIVE_SESSION_SNAPSHOT_VERSION,
      routineId: value.routineId,
      routineName: value.routineName,
      capturedAtWallMs: value.capturedAtWallMs,
      steps: (value.steps as RoutineStep[]).map((step) => ({ ...step })),
    },
  };
}
