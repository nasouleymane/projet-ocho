import { File, Directory, Paths } from 'expo-file-system';
import { supabase } from './supabase';

/**
 * Ocho — stockage des photos de progression (cahier §4, V2). Les métadonnées
 * (date, storage_path) vivent dans `src/store/photos.tsx` (Supabase +
 * AsyncStorage en cache) ; les octets de l'image eux-mêmes vivent sur disque
 * local via `expo-file-system`, et dans le bucket Storage privé
 * `progress-photos` (`{user_id}/{filename}`) pour la synchronisation entre
 * appareils — AsyncStorage n'est pas fait pour du binaire volumineux.
 */

const PHOTOS_DIR_NAME = 'progress-photos';
const BUCKET = 'progress-photos';

function getPhotosDirectory(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Copie une photo depuis son URI temporaire (renvoyée par le picker) vers le
 * stockage permanent de l'app. Retourne l'URI finale à persister dans le
 * store — ne jamais garder l'URI du picker telle quelle, son emplacement
 * (souvent un cache) n'est pas garanti stable dans le temps.
 */
export function saveProgressPhoto(pickedUri: string): string {
  const dir = getPhotosDirectory();
  const extensionMatch = pickedUri.match(/\.(\w+)(\?.*)?$/);
  const extension = extensionMatch ? extensionMatch[1] : 'jpg';
  const filename = `photo_${Date.now()}.${extension}`;
  const source = new File(pickedUri);
  const dest = new File(dir, filename);
  source.copy(dest);
  return dest.uri;
}

/** Supprime le fichier physique d'une photo. Sans effet si déjà absent. */
export function deleteProgressPhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // fichier déjà supprimé ou inaccessible → rien à faire de plus
  }
}

const mimeTypeFor = (filename: string): string => {
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

/**
 * Envoie une photo locale déjà sauvegardée (`saveProgressPhoto`) vers le
 * bucket Storage. `FormData` avec un objet `{ uri, name, type }` est le
 * pattern React Native standard pour `supabase-js` : `fetch`/`FormData` sur
 * RN sait lire le fichier natif directement depuis cette forme, sans passer
 * par une conversion base64 (coûteuse en mémoire pour une image).
 */
export async function uploadProgressPhoto(userId: string, localUri: string, filename: string): Promise<void> {
  const path = `${userId}/${filename}`;
  const formData = new FormData();
  // @ts-expect-error - forme RN spécifique (uri/name/type), pas le DOM File standard
  formData.append('file', { uri: localUri, name: filename, type: mimeTypeFor(filename) });
  const { error } = await supabase.storage.from(BUCKET).upload(path, formData, { upsert: true });
  if (error) throw error;
}

/** Supprime l'objet distant associé à une photo. */
export async function deleteRemoteProgressPhoto(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw error;
}

/**
 * Résout l'URI locale d'une photo à partir de son `storage_path` distant :
 * si le fichier existe déjà sur cet appareil (cas courant, celui qui vient
 * de l'uploader), on le réutilise directement ; sinon (nouvel appareil,
 * réinstallation) on le télécharge une fois depuis Storage — le bucket est
 * privé, donc via une URL signée plutôt qu'une URL publique directe.
 */
export async function resolveLocalPhotoUri(storagePath: string): Promise<string> {
  const filename = storagePath.split('/').pop() ?? storagePath;
  const dir = getPhotosDirectory();
  const local = new File(dir, filename);
  if (local.exists) return local.uri;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60);
  if (error || !data?.signedUrl) throw error ?? new Error('URL signée indisponible.');

  const downloaded = await File.downloadFileAsync(data.signedUrl, local, { idempotent: true });
  return downloaded.uri;
}
