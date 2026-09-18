/**
 * Presentation ticker port.
 *
 * The runner re-renders on ticks, but ticks are *presentation only*: they never
 * drive authoritative time (Constitution V, PLAN §5 rule 2). Injecting the
 * ticker lets tests step the UI without real timers.
 */
export interface Ticker {
  /** Start calling `callback` every `intervalMs`. Returns a stop function. */
  start(callback: () => void, intervalMs: number): () => void;
}

export function createSystemTicker(): Ticker {
  return {
    start(callback, intervalMs) {
      const handle = setInterval(callback, intervalMs);
      // React Native's setInterval returns a number; Node's returns a Timeout.
      return () => clearInterval(handle as unknown as Parameters<typeof clearInterval>[0]);
    },
  };
}

export interface ManualTicker extends Ticker {
  /** Fire the registered callback once, as a real tick would. */
  fire(): void;
  isRunning(): boolean;
}

/** Test ticker: nothing happens until the test calls `fire()`. */
export function createManualTicker(): ManualTicker {
  let callback: (() => void) | null = null;
  return {
    start(next) {
      callback = next;
      return () => {
        callback = null;
      };
    },
    fire() {
      callback?.();
    },
    isRunning() {
      return callback !== null;
    },
  };
}
