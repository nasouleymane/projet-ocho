/**
 * Ocho — recherche d'un produit par code-barres exact sur Open Food Facts
 * (cahier §4, V2 : scanner dédié). Contrairement à l'estimation IA (photo),
 * un code-barres est une clé exacte : appel direct depuis l'app, pas besoin
 * de passer par l'Edge Function (Open Food Facts est une API publique sans
 * secret à protéger).
 */

export type BarcodeProduct = {
  name: string;
  brand: string | null;
  /** Grammes suggérés pour une portion, si Open Food Facts en fournit un (ex. "30 g"). */
  servingSizeG: number | null;
  kcal100g: number;
  protein100g: number;
  carbs100g: number;
  fat100g: number;
};

/** Extrait un nombre de grammes depuis un champ `serving_size` texte (ex. "30 g", "1 part (45g)"). */
function parseServingGrams(servingSize: unknown): number | null {
  if (typeof servingSize !== 'string') return null;
  const match = servingSize.match(/(\d+(?:[.,]\d+)?)\s*g/i);
  if (!match) return null;
  const grams = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(grams) && grams > 0 ? grams : null;
}

/**
 * Cherche un produit par code-barres exact. Retourne `null` si le produit
 * n'est pas dans la base Open Food Facts (jamais une valeur inventée).
 */
export async function lookupProductByBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
    headers: { 'User-Agent': 'Ocho - app de suivi nutritionnel personnel' },
  });
  if (!res.ok) throw new Error(`Open Food Facts a répondu ${res.status}`);

  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const product = data.product;
  const n = product.nutriments ?? {};
  const kcal100g = n['energy-kcal_100g'];
  if (typeof kcal100g !== 'number') return null;

  return {
    name: product.product_name || 'Produit sans nom',
    brand: product.brands || null,
    servingSizeG: parseServingGrams(product.serving_size),
    kcal100g,
    protein100g: n.proteins_100g ?? 0,
    carbs100g: n.carbohydrates_100g ?? 0,
    fat100g: n.fat_100g ?? 0,
  };
}
