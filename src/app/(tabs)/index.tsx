import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { MacroCircle } from '@/components/MacroCircle';
import { StreakBadge } from '@/components/StreakBadge';
import { QuickButton } from '@/components/QuickButton';
import { WeekStat } from '@/components/WeekStat';
import { dashboard } from '@/data/dashboard';
import { useProfile } from '@/store/profile';
import { useJournal } from '@/store/journal';
import { useWorkouts } from '@/store/workouts';
import { useWeight } from '@/store/weight';
import { useSettings } from '@/store/settings';
import { weightUnitLabel, fromCanonicalWeight } from '@/lib/units';
import { todayISO } from '@/lib/date';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

/** Formate un entier en séparant les milliers (ex. 1540 → « 1 540 »). */
const fmt = (n: number) => n.toLocaleString('fr-FR');
/** Formate un décimal à la française (ex. 74.2 → « 74,2 »). `toFixed` évite
 *  les artefacts de virgule flottante (ex. 78 − 75.2 = 2.799999999999997). */
const dec = (n: number) => n.toFixed(1).replace('.', ',');

const todayLabel = () => {
  const s = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan, profile } = useProfile();
  const { dayTotals } = useJournal();
  const { dayKcal, countLastDays } = useWorkouts();
  const { latest: latestWeight, deltaSinceStart } = useWeight();
  const { units } = useSettings();
  const { firstName, streakDays, calories: mockCal, macros: mockMacros, week } = dashboard;
  const { colors } = useTheme();
  const styles = getStyles(colors);

  // Poids réel = dernière pesée (ou poids du profil si aucune pesée loguée).
  // Évolution = depuis la première pesée ; masquée tant qu'il n'y en a qu'une.
  const currentWeightKg = latestWeight()?.weightKg ?? profile?.weightKg ?? week.weightKg;
  const weightDeltaKg = deltaSinceStart();
  const weightUnit = weightUnitLabel(units);

  // Consommé réel = totaux du jour depuis le Journal. Brûlées réel = séances
  // du jour depuis Entraînements. Objectifs = plan de l'onboarding si
  // disponible, sinon mock.
  const today = todayISO();
  const todayTotals = dayTotals(today);
  const calories = {
    goal: plan?.calorieTarget ?? mockCal.goal,
    consumed: todayTotals.kcal,
    burned: dayKcal(today),
  };
  const macroGoals = plan?.macros ?? {
    proteinG: mockMacros[0].goal,
    carbsG: mockMacros[1].goal,
    fatG: mockMacros[2].goal,
  };
  const macros = [
    { key: 'protein' as const, label: 'Protéines', consumed: todayTotals.proteinG, goal: macroGoals.proteinG },
    { key: 'carbs' as const, label: 'Glucides', consumed: todayTotals.carbsG, goal: macroGoals.carbsG },
    { key: 'fat' as const, label: 'Lipides', consumed: todayTotals.fatG, goal: macroGoals.fatG },
  ];

  const remaining = calories.goal + calories.burned - calories.consumed;
  const ringProgress = calories.consumed / (calories.goal + calories.burned);
  const dailyGap = plan ? plan.calorieTarget - plan.tdee : -mockCal.deficit;
  const gapLabel =
    dailyGap < 0
      ? `Déficit ${fmt(-dailyGap)} kcal`
      : dailyGap > 0
        ? `Surplus ${fmt(dailyGap)} kcal`
        : 'Maintien';

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Salut, {firstName}</Text>
          <Text style={styles.date}>{todayLabel()}</Text>
        </View>
        <StreakBadge days={streakDays} />
      </View>

      {/* Carte principale : anneau calories + macros */}
      <Card style={styles.mainCard}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTopLabel}>Aujourd'hui</Text>
          <View style={styles.deficitPill}>
            <Text style={styles.deficitText}>{gapLabel}</Text>
          </View>
        </View>

        <View style={styles.ringWrap}>
          <ProgressRing
            size={210}
            strokeWidth={14}
            progress={ringProgress}
            trackColor={colors.border}
            progressColor={colors.accent}
          >
            <View style={styles.ringCenter}>
              <Text style={styles.ringValue}>{fmt(remaining)}</Text>
              <Text style={styles.ringLabel}>kcal restantes</Text>
            </View>
          </ProgressRing>
        </View>

        <View style={styles.underRing}>
          <UnderRingStat label="Consommées" value={`${fmt(calories.consumed)} kcal`} />
          <View style={styles.vDivider} />
          <UnderRingStat label="Brûlées" value={`${fmt(calories.burned)} kcal`} />
        </View>

        <View style={styles.separator} />

        <View style={styles.macroRow}>
          {macros.map((m) => (
            <MacroCircle
              key={m.key}
              macro={m.key}
              label={m.label}
              consumed={m.consumed}
              goal={m.goal}
            />
          ))}
        </View>
      </Card>

      {/* Boutons rapides */}
      <View style={styles.buttonRow}>
        <QuickButton label="Repas" variant="primary" onPress={() => router.push('/add-food')} />
        <QuickButton label="Séance" variant="surface" onPress={() => router.push('/add-workout')} />
      </View>

      {/* Carte « Cette semaine » */}
      <Card style={styles.weekCard}>
        <Text style={styles.sectionTitle}>Cette semaine</Text>
        <View style={styles.weekRow}>
          <Pressable onPress={() => router.push('/add-weight')} style={styles.weekStatPressable}>
            <WeekStat
              value={`${dec(fromCanonicalWeight(currentWeightKg, units))} ${weightUnit}`}
              delta={
                weightDeltaKg !== null
                  ? `${dec(fromCanonicalWeight(weightDeltaKg, units))} ${weightUnit}`
                  : undefined
              }
              label="Poids"
            />
          </Pressable>
          <View style={styles.vDivider} />
          <Pressable onPress={() => router.push('/workouts')} style={styles.weekStatPressable}>
            <WeekStat value={`${countLastDays(7)}`} label="Séances" />
          </Pressable>
          <View style={styles.vDivider} />
          <WeekStat value={`${dec(week.waterLitersPerDay)} L`} label="Eau / jour" />
        </View>
      </Card>
    </ScrollView>
  );
}

/** Petite stat sous l'anneau (consommées / brûlées). */
function UnderRingStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.underRingStat}>
      <Text style={styles.underRingValue}>{value}</Text>
      <Text style={styles.underRingLabel}>{label}</Text>
    </View>
  );
}

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    ...typography.greeting,
    color: colors.primary,
  },
  date: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: 2,
  },
  mainCard: {
    alignItems: 'stretch',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTopLabel: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  deficitPill: {
    backgroundColor: colors.highlight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  deficitText: {
    ...typography.label,
    fontWeight: '500',
    color: colors.onHighlight,
  },
  ringWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  ringCenter: {
    alignItems: 'center',
  },
  ringValue: {
    ...typography.ringValue,
    color: colors.primary,
  },
  ringLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: 2,
  },
  underRing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  underRingStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  underRingValue: {
    ...typography.body,
    fontWeight: '500',
    color: colors.primary,
  },
  underRingLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  vDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: colors.border,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  weekCard: {
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekStatPressable: {
    flex: 1,
  },
});
