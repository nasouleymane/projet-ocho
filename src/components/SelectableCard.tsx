import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
};

/**
 * Carte sélectionnable (objectif, niveau d'activité) : icône ronde à gauche,
 * titre + description, coche à droite. Sélectionnée → bordure 2px `primary`.
 */
export function SelectableCard({ icon, iconBg, iconColor, title, subtitle, selected, onPress }: Props) {
  const { colors, cardShadow } = useTheme();
  const styles = getStyles(colors, cardShadow);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.card, selected ? styles.cardSelected : styles.cardDefault]}
    >
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
      ) : (
        <View style={styles.circle} />
      )}
    </Pressable>
  );
}

const getStyles = (colors: ColorPalette, cardShadow: object) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.card2,
      padding: spacing.lg,
      ...cardShadow,
    },
    cardDefault: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardSelected: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: radius.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texts: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.sectionTitle,
      color: colors.primary,
    },
    subtitle: {
      ...typography.label,
      color: colors.textSecondary,
    },
    circle: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.borderStrong,
    },
  });
