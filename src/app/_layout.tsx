import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from '@/store/profile';
import { JournalProvider } from '@/store/journal';
import { WorkoutsProvider } from '@/store/workouts';
import { WeightProvider } from '@/store/weight';
import { PhotosProvider } from '@/store/photos';
import { SettingsProvider } from '@/store/settings';
import { ThemeProvider, useTheme } from '@/theme';

/**
 * Layout racine (Stack). Profil (onboarding), Journal, Entraînements, Poids,
 * Photos et Préférences sont chargés ici et partagés à toute l'app.
 * `SettingsProvider` doit englober `ThemeProvider` (le thème dépend du
 * réglage `themeMode`). Les écrans à onglets vivent dans `(tabs)` ;
 * `onboarding`/`workouts`/`photos` sont hors navigation basse (push),
 * `add-food`/`add-workout`/`add-weight` en modal.
 */
export default function RootLayout() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <ProfileProvider>
          <JournalProvider>
            <WorkoutsProvider>
              <WeightProvider>
                <PhotosProvider>
                  <SafeAreaProvider>
                    <RootNavigation />
                  </SafeAreaProvider>
                </PhotosProvider>
              </WeightProvider>
            </WorkoutsProvider>
          </JournalProvider>
        </ProfileProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

/** Séparé de `RootLayout` pour pouvoir consommer `useTheme()` (doit être sous `ThemeProvider`). */
function RootNavigation() {
  const { colors, scheme } = useTheme();

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="workouts" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="add-food" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-workout" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-weight" options={{ presentation: 'modal' }} />
        <Stack.Screen name="scan-barcode" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
