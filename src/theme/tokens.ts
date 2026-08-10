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
 * Typographie — police sans-serif système (San Francisco / Roboto).
 * Titres et chiffres clés : poids 500. Texte secondaire / labels : poids 400, 11–13px.
 */
export const typography = {
  greeting: { fontSize: 24, fontWeight: '500' },
  screenTitle: { fontSize: 26, fontWeight: '500' },
  ringValue: { fontSize: 46, fontWeight: '500' },
  cardValue: { fontSize: 22, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '500' },
  macroValue: { fontSize: 14, fontWeight: '500' },
  statValue: { fontSize: 20, fontWeight: '500' },
  button: { fontSize: 15, fontWeight: '500' },
  body: { fontSize: 15, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '400' },
  labelSm: { fontSize: 11, fontWeight: '400' },
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
      shadowColor: '#1E2A1A',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle;
}
