import { isRunning, type RunnerState } from '../../domain/session/RunnerState';
import {
  AMBIENT_SOUND_META,
  type AmbientSoundOption,
} from '../../features/settings/ambientSound';

/**
 * Ambient background loop player (TASK-011).
 *
 * The runner is state-driven, so playback is reconciled from the authoritative
 * `RunnerState`: the loop only runs in `RUNNING_STEP` / `RUNNING_TRANSITION` and
 * is stopped by pause, completion, stop or error. `silent` never touches the
 * player at all.
 *
 * `AmbientPlayer` is a tiny port so tests drive the service without native
 * audio (mirrors `TtsSpeaker`).
 */
export interface AmbientPlayer {
  /** Start (or switch to) a looping source. Never called for `silent`. */
  play(option: AmbientSoundOption, options: { volume: number }): void;
  /** Stop the current loop. Must tolerate being called without a player. */
  stop(): void;
  /** Release native resources. */
  dispose?(): void;
}

export interface AmbientAudioServiceOptions {
  player: AmbientPlayer;
  onError?: (error: unknown) => void;
}

export class AmbientAudioService {
  private readonly player: AmbientPlayer;
  private readonly onError?: (error: unknown) => void;

  /** Option currently looping, or null when stopped / silent. */
  private active: AmbientSoundOption | null = null;
  private lastError: string | null = null;

  constructor(options: AmbientAudioServiceOptions) {
    this.player = options.player;
    this.onError = options.onError;
  }

  getActiveOption(): AmbientSoundOption | null {
    return this.active;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Reconcile playback with the runner state and the user's choice.
   *
   * Safe to call on every tick / render: it is a no-op unless the desired loop
   * actually changed, which is what makes "switch takes effect immediately" and
   * "pause/end stops it" the same code path.
   */
  sync(state: RunnerState | null, option: AmbientSoundOption): AmbientSoundOption | null {
    const shouldPlay = state !== null && isRunning(state) && option !== 'silent';
    if (!shouldPlay) {
      this.stop();
      return null;
    }
    if (this.active === option) {
      return this.active;
    }

    // Switching sources: stop the old loop before starting the new one.
    this.stop();
    try {
      this.player.play(option, { volume: AMBIENT_SOUND_META[option].volume });
      this.active = option;
    } catch (error) {
      // A failed loop must never disturb the routine (same rule as TTS).
      this.active = null;
      this.reportError(error);
    }
    return this.active;
  }

  /** Stop looping; safe to call repeatedly and when nothing is playing. */
  stop(): void {
    if (this.active === null) {
      return;
    }
    this.active = null;
    try {
      this.player.stop();
    } catch (error) {
      this.reportError(error);
    }
  }

  dispose(): void {
    this.stop();
    try {
      this.player.dispose?.();
    } catch (error) {
      this.reportError(error);
    }
  }

  private reportError(error: unknown): void {
    this.lastError = error instanceof Error ? error.message : String(error);
    this.onError?.(error);
  }
}
