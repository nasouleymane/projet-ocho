import { View, StyleSheet } from 'react-native';
import { useTheme, ColorPalette, radius } from '@/theme';

type Props = { total: number; current: number };

/** Barre de progression de l'onboarding : pastilles arrondies pleine largeur. */
export function OnboardingProgress({ total, current }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i <= current ? styles.active : styles.inactive]} />
      ))}
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 6,
    },
    dot: {
      flex: 1,
      height: 6,
      borderRadius: radius.pill,
    },
    active: {
      backgroundColor: colors.primary,
    },
    inactive: {
      backgroundColor: colors.borderStrong,
    },
  });
