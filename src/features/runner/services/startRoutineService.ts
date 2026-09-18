import type { ActiveSession } from '../../../domain/session/ActiveSession';
import type { RoutineRepository, RoutineWithSteps } from '../../../data/repositories/routineRepository';
import type { SessionRepository } from '../../../data/repositories/sessionRepository';
import type { MonotonicClock, WallClock } from '../../../services/clock';
import type { BootInfoProvider } from '../../../services/runtime/BootInfo';
import { generateId, type IdGenerator } from '../../../shared/utils/id';
import { startRunner, type RunnerEvent } from '../domain/runnerMachine';

/**
 * Single entry point for starting a routine (R014–R018).
 *
 * It centralises the whole decision:
 *   load active session -> conflict policy -> snapshot -> INSERT -> session.
 *
 * The result contract is fixed (R015):
 *   `started` | `continue-current` | `conflict` | `failed`.
 *
 * A second routine can never silently overwrite a running one: `start` returns
 * `conflict` and only `replaceWith`, called after an explicit user confirmation,
 * replaces the session.
 *
 * `started` / `continue-current` carry the cue events for the phase the user is
 * entering, so the caller can announce exactly once for an explicit action.
 * Automatic recovery does not go through this service and stays silent.
 */

export type StartResult =
  | { kind: 'started'; session: ActiveSession; events: RunnerEvent[] }
  | { kind: 'continue-current'; session: ActiveSession; events: RunnerEvent[] }
  | { kind: 'conflict'; current: ActiveSession }
  | { kind: 'failed'; error: string };

export interface StartRoutineServiceDeps {
  routines: Pick<RoutineRepository, 'getWithSteps'>;
  sessions: SessionRepository;
  monotonic: MonotonicClock;
  wallClock: WallClock;
  bootInfo: BootInfoProvider;
  generateId?: IdGenerator;
}

export interface StartRoutineService {
  /** Start or continue. Never overwrites a different running routine. */
  start(routineId: string): Promise<StartResult>;
  /** Explicitly continue whatever session is already active. */
  continueCurrent(): Promise<StartResult>;
  /** Explicit replace after the user chose "结束当前并开始新的". */
  replaceWith(routineId: string): Promise<StartResult>;
}

/**
 * Cue event for explicitly entering an already-running session (Continue).
 * Recovery stays silent, but an explicit "继续" must speak the current phase.
 */
export function buildResumeEvents(session: ActiveSession): RunnerEvent[] {
  switch (session.state) {
    case 'RUNNING_STEP':
    case 'PAUSED_STEP':
      return [{ type: 'STEP_STARTED', stepIndex: session.currentStepIndex, suppressed: false }];
    case 'RUNNING_TRANSITION':
    case 'PAUSED_TRANSITION':
      return [
        {
          type: 'TRANSITION_STARTED',
          fromStepIndex: Math.max(0, session.currentStepIndex - 1),
          toStepIndex: session.currentStepIndex,
          suppressed: false,
        },
      ];
    default:
      return [];
  }
}

export function createStartRoutineService(deps: StartRoutineServiceDeps): StartRoutineService {
  const nextId = deps.generateId ?? generateId;

  /**
   * A session owned by a previous boot cannot be resumed or continued (its
   * monotonic origin is gone). Drop it so a new start is not blocked by a dead
   * session; this mirrors the recovery fail-safe without announcing anything.
   */
  async function loadLiveSession(): Promise<ActiveSession | null> {
    const loaded = await deps.sessions.loadActive();
    if (loaded.status !== 'ok') {
      return null;
    }
    if (loaded.session.bootCount !== deps.bootInfo.getBootCount()) {
      await deps.sessions.clear();
      return null;
    }
    return loaded.session;
  }

  function buildSession(routineId: string, loaded: RoutineWithSteps): {
    session: ActiveSession;
    events: RunnerEvent[];
  } {
    return startRunner({
      sessionId: nextId('ses'),
      routineId,
      routineName: loaded.routine.name,
      steps: loaded.steps,
      nowElapsedMs: deps.monotonic.nowElapsedMs(),
      wallMs: deps.wallClock.nowMs(),
      bootCount: deps.bootInfo.getBootCount(),
    });
  }

  async function createNewSession(routineId: string): Promise<StartResult> {
    const loaded = await deps.routines.getWithSteps(routineId);
    if (!loaded) {
      return { kind: 'failed', error: '流程不存在' };
    }

    const { session, events } = buildSession(routineId, loaded);
    try {
      // INSERT, never `INSERT OR REPLACE`: the row must not already exist.
      await deps.sessions.create(session);
    } catch (error) {
      return { kind: 'failed', error: error instanceof Error ? error.message : '无法创建会话' };
    }
    return { kind: 'started', session, events };
  }

  return {
    async start(routineId: string): Promise<StartResult> {
      try {
        const current = await loadLiveSession();
        if (current) {
          if (current.routineId === routineId) {
            return { kind: 'continue-current', session: current, events: buildResumeEvents(current) };
          }
          return { kind: 'conflict', current };
        }
        return await createNewSession(routineId);
      } catch (error) {
        return { kind: 'failed', error: error instanceof Error ? error.message : '无法开始流程' };
      }
    },

    async continueCurrent(): Promise<StartResult> {
      try {
        const current = await loadLiveSession();
        if (!current) {
          return { kind: 'failed', error: '没有可继续的流程' };
        }
        return { kind: 'continue-current', session: current, events: buildResumeEvents(current) };
      } catch (error) {
        return { kind: 'failed', error: error instanceof Error ? error.message : '无法继续流程' };
      }
    },

    async replaceWith(routineId: string): Promise<StartResult> {
      try {
        const loaded = await deps.routines.getWithSteps(routineId);
        if (!loaded) {
          return { kind: 'failed', error: '流程不存在' };
        }
        const { session, events } = buildSession(routineId, loaded);
        // Explicit, user-confirmed replace (DELETE + INSERT) — R018.
        await deps.sessions.replace(session);
        return { kind: 'started', session, events };
      } catch (error) {
        return { kind: 'failed', error: error instanceof Error ? error.message : '无法开始流程' };
      }
    },
  };
}
