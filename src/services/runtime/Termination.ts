/**
 * Last process exit reason port (R012, R032).
 *
 * Android exposes the previous process termination through `ApplicationExitInfo`.
 * `REASON_USER_REQUESTED` is a **conservative** signal: it covers Recents swipe,
 * Force Stop and Task Manager Stop alike. It therefore means "do not auto-play",
 * never "the user only swiped away". The conservative direction is always to
 * stay silent until an explicit Start/Continue.
 *
 * API < 30 has no trustworthy signal at all -> fail-safe (no auto-play).
 *
 * ── Native TODO (deferred to the build/native channel, R004–R006) ───────────
 * The real provider reads raw reason/time from the native module. The Expo Go
 * provider below intentionally reports `trusted: false`, which is exactly the
 * API < 30 fail-safe behaviour: recovery will not announce automatically.
 */
export const USER_REQUESTED_REASON = 'REASON_USER_REQUESTED';

export interface TerminationSignal {
  /**
   * True only when the platform (API >= 30 + native module) can supply a
   * trustworthy exit signal. `false` forces the conservative path.
   */
  trusted: boolean;
  /** Raw platform reason (e.g. `REASON_USER_REQUESTED`); null when unknown. */
  lastReason: string | null;
}

export interface ProcessTerminationProvider {
  getTerminationSignal(): TerminationSignal;
}

export class ExpoGoProcessTerminationProvider implements ProcessTerminationProvider {
  getTerminationSignal(): TerminationSignal {
    // No native ApplicationExitInfo access in Expo Go / pure JS -> untrusted.
    // TODO(native R006): return the raw reason from StretchRuntime.
    return { trusted: false, lastReason: null };
  }
}

/** Test provider: lets tests pin the exact platform signal. */
export class FakeProcessTerminationProvider implements ProcessTerminationProvider {
  constructor(private signal: TerminationSignal = { trusted: true, lastReason: null }) {}

  getTerminationSignal(): TerminationSignal {
    return this.signal;
  }

  set(signal: TerminationSignal): void {
    this.signal = signal;
  }
}

/**
 * Whether recovery must stay silent: a trusted `REASON_USER_REQUESTED`, or no
 * trustworthy signal at all (API < 30 / native unavailable).
 */
export function isConservativeTermination(signal: TerminationSignal): boolean {
  if (!signal.trusted) {
    return true;
  }
  return signal.lastReason === USER_REQUESTED_REASON;
}
