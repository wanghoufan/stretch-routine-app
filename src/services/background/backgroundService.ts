import { AppState, type AppStateStatus } from 'react-native';

/**
 * Android background strategy — Expo Go compatible (T007 decision, T056 wiring).
 *
 * V1 does not run a foreground service. Instead:
 * - the runner's authoritative time is derived from timestamps, so throttled or
 *   suspended JS callbacks can never make the timer drift;
 * - the active session is persisted, so a locked screen or a recreated UI
 *   reconstructs the exact current step and remaining time;
 * - returning to the foreground immediately re-resolves any phase boundaries
 *   that passed while the app was away.
 *
 * The trade-off is explicit and documented in
 * `docs/architecture/background-decision.md`: speech cues that fall due while
 * the process is suspended are not spoken. A development build with a foreground
 * service is the follow-up step, tracked by T062 real-device QA.
 */

export type AppVisibility = 'active' | 'background' | 'inactive';

export interface AppVisibilitySource {
  current(): AppVisibility;
  subscribe(listener: (visibility: AppVisibility) => void): () => void;
}

function normalize(status: AppStateStatus): AppVisibility {
  if (status === 'active') {
    return 'active';
  }
  if (status === 'background') {
    return 'background';
  }
  return 'inactive';
}

/** Real React Native AppState, behind a tiny injectable port. */
export function createAppStateVisibilitySource(): AppVisibilitySource {
  return {
    current() {
      return normalize(AppState.currentState);
    },
    subscribe(listener) {
      const subscription = AppState.addEventListener('change', (status) => {
        listener(normalize(status));
      });
      return () => subscription.remove();
    },
  };
}

/** Test double: the test decides exactly when visibility changes. */
export function createManualVisibilitySource(
  initial: AppVisibility = 'active',
): AppVisibilitySource & { emit: (visibility: AppVisibility) => void } {
  let current = initial;
  const listeners = new Set<(visibility: AppVisibility) => void>();
  return {
    current: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(visibility) {
      current = visibility;
      for (const listener of listeners) {
        listener(visibility);
      }
    },
  };
}
