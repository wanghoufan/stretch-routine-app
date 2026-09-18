import type { ActiveSession } from '../../domain/session/ActiveSession';
import type { SqlDatabase } from '../db/Database';
import { rowToActiveSession, type ActiveSessionRow } from '../mappers/sessionMapper';

/**
 * Persistence for the single authoritative active session (FR-028..FR-032).
 *
 * One singleton row: starting a routine replaces whatever was stored, and
 * finishing/stopping clears it so recovery never resurrects a dead session.
 */
export interface SessionRepository {
  loadActive(): Promise<ActiveSession | null>;
  save(session: ActiveSession): Promise<void>;
  clear(): Promise<void>;
}

export function createSessionRepository(db: SqlDatabase): SessionRepository {
  return {
    async loadActive(): Promise<ActiveSession | null> {
      const row = await db.get<ActiveSessionRow>('SELECT * FROM active_session WHERE id = 1');
      return row ? rowToActiveSession(row) : null;
    },

    async save(session: ActiveSession): Promise<void> {
      // INSERT OR REPLACE keeps this working on older Android SQLite builds
      // (upsert requires SQLite 3.24+, which only ships from Android 11).
      await db.run(
        `INSERT OR REPLACE INTO active_session
           (id, session_id, routine_id, state, current_step_index, phase_started_at_epoch_ms,
            paused_at_epoch_ms, accumulated_pause_ms, effective_step_duration_ms,
            effective_transition_duration_ms, runtime_extension_ms, completed_phase_ms,
            updated_at_epoch_ms)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.sessionId,
          session.routineId,
          session.state,
          session.currentStepIndex,
          session.phaseStartedAtEpochMs,
          session.pausedAtEpochMs,
          session.accumulatedPauseMs,
          session.effectiveStepDurationMs,
          session.effectiveTransitionDurationMs,
          session.runtimeExtensionMs,
          session.completedPhaseMs,
          session.updatedAtEpochMs,
        ],
      );
    },

    async clear(): Promise<void> {
      await db.run('DELETE FROM active_session WHERE id = 1');
    },
  };
}
