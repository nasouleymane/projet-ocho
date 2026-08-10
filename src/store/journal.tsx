import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '@/lib/id';
import { MealType, todayISO } from '@/lib/date';

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

export type FoodInput = Omit<FoodEntry, 'id' | 'date'>;
export type FavoriteInput = Omit<FavoriteFood, 'id'>;

type Totals = { kcal: number; proteinG: number; carbsG: number; fatG: number };

type JournalContextValue = {
  isLoading: boolean;
  entriesForDate: (date: string) => FoodEntry[];
  entriesForMeal: (date: string, meal: MealType) => FoodEntry[];
  dayTotals: (date: string) => Totals;
  addEntry: (input: FoodInput, date?: string) => void;
  removeEntry: (id: string) => void;
  favorites: FavoriteFood[];
  addFavorite: (food: FavoriteInput) => void;
  removeFavorite: (id: string) => void;
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

  const addEntry = (input: FoodInput, date: string = todayISO()) => {
    persistEntries([...entries, { ...input, id: generateId('food'), date }]);
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
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, favorites, isLoading],
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
