import type { ReactNode } from 'react';
import type { AppServices } from './createAppServices';
import { ServicesProvider } from './ServicesContext';
import { SettingsProvider } from './SettingsContext';
import { SpeechProvider } from './SpeechContext';
import type { TtsSpeaker } from '../../services/tts/ttsService';

/**
 * App-wide providers, in dependency order:
 * services -> settings -> speech.
 *
 * Navigation is deliberately not included: screens and tests can supply their
 * own navigation value.
 */
export function AppProviders({
  services,
  speaker,
  children,
}: {
  services: AppServices;
  speaker?: TtsSpeaker;
  children: ReactNode;
}) {
  return (
    <ServicesProvider services={services}>
      <SettingsProvider>
        <SpeechProvider speaker={speaker}>{children}</SpeechProvider>
      </SettingsProvider>
    </ServicesProvider>
  );
}
