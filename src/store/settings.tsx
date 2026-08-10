import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Ocho — préférences d'affichage (thème, unités), persistées via AsyncStorage. */

const SETTINGS_KEY = 'ocho.settings.v1';

export type ThemeMode = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';

type Settings = {
  themeMode: ThemeMode;
  units: UnitSystem;
};

const DEFAULT_SETTINGS: Settings = { themeMode: 'system', units: 'metric' };

type SettingsContextValue = {
  isLoading: boolean;
  themeMode: ThemeMode;
  units: UnitSystem;
  setThemeMode: (mode: ThemeMode) => void;
  setUnits: (units: UnitSystem) => void;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        // storage illisible → réglages par défaut
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = (next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const setThemeMode = (themeMode: ThemeMode) => persist({ ...settings, themeMode });
  const setUnits = (units: UnitSystem) => persist({ ...settings, units });

  const value = useMemo<SettingsContextValue>(
    () => ({ isLoading, themeMode: settings.themeMode, units: settings.units, setThemeMode, setUnits }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, isLoading],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings doit être utilisé dans un <SettingsProvider>');
  }
  return ctx;
}
