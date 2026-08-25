import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client Supabase — invoque l'Edge Function d'estimation IA (cahier §3.7) et,
 * depuis les comptes utilisateurs, gère l'authentification (email, Google,
 * Apple) et la synchronisation des données.
 *
 * `storage` utilise expo-secure-store (Keychain/Keystore chiffré) sur
 * iOS/Android plutôt qu'AsyncStorage comme le reste de l'app : la session
 * contient un refresh token, équivalent à un mot de passe, qui mérite un
 * stockage chiffré — contrairement aux données nutrition/poids qui n'ont pas
 * cette sensibilité. expo-secure-store n'a pas d'implémentation web (module
 * natif vide, plante si appelé) : repli sur AsyncStorage sur `web`, utilisé
 * uniquement pour les tests en navigateur, jamais en production mobile.
 * `expo start --web` fait aussi un rendu SSR (sortie `static` d'expo-router,
 * `app.json`) où `window` n'existe pas encore : AsyncStorage plante à
 * l'initialisation du client si on l'utilise tel quel côté serveur — d'où le
 * repli sur un stockage no-op tant que `window` n'est pas défini.
 * `flowType: 'pkce'` : le retour OAuth arrive en `?code=` dans l'URL de
 * redirection, plus simple à consommer depuis un handler de deep link RN que
 * le flux implicite (tokens dans le fragment d'URL). `detectSessionInUrl:
 * false` : pas de `window` en React Native, la session ne peut pas être
 * détectée depuis l'URL du navigateur comme sur le web.
 */

const NoopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const SessionStorageAdapter =
  Platform.OS === 'web'
    ? typeof window === 'undefined'
      ? NoopStorage
      : AsyncStorage
    : {
        getItem: (key: string) => SecureStore.getItemAsync(key),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key),
      };

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables Supabase manquantes (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY) — copier .env.example en .env et renseigner.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SessionStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
