import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';
import { uploadProgressPhoto } from './photoStorage';
import { Profile } from './nutrition';
import { Settings } from '@/store/settings';
import { FoodEntry, FavoriteFood } from '@/store/journal';
import { WeightEntry } from '@/store/weight';
import { Workout } from '@/store/workouts';
import { ProgressPhoto } from '@/store/photos';

/**
 * Migration ponctuelle des données locales existantes vers Supabase, au tout
 * premier login d'un compte (cahier « comptes utilisateurs »). Couvre
 * profil, réglages, journal (+ favoris), poids, séances et photos.
 *
 * Appelée uniquement par `AuthProvider` sur l'événement `SIGNED_IN`, et
 * *avant* que les stores de données n'hydratent depuis Supabase pour ce
 * `user_id` — sinon un store qui interroge le serveur avant l'upload
 * trouverait 0 ligne et écraserait le cache local optimiste, perdant les
 * données déjà présentes sur l'appareil.
 *
 * Les entrées locales créées avant ce chantier utilisent `generateId()`
 * (pas un UUID — voir `src/lib/id.ts`), incompatible avec les colonnes
 * `id uuid` des tables synchronisées. On leur assigne un UUID neuf ici, et on
 * réécrit le cache local avec ces mêmes UUID pour que les suppressions
 * futures (`removeEntry`, etc.) restent alignées avec le serveur.
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

      const rawEntries = await AsyncStorage.getItem('ocho.journal.entries.v1');
      if (rawEntries) {
        const entries: FoodEntry[] = JSON.parse(rawEntries).map((e: FoodEntry) => ({ ...e, id: Crypto.randomUUID() }));
        if (entries.length > 0) {
          await supabase.from('journal_entries').insert(
            entries.map((e) => ({
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
            })),
          );
          await AsyncStorage.setItem('ocho.journal.entries.v1', JSON.stringify(entries));
        }
      }

      const rawFavorites = await AsyncStorage.getItem('ocho.journal.favorites.v1');
      if (rawFavorites) {
        const favorites: FavoriteFood[] = JSON.parse(rawFavorites).map((f: FavoriteFood) => ({
          ...f,
          id: Crypto.randomUUID(),
        }));
        if (favorites.length > 0) {
          await supabase.from('favorite_foods').insert(
            favorites.map((f) => ({
              id: f.id,
              user_id: userId,
              name: f.name,
              quantity_label: f.quantityLabel,
              kcal: f.kcal,
              protein_g: f.proteinG,
              carbs_g: f.carbsG,
              fat_g: f.fatG,
            })),
          );
          await AsyncStorage.setItem('ocho.journal.favorites.v1', JSON.stringify(favorites));
        }
      }

      const rawWeight = await AsyncStorage.getItem('ocho.weight.v1');
      if (rawWeight) {
        const weightEntries: WeightEntry[] = JSON.parse(rawWeight).map((w: WeightEntry) => ({
          ...w,
          id: Crypto.randomUUID(),
        }));
        if (weightEntries.length > 0) {
          await supabase.from('weight_entries').insert(
            weightEntries.map((w) => ({ id: w.id, user_id: userId, date: w.date, weight_kg: w.weightKg })),
          );
          await AsyncStorage.setItem('ocho.weight.v1', JSON.stringify(weightEntries));
        }
      }

      const rawWorkouts = await AsyncStorage.getItem('ocho.workouts.v1');
      if (rawWorkouts) {
        const workouts: Workout[] = JSON.parse(rawWorkouts).map((w: Workout) => ({ ...w, id: Crypto.randomUUID() }));
        if (workouts.length > 0) {
          await supabase.from('workouts').insert(
            workouts.map((w) => ({
              id: w.id,
              user_id: userId,
              date: w.date,
              type: w.type,
              duration_min: w.durationMin,
              kcal_burned: w.kcalBurned,
              exercises: w.exercises,
            })),
          );
          await AsyncStorage.setItem('ocho.workouts.v1', JSON.stringify(workouts));
        }
      }

      const rawPhotos = await AsyncStorage.getItem('ocho.photos.v1');
      if (rawPhotos) {
        const legacyPhotos: { id: string; date: string; uri: string }[] = JSON.parse(rawPhotos);
        if (legacyPhotos.length > 0) {
          const migrated: ProgressPhoto[] = [];
          // séquentiel plutôt que Promise.all : chaque étape lit un fichier local
          // et l'envoie sur le réseau, un lot en parallèle serait inutilement
          // gourmand pour le nombre de photos réellement attendu ici.
          for (const photo of legacyPhotos) {
            const filename = photo.uri.split('/').pop() ?? photo.id;
            const storagePath = `${userId}/${filename}`;
            await uploadProgressPhoto(userId, photo.uri, filename);
            const id = Crypto.randomUUID();
            await supabase
              .from('progress_photos')
              .insert({ id, user_id: userId, date: photo.date, storage_path: storagePath });
            migrated.push({ id, date: photo.date, uri: photo.uri, storagePath });
          }
          await AsyncStorage.setItem('ocho.photos.v1', JSON.stringify(migrated));
        }
      }
    }

    await AsyncStorage.setItem(markerKey, 'true');
  } catch {
    // Migration non bloquante : marqueur non posé, on réessaiera au prochain login.
  }
}
