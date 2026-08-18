import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Ocho — appel à l'Edge Function d'estimation IA des repas (cahier §3.7). */

export type FoodEstimate = {
  name: string;
  quantity_g: number;
  quantity_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: 'high' | 'medium' | 'low';
  range_kcal: [number, number];
  source: 'open_food_facts' | 'ciqual' | 'estimation_ia';
};

type EstimateMealInput = { image: string } | { description: string };

/**
 * Envoie une photo (base64, sans préfixe data URI) ou une description texte
 * à l'Edge Function `estimate-meal`. Lève une erreur explicite si la
 * fonction n'est pas encore déployée ou injoignable, plutôt que de renvoyer
 * un résultat vide silencieux.
 */
export async function estimateMeal(input: EstimateMealInput): Promise<FoodEstimate[]> {
  const { data, error } = await supabase.functions.invoke('estimate-meal', { body: input });

  if (error) {
    let detail = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (body?.error) detail = body.error;
      } catch {
        // corps non-JSON ou illisible → garder le message générique du SDK
      }
    }
    throw new Error(`Estimation indisponible : ${detail}`);
  }
  if (!data?.foods) {
    throw new Error('Réponse inattendue du serveur d\'estimation.');
  }

  return data.foods as FoodEstimate[];
}
