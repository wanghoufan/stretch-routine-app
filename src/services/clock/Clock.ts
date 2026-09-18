/**
 * Clock abstraction (PLAN §6).
 *
 * All authoritative runner timing reads `nowMs()` from this port so the domain
 * can be tested with a fake clock instead of real timers.
 */
export interface Clock {
  nowMs(): number;
}

/** Production clock: wall-clock milliseconds since the Unix epoch. */
export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }
}

/**
 * Test clock. Time never moves unless the test moves it, which keeps runner
 * timing tests instant and deterministic.
 */
export class FakeClock implements Clock {
  private current: number;

  constructor(startMs = 0) {
    this.current = startMs;
  }

  nowMs(): number {
    return this.current;
  }

  /** Move time forward. */
  advance(ms: number): void {
    if (ms < 0) {
      throw new Error('FakeClock cannot move backwards');
    }
    this.current += ms;
  }

  /** Jump to an absolute timestamp. */
  set(ms: number): void {
    this.current = ms;
  }
}
