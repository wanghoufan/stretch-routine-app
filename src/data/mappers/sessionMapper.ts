import type { ActiveSession } from '../../domain/session/ActiveSession';
import type { RunnerState } from '../../domain/session/RunnerState';

/** Row shape of the singleton `active_session` table. */
export interface ActiveSessionRow {
  id: number;
  session_id: string;
  routine_id: string;
  state: string;
  current_step_index: number;
  phase_started_at_epoch_ms: number | null;
  paused_at_epoch_ms: number | null;
  accumulated_pause_ms: number;
  effective_step_duration_ms: number;
  effective_transition_duration_ms: number;
  runtime_extension_ms: number;
  completed_phase_ms: number;
  updated_at_epoch_ms: number;
}

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
 * An unknown stored state is treated as ERROR rather than guessed, so a corrupt
 * row can never silently start an ambiguous timer (PLAN §15).
 */
function toRunnerState(value: string): RunnerState {
  return (KNOWN_STATES as readonly string[]).includes(value) ? (value as RunnerState) : 'ERROR';
}

export function rowToActiveSession(row: ActiveSessionRow): ActiveSession {
  return {
    sessionId: row.session_id,
    routineId: row.routine_id,
    state: toRunnerState(row.state),
    currentStepIndex: row.current_step_index,
    phaseStartedAtEpochMs: row.phase_started_at_epoch_ms,
    pausedAtEpochMs: row.paused_at_epoch_ms,
    accumulatedPauseMs: row.accumulated_pause_ms,
    effectiveStepDurationMs: row.effective_step_duration_ms,
    effectiveTransitionDurationMs: row.effective_transition_duration_ms,
    runtimeExtensionMs: row.runtime_extension_ms,
    completedPhaseMs: row.completed_phase_ms,
    updatedAtEpochMs: row.updated_at_epoch_ms,
  };
}
