import { View, StyleSheet } from 'react-native';
import { Slot, Redirect } from 'expo-router';
import { BottomTabBar } from '@/components/BottomTabBar';
import { useProfile } from '@/store/profile';
import { useTheme, ColorPalette } from '@/theme';

/** Gate : redirige vers l'onboarding tant que le profil n'existe pas. */
export default function TabsLayout() {
  const { isLoading, hasProfile } = useProfile();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  if (isLoading) return <View style={styles.container} />;
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
