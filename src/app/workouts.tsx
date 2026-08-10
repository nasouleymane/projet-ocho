import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { useWorkouts } from '@/store/workouts';
import { WORKOUT_TYPES } from '@/lib/workout';
import { todayISO } from '@/lib/date';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

const formatDate = (iso: string) => {
  if (iso === todayISO()) return "Aujourd'hui";
  const d = new Date(`${iso}T00:00:00`);
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Liste des séances loguées (cahier §3.4) — accès via la stat « Séances » du Dashboard. */
export default function WorkoutsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { workouts, removeWorkout } = useWorkouts();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const sorted = [...workouts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Séances</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {sorted.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="barbell-outline" size={26} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucune séance loguée</Text>
            <Text style={styles.emptySubtitle}>
              Utilise « + Séance » depuis l'accueil pour en ajouter une.
            </Text>
          </Card>
        ) : (
          sorted.map((w) => {
            const meta = WORKOUT_TYPES.find((t) => t.type === w.type);
            return (
              <Card key={w.id} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <View style={styles.workoutIcon}>
                    <Ionicons name={meta?.icon ?? 'fitness-outline'} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutType}>{meta?.label ?? w.type}</Text>
                    <Text style={styles.workoutDate}>{formatDate(w.date)}</Text>
                  </View>
                  <Pressable
                    onPress={() => removeWorkout(w.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Supprimer la séance"
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.workoutStats}>
                  <Text style={styles.workoutStat}>{w.durationMin} min</Text>
                  <Text style={styles.workoutStatDivider}>·</Text>
                  <Text style={styles.workoutStat}>{fmt(w.kcalBurned)} kcal</Text>
                  {w.exercises.length > 0 && (
                    <>
                      <Text style={styles.workoutStatDivider}>·</Text>
                      <Text style={styles.workoutStat}>
                        {w.exercises.length} exercice{w.exercises.length > 1 ? 's' : ''}
                      </Text>
                    </>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
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
  backBtn: {
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
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
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
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  workoutCard: {
    gap: spacing.md,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  workoutIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.card2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  workoutType: {
    ...typography.sectionTitle,
    color: colors.primary,
  },
  workoutDate: {
    ...typography.label,
    color: colors.textSecondary,
  },
  workoutStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workoutStat: {
    ...typography.label,
    color: colors.textSecondary,
  },
  workoutStatDivider: {
    ...typography.label,
    color: colors.textSecondary,
  },
});
