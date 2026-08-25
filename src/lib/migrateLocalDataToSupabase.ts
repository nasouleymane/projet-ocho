import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { Profile } from './nutrition';
import { Settings } from '@/store/settings';

/**
 * Migration ponctuelle des données locales existantes vers Supabase, au tout
 * premier login d'un compte (cahier « comptes utilisateurs », phase 1 :
 * profil + réglages seulement — journal/poids/séances/photos suivront).
 *
 * Appelée uniquement par `AuthProvider` sur l'événement `SIGNED_IN`, et
 * *avant* que les stores de données n'hydratent depuis Supabase pour ce
 * `user_id` — sinon un store qui interroge le serveur avant l'upload
 * trouverait 0 ligne et écraserait le cache local optimiste, perdant les
 * données déjà présentes sur l'appareil.
 */

const MIGRATION_MARKER_PREFIX = 'ocho.migration.v1.completed.';

export async function migrateLocalDataIfNeeded(userId: string): Promise<void> {
  const markerKey = `${MIGRATION_MARKER_PREFIX}${userId}`;
  if (await AsyncStorage.getItem(markerKey)) return;

  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    // Un profil serveur existe déjà (compte déjà synchronisé depuis un autre
    // appareil) : rien à uploader depuis cet appareil-ci, le serveur fait autorité.
    if (!existingProfile) {
      const rawProfile = await AsyncStorage.getItem('ocho.profile.v1');
      if (rawProfile) {
        const profile: Profile = JSON.parse(rawProfile);
        await supabase.from('profiles').upsert({
          user_id: userId,
          sex: profile.sex,
          age: profile.age,
          height_cm: profile.heightCm,
          weight_kg: profile.weightKg,
          target_weight_kg: profile.targetWeightKg,
          activity: profile.activity,
          goal: profile.goal,
        });
      }

      const rawSettings = await AsyncStorage.getItem('ocho.settings.v1');
      if (rawSettings) {
        const settings: Settings = JSON.parse(rawSettings);
        await supabase.from('user_settings').upsert({
          user_id: userId,
          theme_mode: settings.themeMode,
          units: settings.units,
          notifications: settings.notifications,
        });
      }
    }

    await AsyncStorage.setItem(markerKey, 'true');
  } catch {
    // Migration non bloquante : marqueur non posé, on réessaiera au prochain login.
  }
}
