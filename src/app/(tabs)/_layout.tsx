import { View, StyleSheet } from 'react-native';
import { Slot, Redirect } from 'expo-router';
import { BottomTabBar } from '@/components/BottomTabBar';
import { useAuth } from '@/store/auth';
import { useProfile } from '@/store/profile';
import { useTheme, ColorPalette } from '@/theme';

/** Gate à deux étages : pas de session → /auth ; session sans profil → /onboarding. */
export default function TabsLayout() {
  const { isLoading: authLoading, session } = useAuth();
  const { isLoading: profileLoading, hasProfile } = useProfile();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (authLoading || (session && profileLoading)) return <View style={styles.container} />;
  if (!session) return <Redirect href="/auth" />;
  if (!hasProfile) return <Redirect href="/onboarding" />;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Slot />
      </View>
      <BottomTabBar />
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
  });
