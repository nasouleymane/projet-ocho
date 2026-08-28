import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { isWithinLastDays, todayISO } from '@/lib/date';
import { WorkoutType } from '@/lib/workout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/**
 * Ocho — store des séances d'entraînement, synchronisé avec la table
 * Supabase `workouts` (RLS scopée au propriétaire). AsyncStorage reste un
 * cache de lecture instantanée. `exercises` voyage en `jsonb` : toujours
 * écrit/lu comme un bloc avec sa séance parente (`add-workout.tsx`), rien ne
 * filtre un exercice indépendamment de sa séance aujourd'hui.
 */

const WORKOUTS_KEY = 'ocho.workouts.v1';

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
};

export type Workout = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  type: WorkoutType;
  durationMin: number;
  kcalBurned: number;
  /** Uniquement renseigné pour le type « musculation ». */
  exercises: Exercise[];
};

export type WorkoutInput = Omit<Workout, 'id' | 'date'>;

type WorkoutsContextValue = {
  isLoading: boolean;
  workouts: Workout[];
  entriesForDate: (date: string) => Workout[];
  dayKcal: (date: string) => number;
  countLastDays: (days: number) => number;
  addWorkout: (input: WorkoutInput, date?: string) => void;
  removeWorkout: (id: string) => void;
};

const WorkoutsContext = createContext<WorkoutsContextValue | undefined>(undefined);

type WorkoutRow = {
  id: string;
  date: string;
  type: WorkoutType;
  duration_min: number;
  kcal_burned: number;
  exercises: Exercise[];
};

const fromRow = (row: WorkoutRow): Workout => ({
  id: row.id,
  date: row.date,
  type: row.type,
  durationMin: row.duration_min,
  kcalBurned: row.kcal_burned,
  exercises: row.exercises,
});

const toRow = (userId: string, w: Workout) => ({
  id: w.id,
  user_id: userId,
  date: w.date,
  type: w.type,
  duration_min: w.durationMin,
  kcal_burned: w.kcalBurned,
  exercises: w.exercises,
});

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkouts([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WORKOUTS_KEY);
        if (raw) setWorkouts(JSON.parse(raw));
      } catch {
        // storage illisible → on repart d'une liste vide
      } finally {
        setIsLoading(false);
      }
    })();

    supabase
      .from('workouts')
      .select('id, date, type, duration_min, kcal_burned, exercises')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const fresh = (data as WorkoutRow[]).map(fromRow);
        setWorkouts(fresh);
        AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(fresh)).catch(() => {});
      });
  }, [user]);

  const persist = (next: Workout[]) => {
    setWorkouts(next);
    AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const addWorkout = (input: WorkoutInput, date: string = todayISO()) => {
    const workout: Workout = { ...input, id: Crypto.randomUUID(), date };
    persist([...workouts, workout]);
    if (user) {
      supabase
        .from('workouts')
        .insert(toRow(user.id, workout))
        .then(({ error }) => {
          if (error) console.warn('Échec de synchronisation de la séance :', error.message);
        });
    }
  };

  const removeWorkout = (id: string) => {
    persist(workouts.filter((w) => w.id !== id));
    if (user) {
      supabase
        .from('workouts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Échec de suppression (séance) :', error.message);
        });
    }
  };

  const entriesForDate = (date: string) => workouts.filter((w) => w.date === date);

  const dayKcal = (date: string) => entriesForDate(date).reduce((sum, w) => sum + w.kcalBurned, 0);

  const countLastDays = (days: number) => workouts.filter((w) => isWithinLastDays(w.date, days)).length;

  const value = useMemo<WorkoutsContextValue>(
    () => ({ isLoading, workouts, entriesForDate, dayKcal, countLastDays, addWorkout, removeWorkout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workouts, isLoading, user],
  );

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>;
}

export function useWorkouts() {
  const ctx = useContext(WorkoutsContext);
  if (!ctx) {
    throw new Error('useWorkouts doit être utilisé dans un <WorkoutsProvider>');
  }
  return ctx;
}
