import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from './Card';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

type Props = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/**
 * Écran placeholder pour les onglets non encore maquettés/développés.
 * Reprend le style commun (fond crème, titre, carte blanche).
 */
export function PlaceholderScreen({ title, subtitle, icon }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>{title}</Text>
      <Card style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={26} color={colors.accent} />
        </View>
        <Text style={styles.cardTitle}>Écran à venir</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Card>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.xl,
      gap: spacing.lg,
    },
    title: {
      ...typography.screenTitle,
      color: colors.primary,
    },
    card: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxxl,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    cardTitle: {
      ...typography.sectionTitle,
      color: colors.primary,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
