/**
 * TTS cue service with de-duplication and safe queueing (T043, T054, T060, T084).
 *
 * Design rules from PLAN §8:
 * - a cue is identified by a key, so UI re-renders never repeat it;
 * - rapid skip/previous never floods the device queue;
 * - TTS failure is reported but never stops the runner.
 *
 * The service depends on a small `TtsSpeaker` port so tests can drive it
 * without native speech.
 */

export interface TtsSpeaker {
  speak(
    text: string,
    options: {
      rate: number;
      onDone?: () => void;
      onError?: (error: unknown) => void;
    },
  ): void;
  stop(): void;
}

export interface Cue {
  /** Stable identity, e.g. `step:<sessionId>:<index>:start`. */
  key: string;
  text: string;
  /** Interrupt the current utterance (step changes, completion). */
  interrupt?: boolean;
}

export interface TtsServiceOptions {
  speaker: TtsSpeaker;
  /** Read lazily so a settings change applies to the next cue (T084). */
  isEnabled: () => boolean;
  getRate: () => number;
  onError?: (error: unknown) => void;
}

export class TtsService {
  private readonly speaker: TtsSpeaker;
  private readonly isEnabled: () => boolean;
  private readonly getRate: () => number;
  private onError?: (error: unknown) => void;

  private delivered = new Set<string>();
  /** At most one cue waits; a newer cue replaces an older one. */
  private pending: Cue | null = null;
  private speaking = false;
  private generation = 0;
  private lastError: string | null = null;

  constructor(options: TtsServiceOptions) {
    this.speaker = options.speaker;
    this.isEnabled = options.isEnabled;
    this.getRate = options.getRate;
    this.onError = options.onError;
  }

  /** True when the cue was newly queued (false = duplicate or speech disabled). */
  announce(cue: Cue): boolean {
    if (!this.isEnabled()) {
      return false;
    }
    if (this.delivered.has(cue.key)) {
      return false;
    }
    this.delivered.add(cue.key);

    if (cue.interrupt) {
      this.cancelCurrent();
      this.pending = cue;
      this.flush();
      return true;
    }

    if (this.speaking) {
      // Newest wins; the older pending cue is dropped rather than queued up.
      this.pending = cue;
      return true;
    }

    this.pending = cue;
    this.flush();
    return true;
  }

  announceAll(cues: readonly Cue[]): number {
    let queued = 0;
    for (const cue of cues) {
      if (this.announce(cue)) {
        queued += 1;
      }
    }
    return queued;
  }

  /** Forget delivered keys and silence anything queued (new session / stop). */
  resetSession(): void {
    this.delivered = new Set<string>();
    this.pending = null;
    this.cancelCurrent();
  }

  /** Stop speaking without forgetting de-duplication state. */
  silence(): void {
    this.pending = null;
    this.cancelCurrent();
  }

  getLastError(): string | null {
    return this.lastError;
  }

  clearError(): void {
    this.lastError = null;
  }

  private cancelCurrent(): void {
    this.generation += 1;
    if (this.speaking) {
      try {
        this.speaker.stop();
      } catch (error) {
        this.reportError(error);
      }
    }
    this.speaking = false;
  }

  private flush(): void {
    if (this.speaking || this.pending === null) {
      return;
    }
    const cue = this.pending;
    this.pending = null;
    this.speaking = true;
    const generation = this.generation;

    try {
      this.speaker.speak(cue.text, {
        rate: this.getRate(),
        onDone: () => this.finish(generation),
        onError: (error) => {
          this.reportError(error);
          this.finish(generation);
        },
      });
    } catch (error) {
      // A throwing speaker must not break runner timing (FR-031).
      this.reportError(error);
      this.finish(generation);
    }
  }

  private finish(generation: number): void {
    if (generation !== this.generation) {
      return;
    }
    this.speaking = false;
    this.flush();
  }

  private reportError(error: unknown): void {
    this.lastError = error instanceof Error ? error.message : String(error);
    this.onError?.(error);
  }
}

/** Convenience: base key for the session-scoped cues. */
export function cueKey(sessionId: string, kind: string, detail: string | number): string {
  return `${kind}:${sessionId}:${detail}`;
}
