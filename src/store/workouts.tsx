import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '@/lib/id';
import { isWithinLastDays, todayISO } from '@/lib/date';
import { WorkoutType } from '@/lib/workout';

/** Ocho — store des séances d'entraînement, persisté via AsyncStorage. */

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

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const persist = (next: Workout[]) => {
    setWorkouts(next);
    AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const addWorkout = (input: WorkoutInput, date: string = todayISO()) => {
    persist([...workouts, { ...input, id: generateId('workout'), date }]);
  };

  const removeWorkout = (id: string) => {
    persist(workouts.filter((w) => w.id !== id));
  };

  const entriesForDate = (date: string) => workouts.filter((w) => w.date === date);

  const dayKcal = (date: string) => entriesForDate(date).reduce((sum, w) => sum + w.kcalBurned, 0);

  const countLastDays = (days: number) => workouts.filter((w) => isWithinLastDays(w.date, days)).length;

  const value = useMemo<WorkoutsContextValue>(
    () => ({ isLoading, workouts, entriesForDate, dayKcal, countLastDays, addWorkout, removeWorkout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workouts, isLoading],
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
