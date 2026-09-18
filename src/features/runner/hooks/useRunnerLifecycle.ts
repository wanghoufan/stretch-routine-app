import { useEffect } from 'react';
import type { AppVisibilitySource } from '../../../services/background/backgroundService';

/**
 * Screen lock / app switch handling (T059, FR-029).
 *
 * Going to the background persists the authoritative session; coming back
 * re-resolves every boundary that passed while the app was away, so the screen
 * matches the authoritative time without ever restarting the routine.
 */
export function useRunnerLifecycle(options: {
  source: AppVisibilitySource;
  onForeground: () => void;
  onBackground: () => void;
}): void {
  const { source, onForeground, onBackground } = options;

  useEffect(() => {
    const unsubscribe = source.subscribe((visibility) => {
      if (visibility === 'active') {
        onForeground();
      } else {
        onBackground();
      }
    });
    return unsubscribe;
  }, [source, onForeground, onBackground]);
}
