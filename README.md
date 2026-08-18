# Ocho 🥑

Application mobile de suivi nutritionnel et sportif (React Native + Expo).
Prototype personnel — voir le [cahier des charges](DOCS/cahier-des-charges.md).

## Démarrer

```bash
npm install
npx expo start        # puis i (iOS), a (Android) ou w (web)
npm run web           # directement le web
```

## Structure

```
DOCS/                     Cahier des charges, design tokens, maquettes (référence)
src/
├── app/                  Routes (expo-router, file-based)
│   ├── _layout.tsx       Stack racine (Providers + SafeArea + StatusBar)
│   ├── onboarding.tsx    Onboarding 4 étapes + calcul BMR/TDEE/macros ✅
│   ├── add-food.tsx      Modal : ajout manuel d'un aliment (+ favoris) ✅
│   ├── add-workout.tsx   Modal : ajout d'une séance (+ exercices) ✅
│   ├── workouts.tsx      Liste des séances loguées ✅
│   ├── add-weight.tsx    Modal : nouvelle pesée ✅
│   └── (tabs)/           Écrans à onglets
│       ├── _layout.tsx   Gate profil + <Slot /> + barre de navigation custom
│       ├── index.tsx     Dashboard (accueil) ✅
│       ├── journal.tsx   Journal alimentaire ✅
│       ├── progression.tsx  Progression (courbe + timeline) ✅
│       └── profil.tsx    Profil / réglages (objectifs, thème, unités) ✅
├── components/           Briques UI réutilisables
│   ├── Card, ProgressRing, MacroCircle, StreakBadge, MealCard,
│   ├── QuickButton, WeekStat, PlaceholderScreen, NumberField,
│   ├── SegmentedControl, SelectableCard, CtaButton, OnboardingProgress,
│   ├── WeightChart        Courbe de poids (SVG polyline)
│   ├── TextField          Champ texte boîté, zone tactile 52px (ex. Nom/Quantité)
│   ├── StatChip           Pastille icône + valeur (timeline Progression)
│   └── BottomTabBar      Navigation basse (5 slots, « + » central surélevé)
├── store/                État partagé, persisté via AsyncStorage
│   ├── profile.tsx       Profil utilisateur + plan (BMR/TDEE/macros)
│   ├── journal.tsx       Entrées du journal + favoris
│   ├── workouts.tsx      Séances d'entraînement loguées
│   ├── weight.tsx        Pesées (mini suivi de poids)
│   └── settings.tsx      Préférences (thème, unités)
├── lib/
│   ├── nutrition.ts      Calculs Mifflin-St Jeor (BMR/TDEE/macros)
│   ├── workout.ts        Types de séance + estimation calorique (MET)
│   ├── progression.ts    Résumés hebdomadaires (timeline narrative)
│   ├── profileOptions.ts Options partagées onboarding/Profil (sexe, activité, objectif)
│   ├── units.ts          Conversions kg↔lb, cm↔in (stockage toujours métrique)
│   ├── date.ts           MealType, dates (ajout/écart de jours), repas suggéré selon l'heure
│   └── id.ts             Générateur d'ID local (mono-device)
├── theme/                Design system — source unique de vérité
│   ├── colors.ts         Palettes clair/sombre (`lightColors`/`darkColors`) + couleurs macros
│   ├── tokens.ts         Rayons, espacements, typographie, `cardShadowFor(scheme)`
│   └── ThemeContext.tsx  `ThemeProvider`/`useTheme()` — résout thème système ou choisi
└── data/
    └── dashboard.ts      Valeurs mock restantes (eau/jour — pas de suivi dédié)
```

## Design system

Tous les jetons visuels (couleurs, rayons, typographie) sont dérivés de
[`DOCS/design-tokens.md`](DOCS/design-tokens.md) et centralisés dans `src/theme/`.
**Ne pas coder de valeur en dur** : importer depuis `@/theme`.

## Notes d'implémentation

- **Expo SDK 54** (RN 0.81.5) — c'est le SDK supporté par l'app **Expo Go**
  publique (cf. `expoGoSdkVersion` de l'API Expo). Ne pas passer au-dessus tant
  qu'Expo Go n'a pas suivi, sinon l'app ne se charge pas dans Expo Go
  (« Project is incompatible with this version of Expo Go »).
- **Navigation basse custom** : pour obtenir le bouton central « + » surélevé et
  les couleurs exactes du design (actif `accent`, inactif `#B4B2A9`), on n'utilise
  pas les barres d'onglets fournies par expo-router — on rend un `<Slot />`
  surmonté d'un composant `BottomTabBar` maison (`usePathname` + `router`).
  `react-native-reanimated` / `gesture-handler` retirés (peers optionnels non
  utilisés).
- **Mode sombre** (cahier §3.6) : `StyleSheet.create()` fige ses valeurs à la
  définition du module, donc un vrai dark mode réactif exige que chaque écran
  calcule ses styles depuis le thème courant plutôt que de les figer une fois
  pour toutes. Pattern appliqué partout : `const getStyles = (colors: ColorPalette) => StyleSheet.create({...})`
  définie au niveau module, puis `const { colors } = useTheme(); const styles = getStyles(colors);`
  appelé à l'intérieur de chaque composant (y compris les sous-composants
  déclarés dans le même fichier — chacun refait son propre `useTheme()`).
  `useTheme()` (dans `src/theme/ThemeContext.tsx`) résout `themeMode`
  (`light`/`dark`/`system`, réglable dans Profil) contre `useColorScheme()`
  quand `system` est choisi. La palette sombre est une proposition de design
  (non maquettée dans `DOCS/`) qui reprend l'identité crème + vert olive en
  inversant la luminance — voir les commentaires en tête de `src/theme/colors.ts`.
  Deux pièges résolus : `highlight` (lime) reste volontairement identique dans
  les deux palettes (couleur d'accent ponctuel, pas un fond), donc le texte
  posé dessus utilise un champ dédié `onHighlight` **fixe** plutôt que `primary`
  (qui, lui, s'inverse en sombre et casserait le contraste) ; et l'ombre portée
  des cartes (`cardShadow`) n'a de sens qu'en clair — `cardShadowFor(scheme)`
  renvoie une ombre nulle en sombre, l'élévation venant du contraste
  surface/fond à la place.
- **Unités (kg/lb, cm/in)**, réglables dans Profil : le stockage reste
  **toujours** métrique (`weightKg`, `heightCm`) ; `src/lib/units.ts` ne
  convertit qu'aux limites d'affichage/saisie (`fromCanonicalWeight`/
  `toCanonicalWeight` et équivalents taille), jamais dans les stores.
- « + Repas » et le « + » central ouvrent `/add-food` ; « + Séance » ouvre
  `/add-workout` (tous deux en modal). Pas de tab dédié « Entraînements »
  (absent du nav design) : la liste (`/workouts`) est accessible via la stat
  « Séances » de la carte « Cette semaine » du Dashboard.
- **Journal / Entraînements** : entrées stockées à plat (une par aliment ou
  séance, avec `date`) plutôt qu'imbriquées — plus simple à agréger (totaux
  jour, futurs totaux semaine pour Progression). Le Dashboard lit les totaux
  du jour en temps réel (`useJournal().dayTotals()`, `useWorkouts().dayKcal()`).
- **Calories brûlées** : estimation simple (MET × poids × durée), auto-calculée
  à chaque changement de type/durée mais overridable — un flag interne
  (`kcalEditedByUser`) arrête le recalcul dès que l'utilisateur modifie le
  champ calories à la main, pour ne jamais écraser une saisie manuelle.
- **Mini suivi de poids** : chaque pesée (`/add-weight`, tap sur la stat
  « Poids » du Dashboard) met aussi à jour `profile.weightKg` → BMR/TDEE/macros
  se recalculent en cascade sur la donnée la plus récente (comportement
  standard des apps de suivi nutritionnel). « Depuis le début » = delta entre
  la 1ère et la dernière pesée ; masqué tant qu'il n'y a qu'une seule pesée
  (pas de delta fabriqué). La 1ère pesée est auto-seedée à la fin de
  l'onboarding avec le poids saisi, pour que le delta soit exploitable dès le
  départ. `NumberField` supporte désormais un prop `decimals` (défaut 0) pour
  ce champ à dixième de kg — tous les usages existants (entiers) sont inchangés.
- **Pipeline IA (photo → estimation)** — cahier §3.7, **déployé et
  fonctionnel, ancrage complet (Open Food Facts + CIQUAL)**.
  `supabase/functions/estimate-meal` (Edge Function Deno) : Gemini identifie
  les aliments et estime la portion depuis une photo ou une description ;
  résolution en cascade sur 3 paliers, jamais de valeur inventée quand une
  vraie donnée existe :
  1. **Open Food Facts** (API temps réel) pour les produits de marque identifiables.
  2. **CIQUAL** (ANSES, `supabase/migrations/*_ciqual_foods.sql` — 3323
     aliments génériques FR importés depuis la table officielle 2025) pour
     le reste — recherche via `search_ciqual_food()` : full-text français
     (mots-clés stricts, stemming) en priorité, repli trigram si aucun
     mot-clé ne matche. Le trigram seul a été essayé en premier et écarté :
     il classe par proximité de caractères, pas par sens (`"riz blanc cuit"`
     matchait `"Riz blanc, cru"` à 350 kcal/100g au lieu de `"Riz blanc,
     cuit"` à 155 kcal/100g, pourtant présent en base).
  3. **Estimation de l'IA** en dernier repli, confiance réduite et
     fourchette plus large — jamais présentée comme aussi fiable qu'une
     donnée de base réelle.

  Côté app : bouton scan dans `add-food.tsx` (`expo-image-picker`), écran de
  résultats éditables (`FoodEstimateCard`, badge de source par palier) avant
  ajout au journal.
- **Progression** : la timeline ne résume que les semaines **pleinement
  écoulées** depuis la 1ère pesée (le Dashboard couvre déjà « aujourd'hui » /
  « cette semaine » en cours). La 1ère pesée est LA référence « Jour 1» —
  volontairement exclue du calcul de la semaine 1 (sinon delta 0,0 kg trompeur
  si aucune autre pesée n'a eu lieu cette semaine-là ; voir
  `lib/progression.ts`). Le déficit moyen d'une semaine n'est calculé que sur
  les jours réellement loggés (jamais fabriqué pour un jour sans journal).
  Le déficit utilise le `calorieTarget` **actuel** du profil comme référence
  pour tous les jours passés (pas d'historique de cible par jour — simplification
  assumée, cohérente avec le reste de l'app).
- **Formatage décimal** : toujours utiliser `toFixed(1)` (jamais `toString()`)
  pour afficher un poids — un `n.toString()` expose parfois l'imprécision
  binaire des flottants JS (ex. `78 - 75.2` → `2.799999999999997`).
- **`NumberField` — largeur fixe sur `unit`** : le texte d'unité ("kcal" vs "g"
  vs "" vs "sec") doit avoir une largeur fixe (`width: 34`), sinon le bloc
  steppers+valeur change de largeur totale d'une ligne à l'autre dans une même
  card (ex. Calories/Protéines/Glucides/Lipides), ce qui décale visuellement
  le bouton "−" entre les lignes (le "+" reste toujours à droite, seul "−" et
  la valeur "sautent"). Bug réel remonté par un test sur device réel — jamais
  visible sur le web où les captures n'avaient par coïncidence que des unités
  de même longueur côte à côte.
- **`TextField`** : les champs texte libres (nom d'aliment, quantité, nom
  d'exercice) sont volontairement **hors** de la `Card` qui contient les
  `NumberField` — chacun a son propre encadré (fond `surface`, bordure,
  hauteur 52px). Les regrouper dans la même card avec de simples séparateurs
  donnait des champs trop discrets/petits (zone tactile ~31px, sous le minimum
  iOS de 44pt).

## Roadmap (cf. cahier des charges)

Onboarding ✅ → Dashboard ✅ → Journal ✅ → Entraînements ✅ → Progression ✅ → Profil ✅ → **Estimation IA ✅**.

V1 MVP complet, y compris le pilier IA (§3.7) avec ancrage nutritionnel
complet — Open Food Facts (produits de marque) + CIQUAL (aliments FR
génériques) — cf. « Notes d'implémentation » ci-dessus. Rien de bloquant
restant au cahier des charges.
