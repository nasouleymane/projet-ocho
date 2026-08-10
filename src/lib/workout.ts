import { Ionicons } from '@expo/vector-icons';

/** Ocho — types de séance et estimation calorique (cahier §3.4). */

export type WorkoutType =
  | 'musculation'
  | 'cardio'
  | 'hiit'
  | 'football'
  | 'basketball'
  | 'natation'
  | 'autre';

type WorkoutTypeMeta = {
  type: WorkoutType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Équivalent métabolique (MET) — sert au calcul simple des calories brûlées. */
  met: number;
};

export const WORKOUT_TYPES: WorkoutTypeMeta[] = [
  { type: 'musculation', label: 'Musculation', icon: 'barbell-outline', met: 5 },
  { type: 'cardio', label: 'Cardio', icon: 'heart-outline', met: 7 },
  { type: 'hiit', label: 'HIIT', icon: 'flash-outline', met: 8 },
  { type: 'football', label: 'Football', icon: 'football-outline', met: 7 },
  { type: 'basketball', label: 'Basketball', icon: 'basketball-outline', met: 6.5 },
  { type: 'natation', label: 'Natation', icon: 'water-outline', met: 6 },
  { type: 'autre', label: 'Autre', icon: 'ellipsis-horizontal-outline', met: 5 },
];

/** Calcul simple des calories brûlées : MET × poids (kg) × durée (h). */
export function estimateKcal(type: WorkoutType, durationMin: number, weightKg: number): number {
  const met = WORKOUT_TYPES.find((w) => w.type === type)?.met ?? 5;
  return Math.round(met * weightKg * (durationMin / 60));
}
