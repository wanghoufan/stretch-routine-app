import type { Routine } from '../../../domain/routine/Routine';
import type { RoutineStep } from '../../../domain/routine/RoutineStep';
import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isPaused } from '../../../domain/session/RunnerState';
import type { RoutineRepository } from '../../../data/repositories/routineRepository';
import type { AppSettings } from '../../settings/settingsModel';
import type { Clock } from '../../../services/clock/Clock';
import { TtsService, type Cue } from '../../../services/tts/ttsService';
import type { IdGenerator } from '../../../shared/utils/id';
import { generateId } from '../../../shared/utils/id';
import {
  advanceRunner,
  applyRunnerControl,
  startRunner,
  type RunnerControl,
  type RunnerEvent,
} from '../domain/runnerMachine';
import { buildCues } from './runnerCueCoordinator';
import { recoverSession } from './sessionRecovery';
import type { SessionPersistence } from './sessionPersistence';

/**
 * Imperative runner controller (T042).
 *
 * Owns the authoritative session and turns ticks/controls into session updates,
 * cue announcements and persistence writes. Keeping this outside React means
 * the whole hands-free flow is testable without rendering anything.
 *
 * The React hook (`useRunner`) is a thin `useSyncExternalStore` wrapper.
 */

export type RunnerStatus = 'loading' | 'ready' | 'missing' | 'error';

export interface RunnerSnapshot {
  status: RunnerStatus;
  routine: Routine | null;
  steps: readonly RoutineStep[];
  session: ActiveSession | null;
  /** Presentation time. Only changes when the ticker fires. */
  nowMs: number;
  errorMessage: string | null;
}

export interface RunnerControllerDeps {
  routineId: string;
  routines: Pick<RoutineRepository, 'getWithSteps'>;
  persistence: SessionPersistence;
  clock: Clock;
  tts: TtsService;
  settings: AppSettings;
  generateId?: IdGenerator;
}

const INITIAL_SNAPSHOT: RunnerSnapshot = {
  status: 'loading',
  routine: null,
  steps: [],
  session: null,
  nowMs: 0,
  errorMessage: null,
};

export class RunnerController {
  private readonly deps: RunnerControllerDeps;
  private readonly listeners = new Set<() => void>();
  private snapshot: RunnerSnapshot = INITIAL_SNAPSHOT;
  private loaded = false;
  private disposed = false;

  constructor(deps: RunnerControllerDeps) {
    this.deps = deps;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): RunnerSnapshot => this.snapshot;

  getSession(): ActiveSession | null {
    return this.snapshot.session;
  }

  setSettings(settings: AppSettings): void {
    this.deps.settings = settings;
  }

  /** Load the routine and either resume a stored session or start fresh. */
  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.loaded = true;

    try {
      const loaded = await this.deps.routines.getWithSteps(this.deps.routineId);
      if (this.disposed) {
        return;
      }
      if (!loaded) {
        this.patch({ status: 'missing', errorMessage: '流程不存在' });
        return;
      }

      const nowMs = this.deps.clock.nowMs();
      const stored = await this.deps.persistence.load();
      if (this.disposed) {
        return;
      }

      let session: ActiveSession | null = null;
      let events: RunnerEvent[] = [];

      if (stored && stored.routineId === this.deps.routineId) {
        const outcome = recoverSession({ stored, steps: loaded.steps, nowMs });
        if (outcome.kind === 'resumed') {
          session = outcome.session;
          events = outcome.events;
        } else {
          await this.deps.persistence.clear();
        }
      }

      if (!session) {
        const started = startRunner({
          sessionId: (this.deps.generateId ?? generateId)('ses'),
          routineId: this.deps.routineId,
          steps: loaded.steps,
          nowMs,
        });
        session = started.session;
        events = started.events;
        // A brand new run must not inherit cue de-duplication from an old one.
        this.deps.tts.resetSession();
      }

      this.patch({ status: 'ready', routine: loaded.routine, steps: loaded.steps, session, nowMs });
      this.announceEvents(events);
      await this.persist(session);
    } catch (error) {
      this.patch({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '无法载入流程',
      });
    }
  }

  /** Presentation tick + authoritative boundary resolution. */
  tick(): void {
    const { session, steps } = this.snapshot;
    const nowMs = this.deps.clock.nowMs();

    if (!session || steps.length === 0) {
      this.patch({ nowMs });
      return;
    }

    const result = advanceRunner(session, steps, nowMs);
    if (result.session !== session) {
      this.apply(result.session, result.events, nowMs);
      return;
    }

    this.patch({ nowMs });
    // The countdown warning is time-driven, not event-driven (T085).
    this.announceCues(buildCues({ session, steps, events: [], settings: this.deps.settings, nowMs }));
  }

  control(control: RunnerControl): void {
    const { session, steps } = this.snapshot;
    if (!session) {
      return;
    }
    const nowMs = this.deps.clock.nowMs();
    const result = applyRunnerControl(session, steps, control, nowMs);
    this.apply(result.session, result.events, nowMs);
  }

  /** Single 暂停/继续 control: the intent depends on the authoritative state. */
  togglePause(): void {
    const state = this.snapshot.session?.state;
    if (!state) {
      return;
    }
    this.control(isPaused(state) ? { type: 'RESUME' } : { type: 'PAUSE' });
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  private apply(session: ActiveSession, events: readonly RunnerEvent[], nowMs: number): void {
    this.patch({ session, nowMs });
    this.announceEvents(events);
    void this.persist(session);
  }

  private announceEvents(events: readonly RunnerEvent[]): void {
    const { session, steps } = this.snapshot;
    if (!session || events.length === 0) {
      return;
    }
    this.announceCues(
      buildCues({ session, steps, events, settings: this.deps.settings, nowMs: this.deps.clock.nowMs() }),
    );
  }

  private announceCues(cues: readonly Cue[]): void {
    if (cues.length > 0) {
      this.deps.tts.announceAll(cues);
    }
  }

  private async persist(session: ActiveSession): Promise<void> {
    await this.deps.persistence.save(session);
  }

  private patch(partial: Partial<RunnerSnapshot>): void {
    const next = { ...this.snapshot, ...partial };
    this.snapshot = next;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
