import { ReactNode } from 'react';
import { ScrollView, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { WeightChart } from '@/components/WeightChart';
import { StatChip } from '@/components/StatChip';
import { useWeight } from '@/store/weight';
import { useWorkouts } from '@/store/workouts';
import { useJournal } from '@/store/journal';
import { useProfile } from '@/store/profile';
import { usePhotos } from '@/store/photos';
import { useSettings } from '@/store/settings';
import { weightUnitLabel, fromCanonicalWeight } from '@/lib/units';
import { Goal } from '@/lib/nutrition';
import { computeWeekSummaries, WeekSummary } from '@/lib/progression';
import { todayISO } from '@/lib/date';
import { useTheme, ColorPalette, radius, spacing, typography, fontFamily } from '@/theme';

const dec = (n: number) => n.toFixed(1).replace('.', ',');
const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString('fr-FR');
const signed = (n: number, unit: string) => `${n > 0 ? '+' : ''}${dec(n)} ${unit}`;

const GRAPH_WIDTH = 295;
const GRAPH_HEIGHT = 150;
const DOT_SIZE = 14;
const INDICATOR_WIDTH = 20;

/** Vrai si l'évolution du poids va dans le sens de l'objectif du profil. */
function isFavorable(deltaKg: number, goal: Goal): boolean {
  if (goal === 'seche') return deltaKg < 0;
  if (goal === 'prise') return deltaKg > 0;
  return Math.abs(deltaKg) < 0.3; // maintien : stabilité recherchée
}

/** Écran Progression (cahier §3.5) : courbe de poids + timeline narrative. */
export default function ProgressionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entries: weightEntries, deltaSinceStart } = useWeight();
  const { workouts } = useWorkouts();
  const { dayTotals } = useJournal();
  const { plan, profile } = useProfile();
  const { photos } = usePhotos();
  const { units } = useSettings();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const weightUnit = weightUnitLabel(units);

  const hasStart = weightEntries.length > 0;
  const hasCurve = weightEntries.length >= 2;
  const delta = deltaSinceStart();

  const weeks: WeekSummary[] = hasStart
    ? computeWeekSummaries({
        startDate: weightEntries[0].date,
        today: todayISO(),
        weightEntries,
        workouts,
        dailyConsumed: (date) => dayTotals(date).kcal,
        calorieTarget: plan?.calorieTarget ?? 2000,
      })
    : [];

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl },
      ]}
    >
      <Text style={styles.title}>Progression</Text>

      <Card style={styles.graphCard}>
        <View style={styles.graphHeader}>
          <Text style={styles.graphTitle}>Évolution du poids</Text>
          {delta !== null && (
            <Text style={styles.graphDelta}>{signed(fromCanonicalWeight(delta, units), weightUnit)}</Text>
          )}
        </View>

        {hasCurve ? (
          <View style={styles.chartWrap}>
            <WeightChart entries={weightEntries} width={GRAPH_WIDTH} height={GRAPH_HEIGHT} />
          </View>
        ) : (
          <EmptyGraph hasStart={hasStart} />
        )}
      </Card>

      <Pressable onPress={() => router.push('/photos')} accessibilityRole="button">
        <Card style={styles.photosCard}>
          <View style={styles.photosHeader}>
            <Text style={styles.graphTitle}>Photos</Text>
            <View style={styles.photosHeaderRight}>
              {photos.length > 0 && <Text style={styles.photosCount}>{photos.length}</Text>}
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </View>
          </View>
          {photos.length > 0 ? (
            <View style={styles.photosPreviewRow}>
              {photos.slice(0, 4).map((p) => (
                <Image key={p.id} source={{ uri: p.uri }} style={styles.photoThumb} />
              ))}
            </View>
          ) : (
            <Text style={styles.emptySubtitle}>Ajoute une photo pour suivre ta progression visuellement.</Text>
          )}
        </Card>
      </Pressable>

      <View style={styles.timelineSection}>
        <Text style={styles.sectionTitle}>Ton parcours</Text>

        <View style={styles.timeline}>
          {hasStart && <View style={styles.timelineTrack} />}

          <TimelineRow isStart title="Jour 1" isLast={weeks.length === 0}>
            <StatChip
              icon="flag-outline"
              label={
                hasStart
                  ? `Poids de départ : ${dec(fromCanonicalWeight(weightEntries[0].weightKg, units))} ${weightUnit}`
                  : 'Bienvenue sur Ocho'
              }
            />
          </TimelineRow>

          {weeks.map((w, i) => (
            <TimelineRow key={w.weekIndex} title={w.label} isLast={i === weeks.length - 1}>
              <View style={styles.chipRow}>
                {w.weightDeltaKg !== null && (
                  <StatChip
                    icon={w.weightDeltaKg <= 0 ? 'trending-down' : 'trending-up'}
                    label={signed(fromCanonicalWeight(w.weightDeltaKg, units), weightUnit)}
                    highlighted={profile ? isFavorable(w.weightDeltaKg, profile.goal) : false}
                  />
                )}
                <StatChip icon="barbell-outline" label={`${w.workouts} séance${w.workouts > 1 ? 's' : ''}`} />
                {w.avgDeficitKcal !== null && (
                  <StatChip
                    icon="flame-outline"
                    label={`${w.avgDeficitKcal >= 0 ? 'Déficit' : 'Surplus'} ${fmt(w.avgDeficitKcal)} kcal`}
                  />
                )}
              </View>
            </TimelineRow>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function EmptyGraph({ hasStart }: { hasStart: boolean }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.emptyGraph}>
      <View style={styles.emptyIcon}>
        <Ionicons name="analytics-outline" size={24} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{hasStart ? 'Courbe en préparation' : 'Pas encore de suivi'}</Text>
      <Text style={styles.emptySubtitle}>
        {hasStart
          ? "Ajoute une nouvelle pesée pour voir ta courbe apparaître."
          : 'Enregistre une première pesée pour démarrer ton suivi.'}
      </Text>
    </View>
  );
}

function TimelineRow({
  isStart = false,
  title,
  children,
  isLast,
}: {
  isStart?: boolean;
  title: string;
  children: ReactNode;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={[styles.timelineRow, !isLast && styles.timelineRowSpacing]}>
      <View style={styles.timelineIndicator}>
        <View style={[styles.dot, isStart ? styles.dotStart : styles.dotPast]} />
      </View>
      <Card style={styles.weekCard}>
        <Text style={styles.weekCardTitle}>{title}</Text>
        {children}
      </Card>
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
  title: {
    ...typography.screenTitle,
    color: colors.primary,
  },
  graphCard: {
    gap: spacing.md,
  },
  graphHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  graphTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  graphDelta: {
    ...typography.body,
    fontFamily: fontFamily.medium,
    color: colors.accent,
  },
  chartWrap: {
    alignItems: 'center',
  },
  emptyGraph: {
    height: GRAPH_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photosCard: {
    gap: spacing.sm,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photosHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  photosCount: {
    ...typography.body,
    color: colors.textSecondary,
  },
  photosPreviewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoThumb: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: radius.card2,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  timeline: {
    position: 'relative',
  },
  timelineTrack: {
    position: 'absolute',
    left: (INDICATOR_WIDTH - 2) / 2,
    top: DOT_SIZE / 2,
    bottom: DOT_SIZE / 2,
    width: 2,
    backgroundColor: colors.borderStrong,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineRowSpacing: {
    marginBottom: spacing.md,
  },
  timelineIndicator: {
    width: INDICATOR_WIDTH,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotPast: {
    backgroundColor: colors.accent,
  },
  dotStart: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  weekCard: {
    flex: 1,
    gap: spacing.sm,
  },
  weekCardTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
