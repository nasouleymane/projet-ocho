/** Ocho — types et helpers de date/repas partagés par le journal. */

export type MealType = 'petit-dejeuner' | 'dejeuner' | 'diner' | 'collation';

/** Date du jour au format 'YYYY-MM-DD' (heure locale). */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Type de repas suggéré selon l'heure courante (pour préremplir l'ajout rapide). */
export function defaultMealTypeNow(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'petit-dejeuner';
  if (h >= 11 && h < 15) return 'dejeuner';
  if (h >= 15 && h < 19) return 'collation';
  return 'diner';
}

/** Vrai si `dateISO` (YYYY-MM-DD) tombe dans les `days` derniers jours (aujourd'hui inclus). */
export function isWithinLastDays(dateISO: string, days: number): boolean {
  const d = new Date(`${dateISO}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = (startOfToday.getTime() - d.getTime()) / 86_400_000;
  return diffDays >= 0 && diffDays < days;
}

/** Ajoute (ou retranche) `days` jours à une date ISO 'YYYY-MM-DD'. */
export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Nombre de jours entiers entre deux dates ISO (b - a). */
export function daysBetweenISO(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}
