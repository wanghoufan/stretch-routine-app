import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isActive } from '../../../domain/session/RunnerState';
import type { SessionRepository } from '../../../data/repositories/sessionRepository';

/**
 * Writes the authoritative session so it can be reconstructed later (T057).
 *
 * Only live phases are worth persisting: once a routine is COMPLETED / STOPPED
 * the row is cleared so recovery can never resurrect a finished routine.
 * Persistence failures are reported but never stop playback.
 */
export interface SessionPersistenceOptions {
  repository: SessionRepository;
  now: () => number;
  onError?: (error: unknown) => void;
}

export interface SessionPersistence {
  /** Persist or clear, depending on the state. Never throws. */
  save(session: ActiveSession): Promise<void>;
  clear(): Promise<void>;
  load(): Promise<ActiveSession | null>;
}

export function shouldPersistSession(state: ActiveSession['state']): boolean {
  return isActive(state);
}

export function createSessionPersistence(options: SessionPersistenceOptions): SessionPersistence {
  const { repository, now, onError } = options;

  return {
    async save(session: ActiveSession): Promise<void> {
      try {
        if (!shouldPersistSession(session.state)) {
          await repository.clear();
          return;
        }
        await repository.save({ ...session, updatedAtEpochMs: now() });
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

    async load(): Promise<ActiveSession | null> {
      try {
        return await repository.loadActive();
      } catch (error) {
        onError?.(error);
        return null;
      }
    },
  };
}
