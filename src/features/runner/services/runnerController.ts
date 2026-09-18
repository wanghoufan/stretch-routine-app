import type { RoutineStep } from '../../../domain/routine/RoutineStep';
import type { ActiveSession } from '../../../domain/session/ActiveSession';
import { isPaused } from '../../../domain/session/RunnerState';
import type { AppSettings } from '../../settings/settingsModel';
import type { MonotonicClock } from '../../../services/clock';
import type { BootInfoProvider } from '../../../services/runtime/BootInfo';
import type { ProcessTerminationProvider } from '../../../services/runtime/Termination';
import { TtsService, type Cue } from '../../../services/tts/ttsService';
import type { AmbientAudioService } from '../../../services/audio/ambientAudioService';
import {
  advanceRunner,
  applyRunnerControl,
  type RunnerControl,
  type RunnerEvent,
} from '../domain/runnerMachine';
import { buildCues } from './runnerCueCoordinator';
import { recoverSession } from './sessionRecovery';
import type { SessionPersistence } from './sessionPersistence';

/**
 * Imperative runner controller (R019).
 *
 * The controller is **ActiveSession-driven**: everything it plays comes from the
 * session's immutable `snapshot`, never from the source Routine. A routine edit
 * or delete therefore cannot affect an in-flight run, and the Runner route no
 * longer needs a `routineId`.
 *
 * Keeping this outside React means the whole hands-free flow is testable
 * without rendering anything. The React hook (`useRunner`) is a thin
 * `useSyncExternalStore` wrapper.
 */

export type RunnerStatus = 'loading' | 'ready' | 'missing' | 'error';

export interface RunnerSnapshot {
  status: RunnerStatus;
  session: ActiveSession | null;
  /** Steps of the immutable snapshot; empty until the session loads. */
  steps: readonly RoutineStep[];
  routineName: string | null;
  /** Presentation time (monotonic). Only changes when the ticker fires. */
  nowElapsedMs: number;
  errorMessage: string | null;
}

export interface RunnerControllerDeps {
  persistence: SessionPersistence;
  monotonic: MonotonicClock;
  bootInfo: BootInfoProvider;
  termination: ProcessTerminationProvider;
  tts: TtsService;
  /** Countdown background loop, reconciled from the runner state (TASK-011). */
  ambient: AmbientAudioService;
  settings: AppSettings;
}

const INITIAL_SNAPSHOT: RunnerSnapshot = {
  status: 'loading',
  session: null,
  steps: [],
  routineName: null,
  nowElapsedMs: 0,
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
    // "Switch takes effect immediately": reconcile the loop right away, even
    // between ticks, so a settings change is audible at once.
    this.syncAmbient();
  }

  /** Load the stored active session and resume it if it is safe to do so. */
  async load(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.loaded = true;

    try {
      const loaded = await this.deps.persistence.load();
      if (this.disposed) {
        return;
      }

      if (loaded.status === 'corrupt') {
        this.patch({ status: 'missing', errorMessage: `会话数据损坏，已安全清除：${loaded.reason}` });
        return;
      }
      if (loaded.status === 'none') {
        this.patch({ status: 'missing', errorMessage: '没有进行中的流程' });
        return;
      }

      const nowElapsedMs = this.deps.monotonic.nowElapsedMs();
      const outcome = recoverSession({
        stored: loaded.session,
        nowElapsedMs,
        currentBootCount: this.deps.bootInfo.getBootCount(),
        termination: this.deps.termination.getTerminationSignal(),
      });

      if (outcome.kind === 'discarded') {
        await this.deps.persistence.clear();
        this.patch({ status: 'missing', errorMessage: `无法恢复上次流程（${outcome.reason}）` });
        return;
      }
      if (outcome.kind !== 'resumed') {
        this.patch({ status: 'missing', errorMessage: '没有进行中的流程' });
        return;
      }

      const { session, events, autoPlay } = outcome;
      this.patch({
        status: 'ready',
        session,
        steps: session.snapshot.steps,
        routineName: session.routineName,
        nowElapsedMs,
      });
      // Conservative termination / API < 30: rebuild the session silently.
      if (autoPlay) {
        this.announceEvents(events);
      }
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
    const nowElapsedMs = this.deps.monotonic.nowElapsedMs();

    if (!session || steps.length === 0) {
      this.patch({ nowElapsedMs });
      return;
    }

    const result = advanceRunner(session, steps, nowElapsedMs);
    if (result.session !== session) {
      this.apply(result.session, result.events, nowElapsedMs);
      return;
    }

    this.patch({ nowElapsedMs });
    // The countdown warning is time-driven, not event-driven (T085).
    this.announceCues(
      buildCues({ session, steps, events: [], settings: this.deps.settings, nowElapsedMs }),
    );
  }

  control(control: RunnerControl): void {
    const { session, steps } = this.snapshot;
    if (!session) {
      return;
    }
    const nowElapsedMs = this.deps.monotonic.nowElapsedMs();
    const result = applyRunnerControl(session, steps, control, nowElapsedMs);
    this.apply(result.session, result.events, nowElapsedMs);
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
    this.deps.ambient.dispose();
    this.listeners.clear();
  }

  private apply(session: ActiveSession, events: readonly RunnerEvent[], nowElapsedMs: number): void {
    this.patch({ session, nowElapsedMs });
    this.announceEvents(events);
    void this.persist(session);
  }

  private announceEvents(events: readonly RunnerEvent[]): void {
    const { session, steps } = this.snapshot;
    if (!session || events.length === 0) {
      return;
    }
    this.announceCues(
      buildCues({
        session,
        steps,
        events,
        settings: this.deps.settings,
        nowElapsedMs: this.deps.monotonic.nowElapsedMs(),
      }),
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
    this.syncAmbient();
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Drive the background loop from the authoritative state. Idempotent, so it
   * is safe to call on every tick as well as on state/settings changes.
   */
  private syncAmbient(): void {
    this.deps.ambient.sync(
      this.snapshot.session?.state ?? null,
      this.deps.settings.ambientSound,
    );
  }
}
