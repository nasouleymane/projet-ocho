import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { todayISO } from '@/lib/date';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/**
 * Ocho — mini suivi de poids, synchronisé avec la table Supabase
 * `weight_entries` (RLS scopée au propriétaire). AsyncStorage reste un cache
 * de lecture instantanée. Alimente le Dashboard (« Poids actuel + évolution
 * depuis le début », cahier §3.2) et la courbe de l'écran Progression.
 */

const WEIGHT_KEY = 'ocho.weight.v1';

export type WeightEntry = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  weightKg: number;
};

type WeightContextValue = {
  isLoading: boolean;
  entries: WeightEntry[];
  latest: () => WeightEntry | null;
  first: () => WeightEntry | null;
  /** Évolution depuis la première pesée (négatif = perte). `null` si <2 pesées. */
  deltaSinceStart: () => number | null;
  addEntry: (weightKg: number, date?: string) => void;
};

const WeightContext = createContext<WeightContextValue | undefined>(undefined);

type WeightRow = { id: string; date: string; weight_kg: number };

const fromRow = (row: WeightRow): WeightEntry => ({ id: row.id, date: row.date, weightKg: row.weight_kg });
const toRow = (userId: string, e: WeightEntry) => ({
  id: e.id,
  user_id: userId,
  date: e.date,
  weight_kg: e.weightKg,
});

export function WeightProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(WEIGHT_KEY);
        if (raw) setEntries(JSON.parse(raw));
      } catch {
        // storage illisible → on repart d'une liste vide
      } finally {
        setIsLoading(false);
      }
    })();

    // order() est load-bearing : first()/latest() lisent entries[0]/[length-1].
    // created_at en départage pour plusieurs pesées le même jour.
    supabase
      .from('weight_entries')
      .select('id, date, weight_kg')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const fresh = (data as WeightRow[]).map(fromRow);
        setEntries(fresh);
        AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(fresh)).catch(() => {});
      });
  }, [user]);

  const persist = (next: WeightEntry[]) => {
    setEntries(next);
    AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const addEntry = (weightKg: number, date: string = todayISO()) => {
    const entry: WeightEntry = { id: Crypto.randomUUID(), date, weightKg };
    persist([...entries, entry]);
    if (user) {
      supabase
        .from('weight_entries')
        .insert(toRow(user.id, entry))
        .then(({ error }) => {
          if (error) console.warn('Échec de synchronisation du poids :', error.message);
        });
    }
  };

  const first = () => (entries.length > 0 ? entries[0] : null);
  const latest = () => (entries.length > 0 ? entries[entries.length - 1] : null);

  const deltaSinceStart = () => {
    const f = first();
    const l = latest();
    if (!f || !l || f.id === l.id) return null;
    return l.weightKg - f.weightKg;
  };

  const value = useMemo<WeightContextValue>(
    () => ({ isLoading, entries, latest, first, deltaSinceStart, addEntry }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, isLoading, user],
  );

  return <WeightContext.Provider value={value}>{children}</WeightContext.Provider>;
}

export function useWeight() {
  const ctx = useContext(WeightContext);
  if (!ctx) {
    throw new Error('useWeight doit être utilisé dans un <WeightProvider>');
  }
  return ctx;
}
