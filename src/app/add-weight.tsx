import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { NumberField } from '@/components/NumberField';
import { CtaButton } from '@/components/CtaButton';
import { useWeight } from '@/store/weight';
import { useProfile } from '@/store/profile';
import { useSettings } from '@/store/settings';
import { weightUnitLabel, fromCanonicalWeight, toCanonicalWeight } from '@/lib/units';
import { Goal } from '@/lib/nutrition';
import { notifyGoalReached } from '@/lib/notifications';
import { useTheme, ColorPalette, spacing, typography } from '@/theme';

/** Vrai si `weightKg` a atteint (ou dépassé dans le bon sens) l'objectif. Le maintien n'a pas de cible ponctuelle à « atteindre ». */
function hasReachedGoal(weightKg: number, targetWeightKg: number, goal: Goal): boolean {
  if (goal === 'seche') return weightKg <= targetWeightKg;
  if (goal === 'prise') return weightKg >= targetWeightKg;
  return false;
}

/**
 * Écran modal : nouvelle pesée. Met aussi à jour le poids courant du profil
 * (`profile.weightKg`) afin que BMR/TDEE/macros restent basés sur la donnée
 * la plus récente (comportement standard des apps de suivi nutritionnel).
 */
export default function AddWeightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addEntry, latest } = useWeight();
  const { profile, saveProfile } = useProfile();
  const { units, notifications } = useSettings();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const startWeight = latest()?.weightKg ?? profile?.weightKg ?? 70;
  const [weightKg, setWeightKg] = useState(startWeight);

  const close = () => router.back();

  const save = () => {
    const previousWeightKg = latest()?.weightKg;
    addEntry(weightKg);
    if (profile) saveProfile({ ...profile, weightKg });

    if (notifications.goalReached && profile) {
      const reachedNow = hasReachedGoal(weightKg, profile.targetWeightKg, profile.goal);
      const reachedBefore =
        previousWeightKg !== undefined && hasReachedGoal(previousWeightKg, profile.targetWeightKg, profile.goal);
      if (reachedNow && !reachedBefore) {
        notifyGoalReached(profile.targetWeightKg);
      }
    }

    close();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Nouvelle pesée</Text>
        <View style={styles.closeBtn} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Aujourd'hui</Text>
        <Card style={styles.formCard}>
          <NumberField
            label="Poids"
            unit={weightUnitLabel(units)}
            value={fromCanonicalWeight(weightKg, units)}
            min={fromCanonicalWeight(30, units)}
            max={fromCanonicalWeight(250, units)}
            step={units === 'imperial' ? 1 : 0.5}
            decimals={1}
            onChange={(v) => setWeightKg(toCanonicalWeight(v, units))}
          />
        </Card>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <CtaButton label="Enregistrer" onPress={save} />
      </View>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  subtitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  formCard: {
    gap: 0,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
