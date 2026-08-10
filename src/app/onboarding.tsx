import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { SegmentedControl } from '@/components/SegmentedControl';
import { NumberField } from '@/components/NumberField';
import { SelectableCard } from '@/components/SelectableCard';
import { CtaButton } from '@/components/CtaButton';
import { useProfile } from '@/store/profile';
import { useWeight } from '@/store/weight';
import { useSettings } from '@/store/settings';
import {
  weightUnitLabel,
  heightUnitLabel,
  fromCanonicalWeight,
  toCanonicalWeight,
  fromCanonicalHeight,
  toCanonicalHeight,
} from '@/lib/units';
import { DEFAULT_PROFILE, Profile, computePlan } from '@/lib/nutrition';
import { SEX_OPTIONS, ACTIVITY_OPTIONS, buildGoalOptions } from '@/lib/profileOptions';
import { useTheme, ColorPalette, MacroKey, radius, spacing, typography } from '@/theme';

const STEPS = 4;

const fmt = (n: number) => n.toLocaleString('fr-FR');
const dec = (n: number) => n.toFixed(1).replace('.', ',');

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveProfile } = useProfile();
  const { addEntry: addWeightEntry } = useWeight();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Profile>(DEFAULT_PROFILE);
  const patch = (p: Partial<Profile>) => setDraft((d) => ({ ...d, ...p }));

  const isResult = step === STEPS; // 0..3 = saisie, 4 = résultat
  const plan = computePlan(draft);

  const goNext = () => setStep((s) => Math.min(STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    await saveProfile(draft);
    addWeightEntry(draft.weightKg);
    router.replace('/');
  };

  return (
    <View style={styles.screen}>
      {/* Header : retour + progression */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          {step > 0 ? (
            <Pressable onPress={goBack} accessibilityLabel="Retour" style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>
        {!isResult && <OnboardingProgress total={STEPS} current={step} />}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && <StepProfil draft={draft} patch={patch} />}
          {step === 1 && <StepCible draft={draft} patch={patch} />}
          {step === 2 && <StepActivite draft={draft} patch={patch} />}
          {step === 3 && <StepObjectif draft={draft} patch={patch} />}
          {isResult && <StepResult plan={plan} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isResult ? (
          <CtaButton label="Commencer" onPress={finish} />
        ) : (
          <CtaButton label={step === STEPS - 1 ? 'Voir mon plan' : 'Continuer'} onPress={goNext} />
        )}
      </View>
    </View>
  );
}

/* ------------------------------- Étapes ------------------------------- */

type StepProps = { draft: Profile; patch: (p: Partial<Profile>) => void };

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.stepHead}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function StepProfil({ draft, patch }: StepProps) {
  const { colors } = useTheme();
  const { units } = useSettings();
  const styles = getStyles(colors);
  return (
    <>
      <StepHeader title="Parle-nous de toi" subtitle="Pour calculer tes besoins caloriques." />
      <Card style={styles.formCard}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Sexe</Text>
          <View style={styles.segmentWrap}>
            <SegmentedControl options={SEX_OPTIONS} value={draft.sex} onChange={(v) => patch({ sex: v })} />
          </View>
        </View>
        <View style={styles.divider} />
        <NumberField label="Âge" unit="ans" value={draft.age} min={14} max={100} onChange={(v) => patch({ age: v })} />
        <View style={styles.divider} />
        <NumberField
          label="Taille"
          unit={heightUnitLabel(units)}
          value={fromCanonicalHeight(draft.heightCm, units)}
          min={fromCanonicalHeight(120, units)}
          max={fromCanonicalHeight(230, units)}
          onChange={(v) => patch({ heightCm: toCanonicalHeight(v, units) })}
        />
        <View style={styles.divider} />
        <NumberField
          label="Poids actuel"
          unit={weightUnitLabel(units)}
          value={fromCanonicalWeight(draft.weightKg, units)}
          min={fromCanonicalWeight(30, units)}
          max={fromCanonicalWeight(250, units)}
          onChange={(v) => patch({ weightKg: toCanonicalWeight(v, units) })}
        />
      </Card>
    </>
  );
}

function StepCible({ draft, patch }: StepProps) {
  const { colors } = useTheme();
  const { units } = useSettings();
  const styles = getStyles(colors);
  const weightUnit = weightUnitLabel(units);
  const delta = fromCanonicalWeight(draft.weightKg - draft.targetWeightKg, units);
  const helper =
    delta > 0
      ? `${dec(delta)} ${weightUnit} à perdre`
      : delta < 0
        ? `${dec(-delta)} ${weightUnit} à prendre`
        : 'Objectif de maintien';

  return (
    <>
      <StepHeader title="Ton objectif de poids" subtitle="Où veux-tu arriver ?" />
      <Card style={styles.formCard}>
        <NumberField
          label="Poids cible"
          unit={weightUnit}
          value={fromCanonicalWeight(draft.targetWeightKg, units)}
          min={fromCanonicalWeight(30, units)}
          max={fromCanonicalWeight(250, units)}
          onChange={(v) => patch({ targetWeightKg: toCanonicalWeight(v, units) })}
        />
      </Card>
      <Text style={styles.helper}>{helper}</Text>
    </>
  );
}

function StepActivite({ draft, patch }: StepProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <>
      <StepHeader title="Ton niveau d'activité" subtitle="Sois honnête, ça affine le calcul." />
      <View style={styles.cardList}>
        {ACTIVITY_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.value}
            icon={opt.icon}
            iconBg={colors.accentMuted}
            iconColor={colors.accent}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={draft.activity === opt.value}
            onPress={() => patch({ activity: opt.value })}
          />
        ))}
      </View>
    </>
  );
}

function StepObjectif({ draft, patch }: StepProps) {
  const { colors, macroColors } = useTheme();
  const styles = getStyles(colors);
  const GOAL_OPTIONS = buildGoalOptions(macroColors);
  return (
    <>
      <StepHeader title="Quel est ton objectif ?" subtitle="On adapte tes calories en conséquence." />
      <View style={styles.cardList}>
        {GOAL_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.value}
            icon={opt.icon}
            iconBg={opt.iconBg}
            iconColor={opt.iconColor}
            title={opt.title}
            subtitle={opt.subtitle}
            selected={draft.goal === opt.value}
            onPress={() => patch({ goal: opt.value })}
          />
        ))}
      </View>
    </>
  );
}

function StepResult({ plan }: { plan: ReturnType<typeof computePlan> }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const gap = plan.calorieTarget - plan.tdee;
  const gapLabel = gap < 0 ? `Déficit ${fmt(-gap)} kcal` : gap > 0 ? `Surplus ${fmt(gap)} kcal` : 'Maintien';

  return (
    <>
      <StepHeader title="Ton plan est prêt" subtitle="Basé sur la formule Mifflin-St Jeor." />

      <Card style={styles.planCard}>
        <View style={styles.planTopRow}>
          <Text style={styles.planLabel}>Apport recommandé</Text>
          <View style={styles.gapPill}>
            <Text style={styles.gapText}>{gapLabel}</Text>
          </View>
        </View>
        <View style={styles.planValueRow}>
          <Text style={styles.planValue}>{fmt(plan.calorieTarget)}</Text>
          <Text style={styles.planUnit}>kcal / jour</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.metricsRow}>
          <Metric label="Métabolisme" value={`${fmt(plan.bmr)} kcal`} />
          <View style={styles.vDivider} />
          <Metric label="Dépense totale" value={`${fmt(plan.tdee)} kcal`} />
        </View>
      </Card>

      <View style={styles.macrosRow}>
        <MacroChip macro="protein" label="Protéines" grams={plan.macros.proteinG} />
        <MacroChip macro="carbs" label="Glucides" grams={plan.macros.carbsG} />
        <MacroChip macro="fat" label="Lipides" grams={plan.macros.fatG} />
      </View>

      <Text style={styles.note}>Estimation ajustable à tout moment dans ton profil.</Text>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MacroChip({ macro, label, grams }: { macro: MacroKey; label: string; grams: number }) {
  const { colors, macroColors } = useTheme();
  const styles = getStyles(colors);
  const c = macroColors[macro];
  return (
    <View style={[styles.macroChip, { backgroundColor: c.bg }]}>
      <Text style={[styles.macroGrams, { color: c.text }]}>{grams} g</Text>
      <Text style={[styles.macroLabel, { color: c.text }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------- Styles ------------------------------- */

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  stepHead: {
    gap: spacing.xs,
  },
  title: {
    ...typography.screenTitle,
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  formCard: {
    gap: 0,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  fieldLabel: {
    ...typography.body,
    color: colors.primary,
  },
  segmentWrap: {
    flex: 1,
    maxWidth: 200,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  helper: {
    ...typography.body,
    fontWeight: '500',
    color: colors.accent,
    textAlign: 'center',
  },
  cardList: {
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  // Résultat
  planCard: {
    gap: spacing.md,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLabel: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  gapPill: {
    backgroundColor: colors.highlight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  gapText: {
    ...typography.label,
    fontWeight: '500',
    color: colors.onHighlight,
  },
  planValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  planValue: {
    ...typography.ringValue,
    color: colors.primary,
  },
  planUnit: {
    ...typography.label,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    ...typography.body,
    fontWeight: '500',
    color: colors.primary,
  },
  metricLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  vDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
    backgroundColor: colors.border,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroChip: {
    flex: 1,
    borderRadius: radius.card2,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  macroGrams: {
    ...typography.cardValue,
  },
  macroLabel: {
    ...typography.label,
  },
  note: {
    ...typography.label,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
