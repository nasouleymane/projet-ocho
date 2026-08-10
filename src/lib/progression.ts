import { WeightEntry } from '@/store/weight';
import { Workout } from '@/store/workouts';
import { addDaysISO, daysBetweenISO } from '@/lib/date';

/**
 * Ocho — timeline narrative de l'écran Progression (cahier §3.5).
 * Résumé d'une semaine PLEINEMENT écoulée depuis le début du suivi (première
 * pesée). La semaine en cours (partielle) n'est jamais résumée ici — le
 * Dashboard couvre déjà « aujourd'hui » / « cette semaine ».
 */

export type WeekSummary = {
  weekIndex: number; // 1, 2, 3…
  label: string; // « Semaine 1 », « Semaine 2 »…
  /** Évolution du poids sur la semaine (négatif = perte). `null` si aucune pesée cette semaine-là. */
  weightDeltaKg: number | null;
  workouts: number;
  /** Déficit moyen des jours loggés (négatif = surplus). `null` si aucun jour loggé. */
  avgDeficitKcal: number | null;
};

type Params = {
  /** Date de la première pesée — ancre le « Jour 1 ». */
  startDate: string;
  today: string;
  weightEntries: WeightEntry[]; // triées par date croissante (ordre d'ajout du store)
  workouts: Workout[];
  /** Calories consommées pour une date donnée (0 si rien loggé ce jour-là). */
  dailyConsumed: (date: string) => number;
  calorieTarget: number;
};

export function computeWeekSummaries({
  startDate,
  today,
  weightEntries,
  workouts,
  dailyConsumed,
  calorieTarget,
}: Params): WeekSummary[] {
  const totalDays = daysBetweenISO(startDate, today);
  const completedWeeks = Math.floor(totalDays / 7);
  const summaries: WeekSummary[] = [];

  // La toute première pesée est LA référence « Jour 1 » (déjà affichée à part
  // dans la timeline) — on l'exclut des semaines pour ne pas la recompter
  // comme une mesure de la semaine 1 (ce qui produirait un delta de 0,0 kg
  // trompeur si aucune AUTRE pesée n'a eu lieu cette semaine-là).
  let lastKnownWeight = weightEntries[0]?.weightKg ?? null;
  const restEntries = weightEntries.slice(1);

  for (let w = 1; w <= completedWeeks; w++) {
    const weekStart = addDaysISO(startDate, (w - 1) * 7);
    const weekEnd = addDaysISO(startDate, w * 7); // exclusif

    const weekWeighIns = restEntries.filter((e) => e.date >= weekStart && e.date < weekEnd);
    let weightDeltaKg: number | null = null;
    if (weekWeighIns.length > 0 && lastKnownWeight !== null) {
      const weekLast = weekWeighIns[weekWeighIns.length - 1].weightKg;
      weightDeltaKg = weekLast - lastKnownWeight;
      lastKnownWeight = weekLast;
    }

    const workoutsCount = workouts.filter((wo) => wo.date >= weekStart && wo.date < weekEnd).length;

    let deficitSum = 0;
    let loggedDays = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDaysISO(weekStart, i);
      const consumed = dailyConsumed(day);
      if (consumed > 0) {
        deficitSum += calorieTarget - consumed;
        loggedDays += 1;
      }
    }
    const avgDeficitKcal = loggedDays > 0 ? Math.round(deficitSum / loggedDays) : null;

    summaries.push({ weekIndex: w, label: `Semaine ${w}`, weightDeltaKg, workouts: workoutsCount, avgDeficitKcal });
  }

  return summaries;
}
