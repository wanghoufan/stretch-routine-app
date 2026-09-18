import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createExpoSpeechSpeaker } from '../../services/tts/expoSpeechSpeaker';
import { TtsService, type TtsSpeaker } from '../../services/tts/ttsService';
import { useSettings } from './SettingsContext';

export interface SpeechContextValue {
  tts: TtsService;
  /** Non-fatal speech problem; the runner keeps working visually (FR-031). */
  ttsError: string | null;
  dismissTtsError: () => void;
}

const SpeechContext = createContext<SpeechContextValue | null>(null);

export function SpeechProvider({
  children,
  speaker,
}: {
  children: ReactNode;
  /** Injectable so tests and non-device targets can run without native speech. */
  speaker?: TtsSpeaker;
}) {
  const { settings } = useSettings();
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Settings are read lazily through refs so a change applies to the next cue
  // instead of rebuilding the service mid-routine (T084).
  const settingsRef = useMemo(() => ({ current: settings }), []);
  settingsRef.current = settings;

  const tts = useMemo(
    () =>
      new TtsService({
        speaker: speaker ?? createExpoSpeechSpeaker(),
        isEnabled: () => settingsRef.current.ttsEnabled,
        getRate: () => settingsRef.current.speechRate,
        onError: (error) => {
          setTtsError(error instanceof Error ? error.message : String(error));
        },
      }),
    [speaker, settingsRef],
  );

  useEffect(() => {
    return () => {
      tts.silence();
      tts.resetSession();
    };
  }, [tts]);

  const value = useMemo<SpeechContextValue>(
    () => ({
      tts,
      ttsError,
      dismissTtsError: () => setTtsError(null),
    }),
    [tts, ttsError],
  );

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech(): SpeechContextValue {
  const value = useContext(SpeechContext);
  if (!value) {
    throw new Error('useSpeech 必须在 SpeechProvider 内使用');
  }
  return value;
}
