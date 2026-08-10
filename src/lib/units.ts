import { UnitSystem } from '@/store/settings';

/**
 * Ocho — conversions d'unités (cahier §3.6 : kg/lb, cm/in).
 * Le stockage interne reste TOUJOURS en métrique (kg, cm) — ces helpers ne
 * servent qu'à convertir pour l'affichage et la saisie quand l'utilisateur a
 * choisi le système impérial.
 */

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inch: number): number {
  return inch * CM_PER_IN;
}

export function weightUnitLabel(units: UnitSystem): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

export function heightUnitLabel(units: UnitSystem): string {
  return units === 'imperial' ? 'in' : 'cm';
}

/** Poids canonique (kg) → valeur à afficher dans l'unité courante. */
export function fromCanonicalWeight(kg: number, units: UnitSystem): number {
  return units === 'imperial' ? kgToLb(kg) : kg;
}

/** Valeur saisie dans l'unité courante → poids canonique (kg) à stocker. */
export function toCanonicalWeight(displayValue: number, units: UnitSystem): number {
  return units === 'imperial' ? lbToKg(displayValue) : displayValue;
}

/** Taille canonique (cm) → valeur à afficher dans l'unité courante. */
export function fromCanonicalHeight(cm: number, units: UnitSystem): number {
  return units === 'imperial' ? cmToIn(cm) : cm;
}

/** Valeur saisie dans l'unité courante → taille canonique (cm) à stocker. */
export function toCanonicalHeight(displayValue: number, units: UnitSystem): number {
  return units === 'imperial' ? inToCm(displayValue) : displayValue;
}
