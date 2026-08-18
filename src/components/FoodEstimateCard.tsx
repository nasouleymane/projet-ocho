import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { NumberField } from '@/components/NumberField';
import { StatChip } from '@/components/StatChip';
import { FoodEstimate } from '@/lib/mealEstimate';
import { useTheme, ColorPalette, spacing, typography } from '@/theme';

type EditableFields = Pick<FoodEstimate, 'quantity_g' | 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>;

type Props = {
  estimate: FoodEstimate;
  onChange: (patch: Partial<EditableFields>) => void;
  onRemove: () => void;
};

/**
 * Un aliment détecté par l'estimation IA (cahier §3.7), éditable avant ajout
 * au journal — « l'IA propose le détail, l'utilisateur ajuste les portions ».
 * `source: 'open_food_facts'` = valeurs réelles d'une base de données (badge
 * mis en avant) ; `'estimation_ia'` = repli de l'IA, moins fiable (badge neutre).
 */
export function FoodEstimateCard({ estimate, onChange, onRemove }: Props) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const isGrounded = estimate.source === 'open_food_facts';

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>
          {estimate.name}
        </Text>
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Retirer ${estimate.name}`}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.badgeRow}>
        <StatChip
          icon={isGrounded ? 'checkmark-circle-outline' : 'sparkles-outline'}
          label={isGrounded ? 'Ancré Open Food Facts' : 'Estimation IA'}
          highlighted={isGrounded}
        />
        <Text style={styles.range}>
          ≈{estimate.range_kcal[0]}–{estimate.range_kcal[1]} kcal
        </Text>
      </View>

      <View style={styles.divider} />

      <NumberField
        label="Quantité"
        unit="g"
        value={estimate.quantity_g}
        min={1}
        max={2000}
        step={5}
        onChange={(v) => onChange({ quantity_g: v })}
      />
      <View style={styles.divider} />
      <NumberField
        label="Calories"
        unit="kcal"
        value={estimate.kcal}
        min={0}
        max={5000}
        step={10}
        onChange={(v) => onChange({ kcal: v })}
      />
      <View style={styles.divider} />
      <NumberField
        label="Protéines"
        unit="g"
        value={estimate.protein_g}
        min={0}
        max={300}
        step={1}
        decimals={1}
        onChange={(v) => onChange({ protein_g: v })}
      />
      <View style={styles.divider} />
      <NumberField
        label="Glucides"
        unit="g"
        value={estimate.carbs_g}
        min={0}
        max={500}
        step={1}
        decimals={1}
        onChange={(v) => onChange({ carbs_g: v })}
      />
      <View style={styles.divider} />
      <NumberField
        label="Lipides"
        unit="g"
        value={estimate.fat_g}
        min={0}
        max={300}
        step={1}
        decimals={1}
        onChange={(v) => onChange({ fat_g: v })}
      />
    </Card>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    card: {
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    name: {
      ...typography.sectionTitle,
      color: colors.primary,
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    range: {
      ...typography.labelSm,
      color: colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
  });
