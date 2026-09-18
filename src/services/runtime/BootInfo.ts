/**
 * Boot / process identity port (R012, R032).
 *
 * Recovery must be able to tell "the same process is still alive" apart from
 * "the process restarted". Only in the first case may a stored active session
 * be continued automatically.
 *
 * ── Native TODO (deferred to the build/native channel, R004–R006) ───────────
 * The real implementation reads a per-boot counter from the
 * `modules/stretch-runtime` local Expo module (Android boot count /
 * elapsedRealtime boot identity).
 *
 * Until then `ExpoGoBootInfoProvider` approximates it with a value captured
 * once per JS context at import time. This is conservative by construction:
 *   - while the process lives (background, lock screen, Activity recreation,
 *     Recents swipe with the process still alive) the value is stable, so the
 *     session can be continued;
 *   - after a real process restart the JS context is recreated, the value
 *     changes, and recovery treats it as a boot mismatch -> discard +
 *     no automatic playback (fail-safe).
 * It never *under*-detects a restart, which is the safe direction.
 */
export interface BootInfoProvider {
  getBootCount(): number;
}

export class ExpoGoBootInfoProvider implements BootInfoProvider {
  // TODO(native R006): replace with `StretchRuntime.getBootCount()`.
  private readonly bootCount = Date.now();

  getBootCount(): number {
    return this.bootCount;
  }
}

/** Test provider: boot identity is explicit and never accidental. */
export class FakeBootInfoProvider implements BootInfoProvider {
  constructor(private bootCount = 1) {}

  getBootCount(): number {
    return this.bootCount;
  }

  /** Simulate a device/process restart. */
  setBootCount(bootCount: number): void {
    this.bootCount = bootCount;
  }
}
