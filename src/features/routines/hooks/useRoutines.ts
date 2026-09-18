import { useCallback, useEffect, useState } from 'react';
import type { RoutineSummary } from '../../../domain/routine/Routine';
import type { AppServices } from '../../../app/providers/createAppServices';
import { duplicateRoutine } from '../services/duplicateRoutine';
import { deleteRoutine } from '../services/deleteRoutine';

/**
 * Home screen data (T035).
 *
 * Also exposes whether a recoverable session exists for a routine, so Home can
 * offer 继续 instead of 开始 after the app was killed mid-routine (FR-032).
 */
export interface UseRoutinesResult {
  routines: RoutineSummary[];
  /** Routine id with a stored, still-active session, if any. */
  activeSessionRoutineId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  duplicate: (routineId: string) => Promise<void>;
  remove: (routineId: string) => Promise<void>;
}

export function useRoutines(services: AppServices): UseRoutinesResult {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [activeSessionRoutineId, setActiveSessionRoutineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [summaries, session] = await Promise.all([
        services.routines.listSummaries(),
        services.sessions.loadActive(),
      ]);
      setRoutines(summaries);
      setActiveSessionRoutineId(session ? session.routineId : null);
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

  return { routines, activeSessionRoutineId, loading, error, refresh, duplicate, remove };
}
