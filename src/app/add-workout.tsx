import { useEffect, useRef, useState } from 'react';
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
import { NumberField } from '@/components/NumberField';
import { TextField } from '@/components/TextField';
import { CtaButton } from '@/components/CtaButton';
import { useWorkouts, Exercise } from '@/store/workouts';
import { useProfile } from '@/store/profile';
import { DEFAULT_PROFILE } from '@/lib/nutrition';
import { WORKOUT_TYPES, WorkoutType, estimateKcal } from '@/lib/workout';
import { generateId } from '@/lib/id';
import { useTheme, ColorPalette, radius, spacing, typography } from '@/theme';

/** Écran modal : ajout manuel d'une séance d'entraînement (cahier §3.4). */
export default function AddWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addWorkout } = useWorkouts();
  const { profile } = useProfile();
  const weightKg = profile?.weightKg ?? DEFAULT_PROFILE.weightKg;
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [type, setType] = useState<WorkoutType>('musculation');
  const [durationMin, setDurationMin] = useState(30);
  const [kcal, setKcal] = useState(() => estimateKcal('musculation', 30, weightKg));
  const kcalEditedByUser = useRef(false);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState(10);
  const [exWeight, setExWeight] = useState(20);
  const [exRest, setExRest] = useState(90);

  // Suggestion recalculée à chaque changement de type/durée, sauf si
  // l'utilisateur a lui-même modifié le champ calories (override manuel).
  useEffect(() => {
    if (!kcalEditedByUser.current) {
      setKcal(estimateKcal(type, durationMin, weightKg));
    }
  }, [type, durationMin, weightKg]);

  const close = () => router.back();

  const addExercise = () => {
    if (!exName.trim()) return;
    setExercises((list) => [
      ...list,
      {
        id: generateId('ex'),
        name: exName.trim(),
        sets: exSets,
        reps: exReps,
        weightKg: exWeight,
        restSeconds: exRest,
      },
    ]);
    setExName('');
  };

  const removeExercise = (id: string) => {
    setExercises((list) => list.filter((e) => e.id !== id));
  };

  const canSave = durationMin > 0 && kcal > 0;

  const save = () => {
    if (!canSave) return;
    addWorkout({
      type,
      durationMin,
      kcalBurned: kcal,
      exercises: type === 'musculation' ? exercises : [],
    });
    close();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Ajouter une séance</Text>
        <View style={styles.closeBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}
          >
            {WORKOUT_TYPES.map((w) => {
              const active = w.type === type;
              return (
                <Pressable
                  key={w.type}
                  onPress={() => setType(w.type)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.typePill, active && styles.typePillActive]}
                >
                  <Ionicons name={w.icon} size={16} color={active ? colors.background : colors.primary} />
                  <Text style={[styles.typePillLabel, active && styles.typePillLabelActive]}>{w.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Card style={styles.formCard}>
            <NumberField label="Durée" unit="min" value={durationMin} min={0} max={300} step={5} onChange={setDurationMin} />
          </Card>

          {type === 'musculation' && (
            <View style={styles.exercisesSection}>
              <Text style={styles.sectionLabel}>Exercices</Text>

              {exercises.length > 0 && (
                <Card style={styles.exerciseListCard}>
                  {exercises.map((ex, i) => (
                    <View key={ex.id}>
                      {i > 0 && <View style={styles.divider} />}
                      <View style={styles.exerciseRow}>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{ex.name}</Text>
                          <Text style={styles.exerciseDetail}>
                            {ex.sets} × {ex.reps} @ {ex.weightKg} kg · repos {ex.restSeconds}s
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => removeExercise(ex.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Supprimer ${ex.name}`}
                          hitSlop={8}
                        >
                          <Ionicons name="close" size={16} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </Card>
              )}

              <TextField placeholder="Nom de l'exercice" value={exName} onChangeText={setExName} />

              <Card style={styles.formCard}>
                <NumberField label="Séries" unit="" value={exSets} min={1} max={20} step={1} onChange={setExSets} />
                <View style={styles.divider} />
                <NumberField label="Répétitions" unit="" value={exReps} min={1} max={100} step={1} onChange={setExReps} />
                <View style={styles.divider} />
                <NumberField label="Charge" unit="kg" value={exWeight} min={0} max={500} step={5} onChange={setExWeight} />
                <View style={styles.divider} />
                <NumberField label="Repos" unit="sec" value={exRest} min={0} max={600} step={15} onChange={setExRest} />
              </Card>

              <Pressable onPress={addExercise} accessibilityRole="button" style={styles.addExerciseBtn}>
                <Ionicons name="add" size={16} color={colors.accent} />
                <Text style={styles.addExerciseLabel}>Ajouter l'exercice</Text>
              </Pressable>
            </View>
          )}

          <Card style={styles.formCard}>
            <NumberField
              label="Calories brûlées"
              unit="kcal"
              value={kcal}
              min={0}
              max={3000}
              step={10}
              onChange={(v) => {
                kcalEditedByUser.current = true;
                setKcal(v);
              }}
            />
          </Card>
          <Text style={styles.note}>Estimation automatique (durée × type) — ajustable si besoin.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <CtaButton label="Ajouter" onPress={save} disabled={!canSave} />
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
  flex: {
    flex: 1,
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
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  typeRow: {
    gap: spacing.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
  },
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typePillLabel: {
    ...typography.label,
    fontWeight: '500',
    color: colors.primary,
  },
  typePillLabelActive: {
    color: colors.background,
  },
  formCard: {
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  exercisesSection: {
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  exerciseListCard: {
    gap: 0,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    ...typography.body,
    fontWeight: '500',
    color: colors.primary,
  },
  exerciseDetail: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  addExerciseBtn: {
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
  addExerciseLabel: {
    ...typography.body,
    fontWeight: '500',
    color: colors.accent,
  },
  note: {
    ...typography.labelSm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
