import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setCategoryEnabled, ensureNotificationPermission, NotificationCategory } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/**
 * Ocho — préférences d'affichage (thème, unités) et de notifications,
 * synchronisées avec la table Supabase `user_settings`. AsyncStorage reste
 * un cache de lecture instantanée — voir la migration
 * `20260825080613_profiles_and_settings.sql`.
 *
 * Important : ceci synchronise la *préférence* (« hydratation activée »),
 * pas la programmation OS des rappels — chaque appareil ré-arme ses propres
 * notifications locales (`src/lib/notifications.ts`) à partir de la valeur
 * synchronisée, il n'y a pas de push distant introduit ici.
 */

const SETTINGS_KEY = 'ocho.settings.v1';

export type ThemeMode = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';

export type NotificationSettings = {
  hydration: boolean;
  meals: boolean;
  workout: boolean;
  weeklyWeighIn: boolean;
  /** Pas programmée à l'avance (déclenchée en réaction à une pesée) — juste une préférence ici. */
  goalReached: boolean;
};

export type Settings = {
  themeMode: ThemeMode;
  units: UnitSystem;
  notifications: NotificationSettings;
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  hydration: false,
  meals: false,
  workout: false,
  weeklyWeighIn: false,
  goalReached: false,
};

const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  units: 'metric',
  notifications: DEFAULT_NOTIFICATIONS,
};

type SettingsContextValue = {
  isLoading: boolean;
  themeMode: ThemeMode;
  units: UnitSystem;
  notifications: NotificationSettings;
  setThemeMode: (mode: ThemeMode) => void;
  setUnits: (units: UnitSystem) => void;
  /** Programme/annule les rappels et persiste le réglage. Retourne `false` si la permission a été refusée (réglage alors laissé à off). */
  setNotificationCategory: (category: NotificationCategory, enabled: boolean) => Promise<boolean>;
  /** Pas de programmation ici, juste la préférence + une vérification de permission si on l'active. */
  setGoalReachedEnabled: (enabled: boolean) => Promise<boolean>;
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

type SettingsRow = {
  theme_mode: ThemeMode;
  units: UnitSystem;
  notifications: NotificationSettings;
};

const fromRow = (row: SettingsRow): Settings => ({
  themeMode: row.theme_mode,
  units: row.units,
  notifications: { ...DEFAULT_NOTIFICATIONS, ...row.notifications },
});

const toRow = (userId: string, s: Settings) => ({
  user_id: userId,
  theme_mode: s.themeMode,
  units: s.units,
  notifications: s.notifications,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
            notifications: { ...DEFAULT_NOTIFICATIONS, ...parsed.notifications },
          });
        }
      } catch {
        // storage illisible → réglages par défaut
      } finally {
        setIsLoading(false);
      }
    })();

    supabase
      .from('user_settings')
      .select('theme_mode, units, notifications')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const fresh = fromRow(data as SettingsRow);
        setSettings(fresh);
        AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(fresh)).catch(() => {});
      });
  }, [user]);

  const persist = (next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
    if (user) {
      supabase
        .from('user_settings')
        .upsert(toRow(user.id, next))
        .then(({ error }) => {
          if (error) console.warn('Échec de synchronisation des réglages :', error.message);
        });
    }
  };

  const setThemeMode = (themeMode: ThemeMode) => persist({ ...settings, themeMode });
  const setUnits = (units: UnitSystem) => persist({ ...settings, units });

  const setNotificationCategory = async (category: NotificationCategory, enabled: boolean) => {
    const ok = await setCategoryEnabled(category, enabled);
    persist({ ...settings, notifications: { ...settings.notifications, [category]: ok ? enabled : false } });
    return ok;
  };

  const setGoalReachedEnabled = async (enabled: boolean) => {
    const ok = enabled ? await ensureNotificationPermission() : true;
    persist({ ...settings, notifications: { ...settings.notifications, goalReached: ok ? enabled : false } });
    return ok;
  };

  const value = useMemo<SettingsContextValue>(
    () => ({
      isLoading,
      themeMode: settings.themeMode,
      units: settings.units,
      notifications: settings.notifications,
      setThemeMode,
      setUnits,
      setNotificationCategory,
      setGoalReachedEnabled,
    }),
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
