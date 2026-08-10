import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

/**
 * Champ de texte pleine largeur, boîté (fond `surface` + bordure), avec une
 * zone tactile confortable (52px de haut — au-dessus du minimum recommandé
 * de 44pt sur iOS). Même langage visuel que la barre de recherche du Journal.
 */
export function TextField(props: TextInputProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return <TextInput placeholderTextColor={colors.textSecondary} {...props} style={[styles.input, props.style]} />;
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    input: {
      ...typography.body,
      color: colors.primary,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.card2,
      height: 52,
      paddingHorizontal: spacing.lg,
    },
  });
