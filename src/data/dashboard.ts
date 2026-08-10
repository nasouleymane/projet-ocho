import { MacroKey } from '@/theme';

/**
 * Données mock du Dashboard.
 *
 * En V1 ces valeurs viendront du profil (BMR/TDEE calculés à l'onboarding) et
 * du journal du jour. Pour le scaffolding on part d'un jeu de données statique
 * afin de valider le rendu de l'écran.
 */

export type MacroDatum = { key: MacroKey; label: string; consumed: number; goal: number };

export type DashboardData = {
  firstName: string;
  streakDays: number;
  calories: {
    goal: number; // apport recommandé (kcal)
    consumed: number; // consommées aujourd'hui
    burned: number; // brûlées (séance)
    deficit: number; // déficit calorique du jour
  };
  macros: MacroDatum[];
  week: {
    weightKg: number;
    weightDeltaKg: number; // évolution depuis le début (négatif = perte)
    workouts: number;
    waterLitersPerDay: number;
  };
};

export const dashboard: DashboardData = {
  firstName: 'Sam',
  streakDays: 12,
  calories: {
    goal: 2100,
    consumed: 1540,
    burned: 320,
    deficit: 480,
  },
  macros: [
    { key: 'protein', label: 'Protéines', consumed: 118, goal: 160 },
    { key: 'carbs', label: 'Glucides', consumed: 165, goal: 220 },
    { key: 'fat', label: 'Lipides', consumed: 52, goal: 70 },
  ],
  week: {
    weightKg: 74.2,
    weightDeltaKg: -1.8,
    workouts: 4,
    waterLitersPerDay: 2.1,
  },
};
