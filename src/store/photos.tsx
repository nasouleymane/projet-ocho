import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { todayISO } from '@/lib/date';
import {
  saveProgressPhoto,
  deleteProgressPhotoFile,
  uploadProgressPhoto,
  deleteRemoteProgressPhoto,
  resolveLocalPhotoUri,
} from '@/lib/photoStorage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';

/**
 * Ocho — photos de progression (cahier §4, V2), synchronisées avec la table
 * Supabase `progress_photos` (RLS scopée au propriétaire) + bucket Storage
 * privé `progress-photos`. Les métadonnées (id, date, storage_path) vivent
 * côté serveur ; les octets de l'image vivent sur disque local (cache de
 * lecture instantanée, `src/lib/photoStorage.ts`) et dans Storage.
 */

const PHOTOS_KEY = 'ocho.photos.v1';

export type ProgressPhoto = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  uri: string;
  storagePath: string;
};

type PhotosContextValue = {
  isLoading: boolean;
  /** Triées la plus récente en premier. */
  photos: ProgressPhoto[];
  /** Copie `pickedUri` vers le stockage permanent puis ajoute l'entrée. */
  addPhoto: (pickedUri: string, date?: string) => void;
  /** Retire l'entrée ET supprime le fichier physique associé. */
  removePhoto: (id: string) => void;
};

const PhotosContext = createContext<PhotosContextValue | undefined>(undefined);

type PhotoRow = { id: string; date: string; storage_path: string };

export function PhotosProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPhotos([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PHOTOS_KEY);
        if (raw) setPhotos(JSON.parse(raw));
      } catch {
        // storage illisible → on repart d'une liste vide
      } finally {
        setIsLoading(false);
      }
    })();

    supabase
      .from('progress_photos')
      .select('id, date, storage_path')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .then(async ({ data }) => {
        if (!data) return;
        const rows = data as PhotoRow[];
        const fresh = await Promise.all(
          rows.map(async (row) => {
            try {
              const uri = await resolveLocalPhotoUri(row.storage_path);
              return { id: row.id, date: row.date, uri, storagePath: row.storage_path };
            } catch {
              // photo distante inaccessible (réseau, url signée expirée) → on la
              // saute plutôt que de casser toute la grille
              return null;
            }
          }),
        );
        const resolved = fresh.filter((p): p is ProgressPhoto => p !== null);
        setPhotos(resolved);
        AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(resolved)).catch(() => {});
      });
  }, [user]);

  const persist = (next: ProgressPhoto[]) => {
    setPhotos(next);
    AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const addPhoto = (pickedUri: string, date: string = todayISO()) => {
    const uri = saveProgressPhoto(pickedUri);
    const filename = uri.split('/').pop() ?? uri;
    const id = Crypto.randomUUID();
    const storagePath = user ? `${user.id}/${filename}` : '';
    persist([...photos, { id, date, uri, storagePath }]);

    if (user) {
      uploadProgressPhoto(user.id, uri, filename)
        .then(() =>
          supabase
            .from('progress_photos')
            .insert({ id, user_id: user.id, date, storage_path: storagePath }),
        )
        .then((result) => {
          if (result && 'error' in result && result.error) {
            console.warn('Échec de synchronisation de la photo :', result.error.message);
          }
        })
        .catch((error) => console.warn('Échec de synchronisation de la photo :', error?.message));
    }
  };

  const removePhoto = (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (target) deleteProgressPhotoFile(target.uri);
    persist(photos.filter((p) => p.id !== id));

    if (user && target?.storagePath) {
      deleteRemoteProgressPhoto(target.storagePath).catch((error) =>
        console.warn('Échec de suppression distante (photo) :', error?.message),
      );
      supabase
        .from('progress_photos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .then(({ error }) => {
          if (error) console.warn('Échec de suppression (photo) :', error.message);
        });
    }
  };

  const sorted = useMemo(
    () => [...photos].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [photos],
  );

  const value = useMemo<PhotosContextValue>(
    () => ({ isLoading, photos: sorted, addPhoto, removePhoto }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, isLoading, user],
  );

  return <PhotosContext.Provider value={value}>{children}</PhotosContext.Provider>;
}

export function usePhotos() {
  const ctx = useContext(PhotosContext);
  if (!ctx) {
    throw new Error('usePhotos doit être utilisé dans un <PhotosProvider>');
  }
  return ctx;
}
