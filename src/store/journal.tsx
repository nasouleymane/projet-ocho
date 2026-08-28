import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { MealType, todayISO } from '@/lib/date';
import { computeStreak } from '@/lib/streak';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/**
 * Store du journal alimentaire — synchronisé avec les tables Supabase
 * `journal_entries`/`favorite_foods` (RLS scopée au propriétaire, voir
 * `20260828124201_journal_weight_workouts.sql`). AsyncStorage reste un cache
 * de lecture instantanée, rafraîchi en arrière-plan depuis le serveur qui
 * fait autorité. Entrées à plat (une par aliment loggé) plutôt qu'imbriquées
 * par date/repas : plus simple à faire persister/agréger (totaux jour,
 * futurs totaux semaine).
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

type EntryRow = {
  id: string;
  date: string;
  meal_type: MealType;
  name: string;
  quantity_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type FavoriteRow = {
  id: string;
  name: string;
  quantity_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const entryFromRow = (row: EntryRow): FoodEntry => ({
  id: row.id,
  date: row.date,
  mealType: row.meal_type,
  name: row.name,
  quantityLabel: row.quantity_label,
  kcal: row.kcal,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatG: row.fat_g,
});

const entryToRow = (userId: string, e: FoodEntry) => ({
  id: e.id,
  user_id: userId,
  date: e.date,
  meal_type: e.mealType,
  name: e.name,
  quantity_label: e.quantityLabel,
  kcal: e.kcal,
  protein_g: e.proteinG,
  carbs_g: e.carbsG,
  fat_g: e.fatG,
});

const favoriteFromRow = (row: FavoriteRow): FavoriteFood => ({
  id: row.id,
  name: row.name,
  quantityLabel: row.quantity_label,
  kcal: row.kcal,
  proteinG: row.protein_g,
  carbsG: row.carbs_g,
  fatG: row.fat_g,
});

const favoriteToRow = (userId: string, f: FavoriteFood) => ({
  id: f.id,
  user_id: userId,
  name: f.name,
  quantity_label: f.quantityLabel,
  kcal: f.kcal,
  protein_g: f.proteinG,
  carbs_g: f.carbsG,
  fat_g: f.fatG,
});

export function JournalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setFavorites([]);
      setIsLoading(false);
      return;
    }

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

    // order() est load-bearing, pas cosmétique : frequentFoods() suppose le
    // tableau chronologique (dernier élément = occurrence la plus récente).
    supabase
      .from('journal_entries')
      .select('id, date, meal_type, name, quantity_label, kcal, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const fresh = (data as EntryRow[]).map(entryFromRow);
        setEntries(fresh);
        AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(fresh)).catch(() => {});
      });

    supabase
      .from('favorite_foods')
      .select('id, name, quantity_label, kcal, protein_g, carbs_g, fat_g')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const fresh = (data as FavoriteRow[]).map(favoriteFromRow);
        setFavorites(fresh);
        AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(fresh)).catch(() => {});
      });
  }, [user]);

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
    const entry: FoodEntry = { ...input, id: Crypto.randomUUID(), date };
    const next = [...entries, entry];
    persistEntries(next);
    if (user) {
      supabase
        .from('journal_entries')
        .insert(entryToRow(user.id, entry))
        .then(({ error }) => {
          if (error) console.warn('Échec de synchronisation du journal :', error.message);
        });
    }
    // Calculé sur le tableau local, jamais sur le réseau : addEntry doit
    // rester synchrone (consommé dans le même tick par add-food.tsx/
    // scan-barcode.tsx pour router vers /streak-celebration).
    return computeStreak(next.map((e) => e.date), todayISO());
  };

  const removeEntry = (id: string) => {
    persistEntries(entries.filter((e) => e.id !== id));
    if (user) {
      supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Échec de suppression (journal) :', error.message);
        });
    }
  };

  const addFavorite = (food: FavoriteInput) => {
    const favorite: FavoriteFood = { ...food, id: Crypto.randomUUID() };
    persistFavorites([...favorites, favorite]);
    if (user) {
      supabase
        .from('favorite_foods')
        .insert(favoriteToRow(user.id, favorite))
        .then(({ error }) => {
          if (error) console.warn('Échec de synchronisation des favoris :', error.message);
        });
    }
  };

  const removeFavorite = (id: string) => {
    persistFavorites(favorites.filter((f) => f.id !== id));
    if (user) {
      supabase
        .from('favorite_foods')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Échec de suppression (favori) :', error.message);
        });
    }
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
   * la portion a varié) — `entries` est trié chronologiquement (append-only
   * en local, `order('created_at')` côté serveur).
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
    [entries, favorites, isLoading, streakDays, user],
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
