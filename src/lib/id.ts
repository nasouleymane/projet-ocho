let counter = 0;

/** Identifiant local simple (pas d'UUID lib : usage mono-device, préfixé par type). */
export function generateId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}_${Math.random().toString(36).slice(2, 8)}`;
}
