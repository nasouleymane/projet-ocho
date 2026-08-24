import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * Ocho — rayons, espacements, typographie et ombres.
 * Valeurs dérivées de `DOCS/design-tokens.md`.
 */

/** Rayons (border-radius). */
export const radius = {
  card: 24, // Cartes principales
  card2: 18, // Cartes secondaires (14–20)
  button: 16, // Boutons
  pill: 999, // Pilules / badges (full)
} as const;

/** Échelle d'espacement (multiples de 4). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/**
 * Police — Plus Jakarta Sans (Google Fonts, chargée via `expo-font` dans
 * `app/_layout.tsx`). Remplace la police système par défaut pour un rendu
 * plus « designé » (demande explicite : interface plus moderne, esprit
 * YAZIO). Fichiers statiques par graisse (pas de police variable) : chaque
 * style référence directement la bonne graisse via `fontFamily` — ne jamais
 * ajouter `fontWeight` à côté, RN ne sait pas faire correspondre un poids à
 * un nom de police statique et l'ignore silencieusement (glyphes rendus =
 * ceux du fichier chargé, quoi que dise `fontWeight`). Pour surligner un
 * texte au-dessus d'un style existant (ex. `{ ...typography.body,
 * fontFamily: fontFamily.medium }`), override `fontFamily`, jamais
 * `fontWeight`.
 */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/**
 * Titres et chiffres clés : graisses bold/extrabold (contraste fort, look
 * dashboard). Texte secondaire / labels : medium avec un léger tracking
 * (`letterSpacing`) plutôt que regular — lecture plus « designée » sur du
 * texte court en petite taille (11–13px).
 */
export const typography = {
  greeting: { fontSize: 24, fontFamily: fontFamily.bold },
  screenTitle: { fontSize: 26, fontFamily: fontFamily.bold },
  ringValue: { fontSize: 46, fontFamily: fontFamily.extrabold },
  cardValue: { fontSize: 22, fontFamily: fontFamily.bold },
  sectionTitle: { fontSize: 17, fontFamily: fontFamily.semibold },
  macroValue: { fontSize: 14, fontFamily: fontFamily.semibold },
  statValue: { fontSize: 20, fontFamily: fontFamily.bold },
  button: { fontSize: 15, fontFamily: fontFamily.semibold },
  body: { fontSize: 15, fontFamily: fontFamily.regular },
  label: { fontSize: 12, fontFamily: fontFamily.medium, letterSpacing: 0.2 },
  labelSm: { fontSize: 11, fontFamily: fontFamily.medium, letterSpacing: 0.2 },
} as const satisfies Record<string, TextStyle>;

/**
 * Ombre douce des cartes (style « Apple Health »). Dépend du thème : en
 * sombre, une ombre assombrissante n'a plus de sens sur un fond déjà sombre
 * (l'élévation vient de la différence de luminance surface/background) — on
 * retire l'ombre plutôt que de l'appliquer avec une couleur qui ne rendrait
 * rien de visible.
 */
export function cardShadowFor(scheme: 'light' | 'dark'): ViewStyle {
  if (scheme === 'dark') {
    return Platform.select({ android: { elevation: 0 }, default: {} }) as ViewStyle;
  }
  return Platform.select({
    ios: {
      shadowColor: '#14151A',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle;
}
