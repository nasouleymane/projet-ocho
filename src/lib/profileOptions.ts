import { Ionicons } from '@expo/vector-icons';
import { MacroPalette } from '@/theme';
import { ActivityLevel, Goal, Sex } from '@/lib/nutrition';

/** Ocho — options de profil partagées entre l'onboarding et l'écran Profil. */

export const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: 'Homme', value: 'homme' },
  { label: 'Femme', value: 'femme' },
];

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}[] = [
  { value: 'sedentaire', icon: 'bed-outline', title: 'Sédentaire', subtitle: "Peu ou pas d'exercice" },
  { value: 'leger', icon: 'walk-outline', title: 'Léger', subtitle: 'Sport 1–3 j/semaine' },
  { value: 'modere', icon: 'bicycle-outline', title: 'Modéré', subtitle: 'Sport 3–5 j/semaine' },
  { value: 'actif', icon: 'barbell-outline', title: 'Actif', subtitle: 'Sport 6–7 j/semaine' },
  { value: 'tres_actif', icon: 'flame-outline', title: 'Très actif', subtitle: 'Sport intense / 2×/jour' },
];

/** Couleurs des icônes dérivées du thème courant → fonction plutôt que constante. */
export const buildGoalOptions = (
  macroColors: MacroPalette
): {
  value: Goal;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}[] => [
  {
    value: 'seche',
    icon: 'trending-down',
    iconBg: macroColors.protein.bg,
    iconColor: macroColors.protein.text,
    title: 'Sèche',
    subtitle: 'Perdre du gras, garder le muscle',
  },
  {
    value: 'maintien',
    icon: 'swap-horizontal',
    iconBg: macroColors.carbs.bg,
    iconColor: macroColors.carbs.text,
    title: 'Maintien',
    subtitle: 'Stabiliser ton poids',
  },
  {
    value: 'prise',
    icon: 'trending-up',
    iconBg: macroColors.fat.bg,
    iconColor: macroColors.fat.text,
    title: 'Prise de masse',
    subtitle: 'Gagner du muscle',
  },
];
