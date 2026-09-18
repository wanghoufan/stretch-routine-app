/**
 * Wall clock port (PRODUCT_PLAN_V1.2 Technical Approach — Clock).
 *
 * A `WallClock` reads real-world time (Unix epoch ms). It is used **only** for
 * human-facing timestamps such as `createdAt` / `updatedAt` on user-owned rows,
 * and for age/display decisions that intentionally follow the calendar.
 *
 * It must never drive countdowns: the device wall clock can jump by ±hours or
 * ±days (network sync, user change, DST) and the authoritative runner timing is
 * monotonic — see `MonotonicClock`.
 */
export interface WallClock {
  nowMs(): number;
}

/** Production wall clock: milliseconds since the Unix epoch. */
export class SystemWallClock implements WallClock {
  nowMs(): number {
    return Date.now();
  }
}

/**
 * Test wall clock. Time never moves unless the test moves it, which keeps
 * timestamp tests instant and lets tests simulate arbitrary wall-clock jumps.
 */
export class FakeClock implements WallClock {
  private current: number;

  constructor(startMs = 0) {
    this.current = startMs;
  }

  nowMs(): number {
    return this.current;
  }

  /** Move time forward (or backward, to simulate a wall-clock correction). */
  advance(ms: number): void {
    this.current += ms;
  }

  /** Jump to an absolute wall timestamp. */
  set(ms: number): void {
    this.current = ms;
  }
}
