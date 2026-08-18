// Edge Function : estimation IA d'un repas à partir d'une photo ou d'une
// description texte (cahier §3.7). Principe anti-hallucination : Gemini ne
// sert qu'à IDENTIFIER les aliments et ESTIMER la portion — les valeurs
// nutritionnelles viennent d'une vraie base de données quand possible
// (jamais inventées dans ce cas), par ordre de priorité :
//   1. Open Food Facts — produit industriel emballé identifiable
//   2. CIQUAL (ANSES) — aliment générique/fait maison FR (table importée
//      dans `ciqual_foods`, recherchée via la fonction SQL `search_ciqual_food`)
//   3. Repli sur l'estimation de l'IA — confiance réduite, fourchette plus
//      large, jamais présentée comme aussi fiable qu'une donnée de base réelle.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-3.6-flash';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * `fetch` sans timeout peut laisser toute la requête pendre plusieurs
 * dizaines de secondes si Gemini ou Open Food Facts est lent (observé en
 * test : >30s sur un seul aliment) — mauvaise UX sur un scan censé être
 * rapide. `AbortController` coupe après `timeoutMs` plutôt que de compter
 * sur le timeout de plateforme (beaucoup plus long, message moins clair).
 */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type FoodGuess = {
  name: string;
  quantity_g: number;
  is_packaged_product: boolean;
  product_name_guess: string;
  estimated_kcal: number;
  estimated_protein_g: number;
  estimated_carbs_g: number;
  estimated_fat_g: number;
};

type Confidence = 'high' | 'medium' | 'low';

type FoodResult = {
  name: string;
  quantity_g: number;
  quantity_label: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: Confidence;
  range_kcal: [number, number];
  source: 'open_food_facts' | 'ciqual' | 'estimation_ia';
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    foods: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom de l\'aliment en français, ex. « Poulet grillé »' },
          quantity_g: { type: 'number', description: 'Portion estimée en grammes' },
          is_packaged_product: {
            type: 'boolean',
            description: "Vrai si c'est un produit industriel emballé avec une marque visible/identifiable",
          },
          product_name_guess: {
            type: 'string',
            description: "Nom précis du produit + marque si emballé (pour recherche en base), sinon chaîne vide",
          },
          estimated_kcal: {
            type: 'number',
            description: "Calories estimées pour cette portion — sert uniquement de repli si le produit n'est pas trouvé en base",
          },
          estimated_protein_g: { type: 'number' },
          estimated_carbs_g: { type: 'number' },
          estimated_fat_g: { type: 'number' },
        },
        required: [
          'name',
          'quantity_g',
          'is_packaged_product',
          'product_name_guess',
          'estimated_kcal',
          'estimated_protein_g',
          'estimated_carbs_g',
          'estimated_fat_g',
        ],
      },
    },
  },
  required: ['foods'],
};

const PROMPT = `Tu es un expert en nutrition. Identifie chaque aliment distinct sur cette
photo de repas (ou dans cette description), et pour chacun :
- estime la portion en grammes (raisonne sur la taille de l'assiette/des couverts visibles s'il y en a) ;
- indique si c'est un produit industriel emballé avec une marque reconnaissable ;
- si oui, donne le nom précis du produit + marque (pour le retrouver dans une base de données) ;
- donne une estimation de calories/protéines/glucides/lipides pour la portion, qui ne servira
  que de repli si le produit n'est pas trouvé dans la base de données.

Ne regroupe pas plusieurs aliments différents en un seul. Sois précis sur les
portions : une petite assiette de riz cuit ≈ 150 g, une portion de viande ≈
120-180 g, etc.`;

async function callGemini(imageBase64: string | null, description: string | null): Promise<FoodGuess[]> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY manquant côté serveur');

  const parts: Record<string, unknown>[] = [
    { text: description ? `${PROMPT}\n\nDescription fournie par l'utilisateur : ${description}` : PROMPT },
  ];
  if (imageBase64) {
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } });
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
      30_000
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error("L'analyse a pris trop de temps, réessaie.");
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Réponse Gemini vide ou mal formée');

  return JSON.parse(text).foods ?? [];
}

/** Cherche un produit sur Open Food Facts, retourne les valeurs pour 100g si trouvé. */
async function lookupOpenFoodFacts(query: string): Promise<{
  name: string;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
} | null> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=1`;
  const res = await fetchWithTimeout(
    url,
    { headers: { 'User-Agent': 'Ocho - app de suivi nutritionnel personnel' } },
    8_000
  );
  if (!res.ok) return null;

  const data = await res.json();
  const product = data.products?.[0];
  const n = product?.nutriments;
  const kcal = n?.['energy-kcal_100g'];
  if (typeof kcal !== 'number') return null;

  return {
    name: product.product_name || query,
    kcal_100g: kcal,
    protein_100g: n.proteins_100g ?? 0,
    carbs_100g: n.carbohydrates_100g ?? 0,
    fat_100g: n.fat_100g ?? 0,
  };
}

/** Cherche un aliment générique dans CIQUAL (ANSES), retourne les valeurs pour 100g si trouvé. */
async function lookupCiqual(query: string): Promise<{
  name: string;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
} | null> {
  const { data, error } = await supabase.rpc('search_ciqual_food', { query });
  if (error || !data || data.length === 0) return null;

  const match = data[0];
  return {
    name: match.name,
    kcal_100g: match.kcal_100g,
    protein_100g: match.protein_100g,
    carbs_100g: match.carbs_100g,
    fat_100g: match.fat_100g,
  };
}

function withRange(kcal: number, confidence: Confidence): [number, number] {
  const margin = confidence === 'high' ? 0.08 : confidence === 'medium' ? 0.2 : 0.35;
  return [Math.round(kcal * (1 - margin)), Math.round(kcal * (1 + margin))];
}

async function resolveFood(guess: FoodGuess): Promise<FoodResult> {
  const factor = guess.quantity_g / 100;

  if (guess.is_packaged_product && guess.product_name_guess) {
    try {
      const off = await lookupOpenFoodFacts(guess.product_name_guess);
      if (off) {
        const kcal = Math.round(off.kcal_100g * factor);
        return {
          name: off.name,
          quantity_g: guess.quantity_g,
          quantity_label: `${guess.quantity_g} g`,
          kcal,
          protein_g: Math.round(off.protein_100g * factor * 10) / 10,
          carbs_g: Math.round(off.carbs_100g * factor * 10) / 10,
          fat_g: Math.round(off.fat_100g * factor * 10) / 10,
          confidence: 'high',
          range_kcal: withRange(kcal, 'high'),
          source: 'open_food_facts',
        };
      }
    } catch {
      // OFF indisponible → tente CIQUAL, puis repli sur l'estimation IA.
    }
  }

  try {
    const ciqual = await lookupCiqual(guess.name);
    if (ciqual) {
      const kcal = Math.round(ciqual.kcal_100g * factor);
      return {
        name: ciqual.name,
        quantity_g: guess.quantity_g,
        quantity_label: `${guess.quantity_g} g`,
        kcal,
        protein_g: Math.round(ciqual.protein_100g * factor * 10) / 10,
        carbs_g: Math.round(ciqual.carbs_100g * factor * 10) / 10,
        fat_g: Math.round(ciqual.fat_100g * factor * 10) / 10,
        confidence: 'high',
        range_kcal: withRange(kcal, 'high'),
        source: 'ciqual',
      };
    }
  } catch {
    // CIQUAL indisponible → repli sur l'estimation IA ci-dessous.
  }

  return {
    name: guess.name,
    quantity_g: guess.quantity_g,
    quantity_label: `${guess.quantity_g} g`,
    kcal: Math.round(guess.estimated_kcal),
    protein_g: Math.round(guess.estimated_protein_g * 10) / 10,
    carbs_g: Math.round(guess.estimated_carbs_g * 10) / 10,
    fat_g: Math.round(guess.estimated_fat_g * 10) / 10,
    confidence: 'medium',
    range_kcal: withRange(guess.estimated_kcal, 'medium'),
    source: 'estimation_ia',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { image, description } = await req.json();
    if (!image && !description) {
      return new Response(JSON.stringify({ error: 'Fournir "image" (base64) ou "description" (texte)' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const guesses = await callGemini(image ?? null, description ?? null);
    const foods = await Promise.all(guesses.map(resolveFood));

    return new Response(JSON.stringify({ foods }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur inconnue' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
