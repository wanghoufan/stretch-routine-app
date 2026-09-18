import { act, fireEvent, screen } from '@testing-library/react-native';
import type { FakeClock } from '../../services/clock/Clock';
import type { ManualTicker } from '../../services/ticker/ticker';

/**
 * Shared helpers for screen-level integration tests.
 *
 * The app under test is the real navigator with the real providers, backed by a
 * real in-memory SQLite database, a fake clock and a manual ticker.
 */

/** Move fake time forward and let the runner observe the new time. */
export function advanceTime(clock: FakeClock, ticker: ManualTicker, ms: number): void {
  act(() => {
    clock.advance(ms);
    ticker.fire();
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
