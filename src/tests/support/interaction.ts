import { act, fireEvent, screen } from '@testing-library/react-native';
import type { FakeClock } from '../../services/clock';
import type { FakeMonotonicClock } from '../../services/clock';
import type { ManualTicker } from '../../services/ticker/ticker';

/**
 * Shared helpers for screen-level integration tests.
 *
 * The app under test is the real navigator with the real providers, backed by a
 * real in-memory SQLite database, fake clocks and a manual ticker.
 */

/** Anything that can move time: the test context satisfies this. */
export interface Timeline {
  /** Wall clock (createdAt / display). */
  clock: FakeClock;
  /** Monotonic runner clock (authoritative countdown). */
  monotonic: FakeMonotonicClock;
  ticker: ManualTicker;
}

/**
 * Move fake time forward and let the runner observe the new time.
 *
 * Both clocks advance together so the test models "real time passed": the wall
 * clock for display and the monotonic clock for the countdown. Tests that need
 * to prove a *wall jump* does not affect timing use `clock.set()` directly.
 */
export function advanceTime(timeline: Timeline, ms: number): void {
  act(() => {
    timeline.clock.advance(ms);
    timeline.monotonic.advance(ms);
    timeline.ticker.fire();
  });
}

/** Press a testID'd control and let the resulting async work settle. */
export async function press(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
  });
}

/** Type into a testID'd field. */
export async function type(testID: string, text: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(testID), text);
  });
}
