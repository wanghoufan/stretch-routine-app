import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, normalizeSettings, type AppSettings } from '../../features/settings/settingsModel';
import { useServices } from './ServicesContext';

export interface SettingsContextValue {
  settings: AppSettings;
  loading: boolean;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const services = useServices();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    services.settings
      .load()
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        settingsRef.current = loaded;
        setSettings(loaded);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [services]);

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = normalizeSettings({ ...settingsRef.current, ...patch });
      settingsRef.current = next;
      setSettings(next);
      await services.settings.save(next);
    },
    [services],
  );

  return (
    <SettingsContext.Provider value={{ settings, loading, update }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings 必须在 SettingsProvider 内使用');
  }
  return value;
}
