import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

/** Badge de streak : pilule lime (`highlight`) + icône flamme + nombre de jours. */
export function StreakBadge({ days }: { days: number }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.badge}>
      <MaterialCommunityIcons name="fire" size={16} color={colors.onHighlight} />
      <Text style={styles.text}>{days} j</Text>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.highlight,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    text: {
      ...typography.button,
      color: colors.onHighlight,
    },
  });
