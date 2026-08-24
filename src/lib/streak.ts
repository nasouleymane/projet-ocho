import { addDaysISO } from './date';

/**
 * Streak de logging (cahier V2) : nombre de jours consécutifs avec au moins
 * une entrée au journal, jusqu'à aujourd'hui. Grâce d'un jour : si rien n'est
 * encore loggé aujourd'hui, le streak reste « vivant » tant qu'hier a été
 * loggé — l'utilisateur a jusqu'à la fin de la journée pour ne pas le casser,
 * il ne retombe pas à 0 juste parce qu'il n'a pas encore ouvert l'app.
 */
export function computeStreak(loggedDates: string[], today: string): number {
  const logged = new Set(loggedDates);
  let cursor = logged.has(today) ? today : addDaysISO(today, -1);

  let count = 0;
  while (logged.has(cursor)) {
    count += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return count;
}
