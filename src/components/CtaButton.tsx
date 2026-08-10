import { Pressable, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import { useTheme, ColorPalette, radius, typography } from '@/theme';

type Props = {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: 'primary' | 'surface';
  disabled?: boolean;
};

/** Bouton d'action pleine largeur (ex. « Continuer », « Commencer »). */
export function CtaButton({ label, onPress, variant = 'primary', disabled = false }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        isPrimary ? styles.primary : styles.surface,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[typography.button, { color: isPrimary ? colors.background : colors.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    btn: {
      height: 54,
      borderRadius: radius.button,
      alignItems: 'center',
      justifyContent: 'center',
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
    disabled: {
      opacity: 0.4,
    },
  });
