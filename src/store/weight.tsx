import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '@/lib/id';
import { todayISO } from '@/lib/date';

/**
 * Ocho — mini suivi de poids, persisté via AsyncStorage.
 * Alimente le Dashboard (« Poids actuel + évolution depuis le début », cahier
 * §3.2) et servira de source aux graphiques de l'écran Progression plus tard.
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

export function WeightProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const persist = (next: WeightEntry[]) => {
    setEntries(next);
    AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const addEntry = (weightKg: number, date: string = todayISO()) => {
    persist([...entries, { id: generateId('weight'), date, weightKg }]);
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
    [entries, isLoading],
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
