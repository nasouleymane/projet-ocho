import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '@/lib/id';
import { MealType, todayISO } from '@/lib/date';
import { computeStreak } from '@/lib/streak';

/**
 * Store du journal alimentaire, persisté localement via AsyncStorage.
 * Entrées à plat (une par aliment loggé) plutôt qu'imbriquées par date/repas :
 * plus simple à faire persister/agréger (totaux jour, futurs totaux semaine).
 */

const ENTRIES_KEY = 'ocho.journal.entries.v1';
const FAVORITES_KEY = 'ocho.journal.favorites.v1';

export type FoodEntry = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  mealType: MealType;
  name: string;
  quantityLabel: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type FavoriteFood = {
  id: string;
  name: string;
  quantityLabel: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Aliment détecté comme fréquent depuis l'historique (pas une saisie utilisateur, pas persisté à part). */
export type FrequentFood = {
  name: string;
  quantityLabel: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  count: number;
};

export type FoodInput = Omit<FoodEntry, 'id' | 'date'>;
export type FavoriteInput = Omit<FavoriteFood, 'id'>;

type Totals = { kcal: number; proteinG: number; carbsG: number; fatG: number };

type JournalContextValue = {
  isLoading: boolean;
  entriesForDate: (date: string) => FoodEntry[];
  entriesForMeal: (date: string, meal: MealType) => FoodEntry[];
  dayTotals: (date: string) => Totals;
  /** Ajoute l'entrée et renvoie le streak résultant (pour détecter un palier franchi côté écran). */
  addEntry: (input: FoodInput, date?: string) => number;
  removeEntry: (id: string) => void;
  favorites: FavoriteFood[];
  addFavorite: (food: FavoriteInput) => void;
  removeFavorite: (id: string) => void;
  frequentFoods: (limit?: number) => FrequentFood[];
  /** Jours consécutifs avec au moins un aliment loggé, jusqu'à aujourd'hui. */
  streakDays: number;
};

const JournalContext = createContext<JournalContextValue | undefined>(undefined);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rawEntries, rawFavorites] = await Promise.all([
          AsyncStorage.getItem(ENTRIES_KEY),
          AsyncStorage.getItem(FAVORITES_KEY),
        ]);
        if (rawEntries) setEntries(JSON.parse(rawEntries));
        if (rawFavorites) setFavorites(JSON.parse(rawFavorites));
      } catch {
        // storage illisible → on repart d'un journal vide
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistEntries = (next: FoodEntry[]) => {
    setEntries(next);
    AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const persistFavorites = (next: FavoriteFood[]) => {
    setFavorites(next);
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const addEntry = (input: FoodInput, date: string = todayISO()): number => {
    const next = [...entries, { ...input, id: generateId('food'), date }];
    persistEntries(next);
    return computeStreak(next.map((e) => e.date), todayISO());
  };

  const removeEntry = (id: string) => {
    persistEntries(entries.filter((e) => e.id !== id));
  };

  const addFavorite = (food: FavoriteInput) => {
    persistFavorites([...favorites, { ...food, id: generateId('fav') }]);
  };

  const removeFavorite = (id: string) => {
    persistFavorites(favorites.filter((f) => f.id !== id));
  };

  const entriesForDate = (date: string) => entries.filter((e) => e.date === date);
  const entriesForMeal = (date: string, meal: MealType) =>
    entries.filter((e) => e.date === date && e.mealType === meal);

  const dayTotals = (date: string): Totals =>
    entriesForDate(date).reduce(
      (acc, e) => ({
        kcal: acc.kcal + e.kcal,
        proteinG: acc.proteinG + e.proteinG,
        carbsG: acc.carbsG + e.carbsG,
        fatG: acc.fatG + e.fatG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

  /**
   * Aliments les plus souvent loggés, tous repas/dates confondus — pas une
   * liste que l'utilisateur curate (contrairement aux favoris), déduite de
   * l'historique. Un plat compte comme « fréquent » à partir de 2 occurrences
   * (une seule occurrence n'a rien de fréquent). Les valeurs affichées sont
   * celles de la dernière fois loggée (plus représentatif qu'une moyenne si
   * la portion a varié), `entries` étant append-only donc déjà en ordre
   * chronologique.
   */
  const frequentFoods = (limit: number = 8): FrequentFood[] => {
    const byName = new Map<string, FoodEntry[]>();
    for (const e of entries) {
      const list = byName.get(e.name);
      if (list) list.push(e);
      else byName.set(e.name, [e]);
    }
    return Array.from(byName.values())
      .filter((list) => list.length >= 2)
      .sort((a, b) => b.length - a.length)
      .slice(0, limit)
      .map((list) => {
        const latest = list[list.length - 1];
        return {
          name: latest.name,
          quantityLabel: latest.quantityLabel,
          kcal: latest.kcal,
          proteinG: latest.proteinG,
          carbsG: latest.carbsG,
          fatG: latest.fatG,
          count: list.length,
        };
      });
  };

  const streakDays = useMemo(
    () => computeStreak(entries.map((e) => e.date), todayISO()),
    [entries],
  );

  const value = useMemo<JournalContextValue>(
    () => ({
      isLoading,
      entriesForDate,
      entriesForMeal,
      dayTotals,
      addEntry,
      removeEntry,
      favorites,
      addFavorite,
      removeFavorite,
      frequentFoods,
      streakDays,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, favorites, isLoading, streakDays],
  );

  return <JournalContext.Provider value={value}>{children}</JournalContext.Provider>;
}

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) {
    throw new Error('useJournal doit être utilisé dans un <JournalProvider>');
  }
  return ctx;
}
