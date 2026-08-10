import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme, ColorPalette, radius, spacing } from '@/theme';

type Props = ViewProps & {
  /** Applique le padding intérieur standard (défaut : true). */
  padded?: boolean;
};

/** Carte blanche principale : fond `surface`, rayon 24, bordure fine + ombre douce. */
export function Card({ style, padded = true, ...rest }: Props) {
  const { colors, cardShadow } = useTheme();
  const styles = getStyles(colors, cardShadow);
  return <View style={[styles.card, padded && styles.padded, style]} {...rest} />;
}

const getStyles = (colors: ColorPalette, cardShadow: object) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
      ...cardShadow,
    },
    padded: {
      padding: spacing.xl,
    },
  });
