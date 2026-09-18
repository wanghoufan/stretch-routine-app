import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isActive } from '../../../domain/session/RunnerState';
import type { ActiveSessionLoad, SessionRepository } from '../../../data/repositories/sessionRepository';
import type { WallClock } from '../../../services/clock';

/**
 * Writes the authoritative session so it can be reconstructed later (R011).
 *
 * Only live phases are worth persisting: once a routine is COMPLETED / STOPPED
 * the row is cleared so recovery can never resurrect a finished routine.
 * Persistence failures are reported but never stop playback.
 *
 * The row is created by `StartRoutineService` with an explicit `INSERT`; this
 * layer only ever `UPDATE`s (or clears) it, so a running session can never be
 * silently replaced by a later write.
 */
export interface SessionPersistenceOptions {
  repository: SessionRepository;
  /** Refreshes the display-only wall timestamp; never used for timing. */
  wallClock: WallClock;
  onError?: (error: unknown) => void;
}

export interface SessionPersistence {
  /** Persist the current session, or clear it when it is terminal. Never throws. */
  save(session: ActiveSession): Promise<void>;
  clear(): Promise<void>;
  load(): Promise<ActiveSessionLoad>;
}

export function shouldPersistSession(state: ActiveSession['state']): boolean {
  return isActive(state);
}

export function createSessionPersistence(options: SessionPersistenceOptions): SessionPersistence {
  const { repository, wallClock, onError } = options;

  return {
    async save(session: ActiveSession): Promise<void> {
      try {
        if (!shouldPersistSession(session.state)) {
          await repository.clear();
          return;
        }
        await repository.save({ ...session, updatedAtWallMs: wallClock.nowMs() });
      } catch (error) {
        onError?.(error);
      }
    },

    async clear(): Promise<void> {
      try {
        await repository.clear();
      } catch (error) {
        onError?.(error);
      }
    },

    async load(): Promise<ActiveSessionLoad> {
      try {
        return await repository.loadActive();
      } catch (error) {
        onError?.(error);
        return { status: 'none' };
      }
    },
  };
}
