import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase — sert uniquement à invoquer l'Edge Function d'estimation
 * IA (cahier §3.7). Pas d'authentification Supabase dans Ocho (données
 * locales via AsyncStorage) : pas de config `auth` nécessaire ici.
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables Supabase manquantes (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY) — copier .env.example en .env et renseigner.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
