/**
 * Monotonic clock port (PRODUCT_PLAN_V1.2 Technical Approach — Clock; R007).
 *
 * `nowElapsedMs()` is milliseconds since an arbitrary, process-stable origin
 * that must **not** be affected by wall-clock changes. It is the single source
 * of truth for every authoritative runner duration: countdowns, catch-up,
 * pause/resume and same-boot recovery.
 *
 * ── Native TODO (deferred to the build/native channel, R004–R006) ───────────
 * The real implementation must read Android `elapsedRealtime()` (which keeps
 * counting through Deep Sleep/Doze and is immune to user/network clock changes)
 * from the `modules/stretch-runtime` local Expo module. Until that module can be
 * built and verified on device, `ExpoGoMonotonicClock` below falls back to
 * `Date.now()` so the JS layer stays developable in Expo Go.
 *
 * The fallback is deliberately isolated behind this port:
 *   - domain code never calls `Date.now()` for timing;
 *   - tests use `FakeMonotonicClock`, so behaviour is verified against a true
 *     monotonic source independent of the wall clock (see R013 wall-jump tests);
 *   - swapping in the native source is a one-line composition-root change.
 */
export interface MonotonicClock {
  nowElapsedMs(): number;
}

/**
 * Expo Go / pure-JS fallback.
 *
 * `Date.now()` is wall-clock backed, therefore **not** truly monotonic: a wall
 * jump would move it. It is acceptable only as an interim development source
 * and MUST be replaced by native `elapsedRealtime` before any native Exit Gate
 * or timing claim (R006 / R028). `bootInfo` and recovery treat a bootCount
 * mismatch conservatively, which is what keeps the fallback from auto-playing
 * across a process restart.
 */
export class ExpoGoMonotonicClock implements MonotonicClock {
  nowElapsedMs(): number {
    // TODO(native R006): replace with `StretchRuntime.nowElapsedMs()` backed by
    // Android elapsedRealtime. Do not ship timing claims built on Date.now().
    return Date.now();
  }
}

/**
 * Test monotonic clock. Independent of any wall clock: `advanceWallClock` never
 * touches it, which is exactly how the ±1h/±1d wall-jump tests prove the runner
 * timing is unaffected.
 */
export class FakeMonotonicClock implements MonotonicClock {
  private current: number;

  constructor(startMs = 0) {
    this.current = startMs;
  }

  nowElapsedMs(): number {
    return this.current;
  }

  /** Move monotonic time forward (the only thing that may move it). */
  advance(ms: number): void {
    if (ms < 0) {
      throw new Error('FakeMonotonicClock cannot move backwards');
    }
    this.current += ms;
  }

  set(ms: number): void {
    this.current = ms;
  }
}
