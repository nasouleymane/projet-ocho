import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** Fond mis en avant (ex. semaine qui va dans le sens de l'objectif) — sinon neutre. */
  highlighted?: boolean;
};

/** Petite pastille icône + texte, pour résumer une stat de façon compacte et lisible. */
export function StatChip({ icon, label, highlighted = false }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.chip, highlighted && styles.chipHighlighted]}>
      <Ionicons name={icon} size={13} color={highlighted ? colors.onHighlight : colors.textSecondary} />
      <Text style={[styles.label, highlighted && styles.labelHighlighted]}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.background,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
    },
    chipHighlighted: {
      backgroundColor: colors.highlight,
    },
    label: {
      ...typography.labelSm,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    labelHighlighted: {
      color: colors.onHighlight,
    },
  });
