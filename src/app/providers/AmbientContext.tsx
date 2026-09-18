import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AmbientPlayer } from '../../services/audio/ambientAudioService';
import { createExpoAudioAmbientPlayer } from '../../services/audio/expoAudioAmbientPlayer';

/**
 * App-wide ambient loop player (TASK-011).
 *
 * One player instance is shared by the whole app; the runner builds a
 * state-driven service on top of it. Tests inject a recording double so no
 * native audio (or bundled asset) is touched.
 */
const AmbientPlayerContext = createContext<AmbientPlayer | null>(null);

export function AmbientProvider({
  children,
  player,
}: {
  children: ReactNode;
  player?: AmbientPlayer;
}) {
  const value = useMemo(() => player ?? createExpoAudioAmbientPlayer(), [player]);
  return <AmbientPlayerContext.Provider value={value}>{children}</AmbientPlayerContext.Provider>;
}

export function useAmbientPlayer(): AmbientPlayer {
  const value = useContext(AmbientPlayerContext);
  if (!value) {
    throw new Error('useAmbientPlayer 必须在 AmbientProvider 内使用');
  }
  return value;
}
