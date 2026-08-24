/**
 * Ocho — jetons de couleur.
 *
 * Palette « Graphite & indigo » — remplace l'identité crème + vert olive
 * d'origine (`DOCS/design-tokens.md` est donc obsolète sur ce point) suite
 * au retour direct de l'utilisateur après test sur device réel : les deux
 * palettes précédentes (claire et sombre) étaient désagréables à l'usage.
 * Neutres froids (graphite) + un seul accent, plutôt que le duo accent/
 * highlight de l'ancienne palette — plus proche des standards « dashboard
 * pro » (Linear/Notion) que d'une identité chaleureuse type app grand public.
 *
 * L'accent diverge volontairement entre les deux thèmes : indigo (#818CF8)
 * en sombre, bleu (#2563EB) en clair. Un même indigo saturé sur fond blanc
 * lit visuellement comme du violet (retour utilisateur explicite sur
 * l'anneau de progression) alors que la version éclaircie sur fond sombre
 * lit comme du bleu — c'est un effet de contexte de luminance, pas une
 * incohérence. `highlight`/`onHighlight` (badges type streak) sont dérivés
 * de ce même accent (teinte pâle + texte foncé assorti en clair, inversé en
 * sombre) plutôt que d'une couleur lime indépendante comme avant.
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
  background: '#F7F7F9', // Fond principal (gris très pâle, neutre froid)
  surface: '#FFFFFF', // Cartes
  primary: '#1A1B23', // Graphite quasi-noir — boutons, textes forts, nav active
  accent: '#2563EB', // Bleu — anneau de progression, liens, éléments actifs
  highlight: '#E1EAFC', // Teinte pâle de l'accent — fond des badges (streak, déficit)
  onHighlight: '#1D3E82', // Bleu foncé assorti — texte sur `highlight`
  accentMuted: '#E8EFFC', // Bleu très pâle — fond d'icône neutre
  textSecondary: '#6B6D7A', // Texte secondaire / labels
  border: '#E7E7EC', // Bordures fines
  borderStrong: '#D4D4DC', // Bordures / séparateurs plus marqués
  tabInactive: '#A6A6AF', // Icônes de navigation inactives
};

export const darkColors: ColorPalette = {
  background: '#0F1015', // Fond principal (graphite quasi-noir, neutre froid)
  surface: '#191A21', // Cartes (légèrement plus claires que le fond, élévation)
  primary: '#EEEEF2', // Texte fort, nav active
  accent: '#818CF8', // Indigo éclairci — reste lisible/vibrant sur fond sombre
  highlight: '#262A45', // Teinte foncée de l'accent — fond des badges (streak, déficit)
  onHighlight: '#C7CCFB', // Indigo clair assorti — texte sur `highlight`
  accentMuted: '#22243A', // Indigo sombre désaturé — même rôle neutre qu'en clair
  textSecondary: '#9496A3', // Texte secondaire / labels
  border: '#26272F', // Bordures fines
  borderStrong: '#34353F', // Bordures / séparateurs plus marqués
  tabInactive: '#5C5D68', // Icônes de navigation inactives
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
