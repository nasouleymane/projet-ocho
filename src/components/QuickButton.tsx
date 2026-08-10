import { Pressable, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ColorPalette, radius, typography } from '@/theme';

type Props = {
  label: string;
  /** `primary` : fond olive. `surface` : fond blanc + bordure fine. */
  variant?: 'primary' | 'surface';
  onPress?: (e: GestureResponderEvent) => void;
};

/** Bouton d'action rapide « + Repas » / « + Séance ». */
export function QuickButton({ label, variant = 'primary', onPress }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? colors.background : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.primary : styles.surface,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="add" size={20} color={fg} />
      <Text style={[typography.button, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 52,
      borderRadius: radius.button,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    surface: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    pressed: {
      opacity: 0.85,
    },
  });
