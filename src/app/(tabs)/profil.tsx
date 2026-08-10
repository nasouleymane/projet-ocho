import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { NumberField } from '@/components/NumberField';
import { SelectableCard } from '@/components/SelectableCard';
import { CtaButton } from '@/components/CtaButton';
import { useProfile } from '@/store/profile';
import { useSettings, ThemeMode, UnitSystem } from '@/store/settings';
import { Profile } from '@/lib/nutrition';
import { ACTIVITY_OPTIONS, buildGoalOptions } from '@/lib/profileOptions';
import {
  weightUnitLabel,
  fromCanonicalWeight,
  toCanonicalWeight,
} from '@/lib/units';
import { useTheme, ColorPalette, spacing, typography } from '@/theme';

const UNIT_OPTIONS: { label: string; value: UnitSystem }[] = [
  { label: 'Métrique', value: 'metric' },
  { label: 'Impérial', value: 'imperial' },
];

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'Clair', value: 'light' },
  { label: 'Sombre', value: 'dark' },
  { label: 'Système', value: 'system' },
];

const dec = (n: number) => n.toFixed(1).replace('.', ',');

/**
 * Écran Profil / Réglages (cahier §3.6) : objectifs modifiables (poids cible,
 * objectif, niveau d'activité), unités et apparence. Sexe/âge/taille restent
 * fixés à l'onboarding ; le poids actuel se met à jour via « Nouvelle pesée ».
 */
export default function ProfilScreen() {
  const insets = useSafeAreaInsets();
  const { profile, saveProfile } = useProfile();
  const { units, themeMode, setUnits, setThemeMode } = useSettings();
  const { colors, macroColors } = useTheme();
  const styles = getStyles(colors);

  const [draft, setDraft] = useState<Profile | null>(profile);
  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const [objectivesOpen, setObjectivesOpen] = useState(false);

  if (!draft) return <View style={styles.screen} />;

  const patch = (p: Partial<Profile>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  const weightUnit = weightUnitLabel(units);
  const wMin = fromCanonicalWeight(30, units);
  const wMax = fromCanonicalWeight(250, units);
  const weightStep = units === 'imperial' ? 1 : 0.5;
  const GOAL_OPTIONS = buildGoalOptions(macroColors);

  const activityLabel = ACTIVITY_OPTIONS.find((o) => o.value === draft.activity)?.title ?? '';
  const goalLabel = GOAL_OPTIONS.find((o) => o.value === draft.goal)?.title ?? '';
  const targetLabel = `${dec(fromCanonicalWeight(draft.targetWeightKg, units))} ${weightUnit}`;
  const objectivesSummary = `${goalLabel} · ${activityLabel} · ${targetLabel}`;

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxxl },
      ]}
    >
      <Text style={styles.title}>Profil</Text>

      <View style={styles.section}>
        <Pressable
          onPress={() => setObjectivesOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: objectivesOpen }}
        >
          <Card style={styles.collapsibleCard}>
            <View style={styles.collapsibleTexts}>
              <Text style={styles.sectionLabel}>Objectifs</Text>
              <Text style={styles.collapsibleSummary}>{objectivesSummary}</Text>
            </View>
            <Ionicons
              name={objectivesOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </Card>
        </Pressable>

        {objectivesOpen && (
          <>
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Poids cible</Text>
              <Card style={styles.formCard}>
                <NumberField
                  label="Poids cible"
                  unit={weightUnit}
                  value={fromCanonicalWeight(draft.targetWeightKg, units)}
                  min={wMin}
                  max={wMax}
                  step={weightStep}
                  decimals={1}
                  onChange={(v) => patch({ targetWeightKg: toCanonicalWeight(v, units) })}
                />
              </Card>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Niveau d'activité</Text>
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
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Objectif</Text>
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
            </View>
          </>
        )}
      </View>

      <CtaButton
        label="Enregistrer les modifications"
        onPress={() => saveProfile(draft)}
        disabled={!dirty}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Préférences</Text>
        <Card style={styles.prefsCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Unités</Text>
            <View style={styles.segmentWrap}>
              <SegmentedControl options={UNIT_OPTIONS} value={units} onChange={setUnits} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.themeField}>
            <Text style={styles.fieldLabel}>Apparence</Text>
            <SegmentedControl options={THEME_OPTIONS} value={themeMode} onChange={setThemeMode} />
          </View>
        </Card>
      </View>
    </ScrollView>
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
    title: {
      ...typography.screenTitle,
      color: colors.primary,
    },
    section: {
      gap: spacing.md,
    },
    sectionLabel: {
      ...typography.sectionTitle,
      color: colors.primary,
    },
    collapsibleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    collapsibleTexts: {
      flex: 1,
      gap: 2,
    },
    collapsibleSummary: {
      ...typography.label,
      color: colors.textSecondary,
    },
    formCard: {
      gap: 0,
    },
    prefsCard: {
      gap: spacing.md,
    },
    cardList: {
      gap: spacing.md,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    themeField: {
      gap: spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
  });
