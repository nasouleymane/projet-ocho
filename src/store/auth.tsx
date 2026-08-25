import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { migrateLocalDataIfNeeded } from '@/lib/migrateLocalDataToSupabase';

/**
 * Store de session (comptes utilisateurs) — englobe les stores de données
 * (profil, journal, poids, séances, photos, réglages), qui lisent toutes
 * `user?.id` pour savoir quoi charger/synchroniser depuis Supabase.
 *
 * Connexion Google/Apple en flux web (pas de SDK natif) : `signInWithOAuth`
 * ouvre la page de connexion Supabase dans le navigateur du système
 * (`expo-web-browser`), récupère le `?code=` de retour et l'échange contre
 * une session. Fonctionne directement dans Expo Go — un SDK natif exigerait
 * un dev client / build EAS.
 */

const CACHE_KEYS_TO_CLEAR_ON_SIGN_OUT = ['ocho.profile.v1', 'ocho.settings.v1'];

type OAuthProvider = 'google' | 'apple';
type AuthResult = { error: string | null };

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        // Migration ponctuelle des données locales : uniquement sur une vraie
        // connexion, jamais sur la restauration de session au démarrage
        // (INITIAL_SESSION) — et avant de poser la session, pour que les
        // stores de données n'interrogent jamais le serveur avant l'upload.
        if (event === 'SIGNED_IN' && newSession?.user) {
          await migrateLocalDataIfNeeded(newSession.user.id);
        }
        if (event === 'SIGNED_OUT') {
          AsyncStorage.multiRemove(CACHE_KEYS_TO_CLEAR_ON_SIGN_OUT).catch(() => {});
        }
        setSession(newSession);
        setIsLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      // Ne jamais laisser une exception non rattrapée ici (ex. coupure
      // réseau) : sinon l'écran reste bloqué en chargement indéfiniment,
      // le bouton restant désactivé pour toute tentative suivante.
      return { error: err instanceof Error ? err.message : 'Connexion impossible.' };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Connexion impossible.' };
    }
  };

  const signInWithOAuth = async (provider: OAuthProvider): Promise<AuthResult> => {
    // Linking.createURL résout en exp://<host>/--/auth-callback dans Expo Go,
    // et basculera automatiquement sur ocho:// si l'app passe un jour en dev
    // client / build autonome — ne jamais coder le schéma en dur ici.
    const redirectTo = Linking.createURL('/auth-callback');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) {
        return { error: error?.message ?? 'Lien de connexion indisponible.' };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success' || !result.url) {
        return { error: result.type === 'cancel' || result.type === 'dismiss' ? null : 'Connexion annulée.' };
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      return { error: exchangeError?.message ?? null };
    } catch (err) {
      // WebBrowser.openAuthSessionAsync peut rejeter (ex. popup bloquée par le
      // navigateur en test web — n'arrive pas sur iOS/Android natif, qui
      // n'ouvre pas de popup) : ne jamais laisser une exception non rattrapée
      // ici, sinon le bouton reste bloqué en chargement indéfiniment côté écran.
      return { error: err instanceof Error ? err.message : 'Connexion impossible.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      signUpWithEmail,
      signInWithEmail,
      signInWithOAuth,
      signOut,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  }
  return ctx;
}
