import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, Plan, computePlan } from '@/lib/nutrition';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/**
 * Store du profil utilisateur (onboarding), synchronisé avec la table
 * Supabase `profiles` (une ligne par utilisateur, RLS scopée au
 * propriétaire). AsyncStorage reste un cache de lecture instantanée,
 * rafraîchi en arrière-plan depuis le serveur qui fait autorité — voir la
 * migration `20260825080613_profiles_and_settings.sql`. Le `plan`
 * (BMR/TDEE/macros) reste dérivé du profil, jamais persisté.
 */

const STORAGE_KEY = 'ocho.profile.v1';

type ProfileContextValue = {
  profile: Profile | null;
  plan: Plan | null;
  isLoading: boolean;
  hasProfile: boolean;
  saveProfile: (p: Profile) => Promise<void>;
  resetProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

type ProfileRow = {
  sex: Profile['sex'];
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity: Profile['activity'];
  goal: Profile['goal'];
};

const fromRow = (row: ProfileRow): Profile => ({
  sex: row.sex,
  age: row.age,
  heightCm: row.height_cm,
  weightKg: row.weight_kg,
  targetWeightKg: row.target_weight_kg,
  activity: row.activity,
  goal: row.goal,
});

const toRow = (userId: string, p: Profile) => ({
  user_id: userId,
  sex: p.sex,
  age: p.age,
  height_cm: p.heightCm,
  weight_kg: p.weightKg,
  target_weight_kg: p.targetWeightKg,
  activity: p.activity,
  goal: p.goal,
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProfile(JSON.parse(raw) as Profile);
      } catch {
        // profil illisible → on repart du cache vide
      } finally {
        setIsLoading(false);
      }
    })();

    supabase
      .from('profiles')
      .select('sex, age, height_cm, weight_kg, target_weight_kg, activity, goal')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const fresh = fromRow(data as ProfileRow);
        setProfile(fresh);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)).catch(() => {});
      });
  }, [user]);

  const saveProfile = async (p: Profile) => {
    setProfile(p);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
    if (user) {
      supabase
        .from('profiles')
        .upsert(toRow(user.id, p))
        .then(({ error }) => {
          if (error) console.warn('Échec de synchronisation du profil :', error.message);
        });
    }
  };

  const resetProfile = async () => {
    setProfile(null);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    if (user) {
      supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Échec de suppression du profil :', error.message);
        });
    }
  };

  const plan = useMemo(() => (profile ? computePlan(profile) : null), [profile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      plan,
      isLoading,
      hasProfile: profile !== null,
      saveProfile,
      resetProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, plan, isLoading],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile doit être utilisé dans un <ProfileProvider>');
  }
  return ctx;
}
