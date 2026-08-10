import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { FoodEntry } from '@/store/journal';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

type Props = {
  title: string;
  entries: FoodEntry[];
  onAddPress: () => void;
  onRemoveEntry: (id: string) => void;
};

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

/**
 * Carte d'un repas (design-tokens/screens-mockups §3) : nom + total kcal en
 * haut, liste des aliments (nom + kcal) séparés par une ligne fine, bouton
 * pointillé « + Ajouter un aliment ». Repas vide → carte à opacité réduite,
 * label « Vide » (le bouton d'ajout reste actif).
 */
export function MealCard({ title, entries, onAddPress, onRemoveEntry }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const total = entries.reduce((sum, e) => sum + e.kcal, 0);
  const isEmpty = entries.length === 0;

  return (
    <Card style={[styles.card, isEmpty && styles.cardEmpty]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {!isEmpty && <Text style={styles.total}>{fmt(total)} kcal</Text>}
      </View>

      {isEmpty ? (
        <Text style={styles.emptyLabel}>Vide</Text>
      ) : (
        <View>
          {entries.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <View style={styles.rowDivider} />}
              <View style={styles.row}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {e.name}
                </Text>
                <View style={styles.rowRight}>
                  <Text style={styles.rowKcal}>{fmt(e.kcal)} kcal</Text>
                  <Pressable
                    onPress={() => onRemoveEntry(e.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer ${e.name}`}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable onPress={onAddPress} accessibilityRole="button" style={styles.addBtn}>
        <Ionicons name="add" size={16} color={colors.accent} />
        <Text style={styles.addLabel}>Ajouter un aliment</Text>
      </Pressable>
    </Card>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      gap: spacing.md,
    },
    cardEmpty: {
      opacity: 0.55,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.sectionTitle,
      color: colors.primary,
    },
    total: {
      ...typography.body,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    emptyLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    rowName: {
      ...typography.body,
      color: colors.primary,
      flex: 1,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 0,
    },
    rowKcal: {
      ...typography.body,
      color: colors.textSecondary,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      borderRadius: radius.button,
      paddingVertical: spacing.sm + 2,
    },
    addLabel: {
      ...typography.body,
      fontWeight: '500',
      color: colors.accent,
    },
  });
