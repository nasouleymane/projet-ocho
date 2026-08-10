import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';
import { lightColors, darkColors, lightMacroColors, darkMacroColors, ColorPalette, MacroPalette } from './colors';
import { cardShadowFor } from './tokens';

export type Scheme = 'light' | 'dark';

type ThemeValue = {
  scheme: Scheme;
  colors: ColorPalette;
  macroColors: MacroPalette;
  cardShadow: ReturnType<typeof cardShadowFor>;
};

const ThemeContext = createContext<ThemeValue | undefined>(undefined);

/**
 * Fournit le thème courant (clair/sombre) à toute l'app. Réagit à la fois au
 * réglage utilisateur (`themeMode` dans les préférences) et, en mode
 * « system », au thème du téléphone (`useColorScheme`).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const { themeMode } = useSettings();

  const scheme: Scheme = themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;

  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
      macroColors: scheme === 'dark' ? darkMacroColors : lightMacroColors,
      cardShadow: cardShadowFor(scheme),
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé dans un <ThemeProvider>');
  }
  return ctx;
}
