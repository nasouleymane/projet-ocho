import { File, Directory, Paths } from 'expo-file-system';

/**
 * Ocho — stockage des photos de progression (cahier §4, V2). Les métadonnées
 * (date, uri) vivent dans `src/store/photos.tsx` (AsyncStorage, léger) ; les
 * octets de l'image eux-mêmes vivent sur disque via `expo-file-system` —
 * AsyncStorage n'est pas fait pour du binaire volumineux (base64 y gonflerait
 * vite la taille et les perfs, contrairement à un simple chemin de fichier).
 */

const PHOTOS_DIR_NAME = 'progress-photos';

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
