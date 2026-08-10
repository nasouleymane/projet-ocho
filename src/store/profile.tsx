import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile, Plan, computePlan } from '@/lib/nutrition';

/**
 * Store du profil utilisateur (onboarding), persisté localement via AsyncStorage.
 * En V1+, il sera synchronisé avec Supabase. Le `plan` (BMR/TDEE/macros) est
 * dérivé du profil et consommé par le Dashboard.
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

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setProfile(JSON.parse(raw) as Profile);
      } catch {
        // profil illisible → on repart de l'onboarding
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const saveProfile = async (p: Profile) => {
    setProfile(p);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // échec d'écriture non bloquant pour le proto
    }
  };

  const resetProfile = async () => {
    setProfile(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
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
