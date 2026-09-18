import type { ActiveSession } from '../../domain/session/ActiveSession';
import type { RunnerState } from '../../domain/session/RunnerState';
import { decodeSnapshot } from '../../domain/session/SessionSnapshot';
import { ACTIVE_SESSION_SNAPSHOT_VERSION } from '../../domain/session/SessionSnapshot';

/** Row shape of the singleton V2 `active_session` table. */
export interface ActiveSessionRow {
  id: number;
  session_id: string;
  routine_id: string;
  routine_name: string;
  state: string;
  current_step_index: number;
  phase_started_elapsed_ms: number | null;
  paused_at_elapsed_ms: number | null;
  accumulated_pause_ms: number;
  effective_step_duration_ms: number;
  effective_transition_duration_ms: number;
  runtime_extension_ms: number;
  completed_phase_ms: number;
  last_updated_elapsed_ms: number;
  updated_at_wall_ms: number;
  boot_count: number;
  snapshot_version: number;
  snapshot: string;
}

export type SessionRowResult =
  | { status: 'ok'; session: ActiveSession }
  | { status: 'corrupt'; reason: string };

const KNOWN_STATES: readonly RunnerState[] = [
  'IDLE',
  'PREPARING',
  'RUNNING_STEP',
  'RUNNING_TRANSITION',
  'PAUSED_STEP',
  'PAUSED_TRANSITION',
  'COMPLETED',
  'STOPPED',
  'ERROR',
];

/**
 * An unknown stored state is rejected rather than guessed, so a corrupt row can
 * never silently start an ambiguous timer (PLAN §15). A corrupt row is reported
 * to the caller, which clears it instead of resuming anything.
 */
function toRunnerState(value: string): RunnerState | null {
  return (KNOWN_STATES as readonly string[]).includes(value) ? (value as RunnerState) : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Decode a stored row into an `ActiveSession`.
 *
 * Every failure mode (unknown state, version mismatch, corrupt JSON, invalid
 * numeric field) is surfaced as `{ status: 'corrupt' }` — the fail-safe used by
 * R011 so a damaged session is dropped, never resumed.
 */
export function rowToActiveSession(row: ActiveSessionRow): SessionRowResult {
  const state = toRunnerState(row.state);
  if (!state) {
    return { status: 'corrupt', reason: `unknown runner state: ${row.state}` };
  }

  if (row.snapshot_version !== ACTIVE_SESSION_SNAPSHOT_VERSION) {
    return { status: 'corrupt', reason: `unknown snapshot version: ${row.snapshot_version}` };
  }

  const decoded = decodeSnapshot(row.snapshot);
  if (!decoded.ok) {
    return { status: 'corrupt', reason: decoded.reason };
  }

  const numericFields: readonly (readonly [string, unknown])[] = [
    ['current_step_index', row.current_step_index],
    ['accumulated_pause_ms', row.accumulated_pause_ms],
    ['effective_step_duration_ms', row.effective_step_duration_ms],
    ['effective_transition_duration_ms', row.effective_transition_duration_ms],
    ['runtime_extension_ms', row.runtime_extension_ms],
    ['completed_phase_ms', row.completed_phase_ms],
    ['last_updated_elapsed_ms', row.last_updated_elapsed_ms],
    ['updated_at_wall_ms', row.updated_at_wall_ms],
    ['boot_count', row.boot_count],
  ];
  for (const [name, value] of numericFields) {
    if (!isFiniteNumber(value)) {
      return { status: 'corrupt', reason: `${name} is not a finite number` };
    }
  }

  if (row.phase_started_elapsed_ms !== null && !isFiniteNumber(row.phase_started_elapsed_ms)) {
    return { status: 'corrupt', reason: 'phase_started_elapsed_ms is not a finite number' };
  }
  if (row.paused_at_elapsed_ms !== null && !isFiniteNumber(row.paused_at_elapsed_ms)) {
    return { status: 'corrupt', reason: 'paused_at_elapsed_ms is not a finite number' };
  }

  return {
    status: 'ok',
    session: {
      sessionId: row.session_id,
      routineId: row.routine_id,
      routineName: row.routine_name,
      state,
      currentStepIndex: row.current_step_index,
      phaseStartedElapsedMs: row.phase_started_elapsed_ms,
      pausedAtElapsedMs: row.paused_at_elapsed_ms,
      accumulatedPauseMs: row.accumulated_pause_ms,
      effectiveStepDurationMs: row.effective_step_duration_ms,
      effectiveTransitionDurationMs: row.effective_transition_duration_ms,
      runtimeExtensionMs: row.runtime_extension_ms,
      completedPhaseMs: row.completed_phase_ms,
      lastUpdatedElapsedMs: row.last_updated_elapsed_ms,
      updatedAtWallMs: row.updated_at_wall_ms,
      bootCount: row.boot_count,
      snapshotVersion: row.snapshot_version,
      snapshot: decoded.snapshot,
    },
  };
}
