/**
 * Ocho — calculs nutritionnels (onboarding).
 *
 * BMR : formule Mifflin-St Jeor.
 * TDEE : BMR × facteur d'activité.
 * Apport recommandé : TDEE × facteur d'objectif.
 * Macros : protéines selon le poids, lipides ~25% des kcal, glucides = reste.
 */

export type Sex = 'homme' | 'femme';
export type ActivityLevel = 'sedentaire' | 'leger' | 'modere' | 'actif' | 'tres_actif';
export type Goal = 'seche' | 'maintien' | 'prise';

export type Profile = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activity: ActivityLevel;
  goal: Goal;
};

export type MacroTargets = { proteinG: number; carbsG: number; fatG: number };

export type Plan = {
  bmr: number; // métabolisme de base (kcal)
  tdee: number; // dépense énergétique totale (kcal)
  calorieTarget: number; // apport recommandé (kcal/jour)
  macros: MacroTargets;
};

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

/** Facteur appliqué au TDEE selon l'objectif. */
const GOAL_FACTORS: Record<Goal, number> = {
  seche: 0.8, // déficit ~20%
  maintien: 1.0,
  prise: 1.1, // surplus ~10% (prise « propre »)
};

/** Protéines cibles en g par kg de poids de corps. */
const PROTEIN_PER_KG: Record<Goal, number> = {
  seche: 2.0,
  maintien: 1.8,
  prise: 1.8,
};

/** Part des calories provenant des lipides. */
const FAT_RATIO = 0.25;

export function computeBMR(p: Profile): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === 'homme' ? 5 : -161));
}

export function computeTDEE(p: Profile): number {
  return Math.round(computeBMR(p) * ACTIVITY_FACTORS[p.activity]);
}

export function computePlan(p: Profile): Plan {
  const bmr = computeBMR(p);
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[p.activity]);
  const calorieTarget = Math.round(tdee * GOAL_FACTORS[p.goal]);

  const proteinG = Math.round(p.weightKg * PROTEIN_PER_KG[p.goal]);
  const fatG = Math.round((calorieTarget * FAT_RATIO) / 9);
  const carbKcal = Math.max(0, calorieTarget - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(carbKcal / 4);

  return { bmr, tdee, calorieTarget, macros: { proteinG, carbsG, fatG } };
}

export const DEFAULT_PROFILE: Profile = {
  sex: 'homme',
  age: 25,
  heightCm: 175,
  weightKg: 75,
  targetWeightKg: 70,
  activity: 'modere',
  goal: 'seche',
};
