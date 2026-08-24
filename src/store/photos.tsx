import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '@/lib/id';
import { todayISO } from '@/lib/date';
import { saveProgressPhoto, deleteProgressPhotoFile } from '@/lib/photoStorage';

/**
 * Ocho — photos de progression (cahier §4, V2), persistées via AsyncStorage.
 * Seules les métadonnées sont ici (id, date, uri) — les octets de l'image
 * vivent sur disque, gérés par `src/lib/photoStorage.ts`.
 */

const PHOTOS_KEY = 'ocho.photos.v1';

export type ProgressPhoto = {
  id: string;
  date: string; // 'YYYY-MM-DD'
  uri: string;
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

export function PhotosProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const persist = (next: ProgressPhoto[]) => {
    setPhotos(next);
    AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(next)).catch(() => {
      // échec d'écriture non bloquant pour le proto
    });
  };

  const addPhoto = (pickedUri: string, date: string = todayISO()) => {
    const uri = saveProgressPhoto(pickedUri);
    persist([...photos, { id: generateId('photo'), date, uri }]);
  };

  const removePhoto = (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (target) deleteProgressPhotoFile(target.uri);
    persist(photos.filter((p) => p.id !== id));
  };

  const sorted = useMemo(
    () => [...photos].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [photos],
  );

  const value = useMemo<PhotosContextValue>(
    () => ({ isLoading, photos: sorted, addPhoto, removePhoto }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sorted, isLoading],
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
