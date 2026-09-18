import { useCallback, useEffect, useState } from 'react';
import type { RoutineSummary } from '../../../domain/routine/Routine';
import type { AppServices } from '../../../app/providers/createAppServices';
import { duplicateRoutine } from '../services/duplicateRoutine';
import { deleteRoutine } from '../services/deleteRoutine';

/**
 * Home screen data (T035, R020).
 *
 * Also exposes the active session so Home can show a Banner and offer 继续 —
 * including when the source Routine was deleted, because the Banner reads the
 * session's immutable snapshot rather than the routine list.
 */
export interface ActiveSessionSummary {
  routineId: string;
  /** Name captured at start; shown even if the routine no longer exists. */
  routineName: string;
  stepCount: number;
}

export interface UseRoutinesResult {
  routines: RoutineSummary[];
  /** Routine id with a stored, still-active session, if any. */
  activeSessionRoutineId: string | null;
  /** Session info for the Home Banner; null when nothing is running. */
  activeSession: ActiveSessionSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  duplicate: (routineId: string) => Promise<void>;
  remove: (routineId: string) => Promise<void>;
}

export function useRoutines(services: AppServices): UseRoutinesResult {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [summaries, sessionLoad] = await Promise.all([
        services.routines.listSummaries(),
        services.sessions.loadActive(),
      ]);
      setRoutines(summaries);
      // Only a session from the current boot can be continued: a row left over
      // from a previous process has a dead monotonic origin (fail-safe).
      let running: ActiveSessionSummary | null = null;
      if (
        sessionLoad.status === 'ok' &&
        sessionLoad.session.bootCount === services.bootInfo.getBootCount()
      ) {
        running = {
          routineId: sessionLoad.session.routineId,
          routineName: sessionLoad.session.routineName,
          stepCount: sessionLoad.session.snapshot.steps.length,
        };
      }
      setActiveSession(running);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '读取流程失败');
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const duplicate = useCallback(
    async (routineId: string) => {
      await duplicateRoutine(services.routines, routineId, { generateId: services.generateId });
      await refresh();
    },
    [services, refresh],
  );

  const remove = useCallback(
    async (routineId: string) => {
      await deleteRoutine(services.routines, routineId);
      await refresh();
    },
    [services, refresh],
  );

  return {
    routines,
    activeSessionRoutineId: activeSession?.routineId ?? null,
    activeSession,
    loading,
    error,
    refresh,
    duplicate,
    remove,
  };
}
