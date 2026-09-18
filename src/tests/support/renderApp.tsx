import type { ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react-native';
import { AppProviders } from '../../app/providers/AppProviders';
import { NavigationProvider } from '../../app/navigation/NavigationContext';
import { AppNavigator } from '../../app/navigation/AppNavigator';
import { HOME_ROUTE, type Route } from '../../app/navigation/routes';
import type { AppServices } from '../../app/providers/createAppServices';
import type { TtsSpeaker } from '../../services/tts/ttsService';

/**
 * Render the real navigator with the app's providers, starting at a chosen
 * route. Integration tests drive whole flows through the UI this way.
 */
export function renderApp(options: {
  services: AppServices;
  speaker: TtsSpeaker;
  initialRoute?: Route;
}): RenderResult {
  const { services, speaker, initialRoute = HOME_ROUTE } = options;
  return render(
    <AppProviders services={services} speaker={speaker}>
      <NavigationProvider initialRoute={initialRoute}>
        <AppNavigator />
      </NavigationProvider>
    </AppProviders>,
  );
}

/** Render a single screen (or any element) inside the app providers. */
export function renderInApp(options: {
  services: AppServices;
  speaker: TtsSpeaker;
  ui: ReactElement;
  initialRoute?: Route;
}): RenderResult {
  const { services, speaker, ui, initialRoute = HOME_ROUTE } = options;
  return render(
    <AppProviders services={services} speaker={speaker}>
      <NavigationProvider initialRoute={initialRoute}>{ui}</NavigationProvider>
    </AppProviders>,
  );
}
