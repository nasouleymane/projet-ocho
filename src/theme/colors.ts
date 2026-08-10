/**
 * Ocho — jetons de couleur.
 *
 * Palette claire : source unique de vérité `DOCS/design-tokens.md`, ne jamais
 * diverger de ces valeurs sans mettre à jour la doc. La palette sombre n'est
 * spécifiée nulle part dans les docs (mode sombre non maquetté) : c'est une
 * proposition de design qui reprend l'identité « crème chaud + vert olive »
 * en inversant la logique de luminance (fond très sombre teinté olive plutôt
 * que noir/bleu froid, texte fort clair, accent vert éclairci pour rester
 * lisible). `highlight` (lime) est volontairement identique dans les deux
 * palettes : c'est une couleur d'accent ponctuel, pas une couleur de fond.
 */

export type ColorPalette = {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  highlight: string;
  /**
   * Couleur de texte/icône à utiliser SUR un fond `highlight`. Fixe (identique
   * en clair/sombre) car `highlight` lui-même ne change pas de thème — si on
   * utilisait `primary` (qui devient clair en sombre) le contraste casserait
   * sur ce fond qui reste toujours clair.
   */
  onHighlight: string;
  /** Fond pâle teinté accent — icônes rondes neutres (ex. niveau d'activité). */
  accentMuted: string;
  textSecondary: string;
  border: string;
  borderStrong: string;
  tabInactive: string;
};

export const lightColors: ColorPalette = {
  background: '#F6F3EA', // Fond principal (crème chaud)
  surface: '#FFFFFF', // Cartes
  primary: '#1E2A1A', // Vert olive foncé — boutons, textes forts, nav active
  accent: '#3B6D11', // Vert — anneau de progression, succès, graphiques
  highlight: '#C7E86B', // Touche lime — badges, streaks, éléments ponctuels
  onHighlight: '#1E2A1A',
  accentMuted: '#EAF0E0', // Vert pâle — fond d'icône neutre
  textSecondary: '#6B6A5F', // Texte secondaire / labels
  border: '#EDEAE0', // Bordures fines
  borderStrong: '#DEDACB', // Bordures / séparateurs plus marqués
  tabInactive: '#B4B2A9', // Icônes de navigation inactives
};

export const darkColors: ColorPalette = {
  background: '#14160F', // Fond principal (sombre, teinté olive — pas noir/bleu froid)
  surface: '#1F2118', // Cartes (légèrement plus claires que le fond, élévation)
  primary: '#EDEAD9', // Texte fort, nav active (écho clair du crème d'origine)
  accent: '#6FAE3A', // Vert éclairci — reste lisible/vibrant sur fond sombre
  highlight: '#C7E86B', // Identique au clair (accent ponctuel, pas un fond)
  onHighlight: '#1E2A1A', // Identique au clair — highlight reste clair dans les 2 thèmes
  accentMuted: '#233021', // Vert sombre désaturé — même rôle neutre qu'en clair
  textSecondary: '#A6A395', // Texte secondaire / labels
  border: '#2A2C21', // Bordures fines
  borderStrong: '#3D4030', // Bordures / séparateurs plus marqués
  tabInactive: '#6E6C5E', // Icônes de navigation inactives
};

export type MacroKey = 'protein' | 'carbs' | 'fat';
export type MacroPalette = Record<MacroKey, { bg: string; text: string }>;

/** Couleurs des macros : fond clair + texte foncé assorti (cf. design-tokens.md). */
export const lightMacroColors: MacroPalette = {
  protein: { bg: '#FAECE7', text: '#712B13' }, // Protéines
  carbs: { bg: '#FAEEDA', text: '#633806' }, // Glucides
  fat: { bg: '#E6F1FB', text: '#0C447C' }, // Lipides
};

/** Couleurs des macros en sombre : fond foncé (même famille) + texte clair assorti. */
export const darkMacroColors: MacroPalette = {
  protein: { bg: '#3A2018', text: '#F0B49B' },
  carbs: { bg: '#382C10', text: '#E8C67C' },
  fat: { bg: '#142A3D', text: '#8FC1EE' },
};
