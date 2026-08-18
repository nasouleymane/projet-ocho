# Cahier des charges — Ocho

## 1. Contexte

Ocho est une application mobile native de suivi nutritionnel et sportif, développée
en solo comme prototype personnel. Inspirée d'apps comme YAZIO/MyFitnessPal/Alma,
mais avec une identité visuelle propre et un axe différenciant : rendre la
progression **narrative** plutôt que purement chiffrée, et minimiser la friction
de saisie au quotidien.

Origine du projet : suivi d'une période de sèche, d'abord via un Google Sheets
(tableau de suivi quotidien / journal alimentaire / entraînements / progression),
puis transformation en app mobile.

## 2. Objectif de la V1 (MVP)

Un prototype **pour un usage personnel**, fonctionnel et soigné visuellement,
pas encore pensé pour d'autres utilisateurs ni pour la monétisation.

## 3. Fonctionnalités — V1 (MVP)

### 3.1 Onboarding
- Sexe, âge, taille, poids actuel, poids cible, niveau d'activité
- Objectif : Sèche / Maintien / Prise de masse
- Calcul automatique : BMR (formule Mifflin-St Jeor), TDEE, apport calorique
  recommandé, répartition macros (protéines / glucides / lipides)

### 3.2 Dashboard (écran d'accueil)
- Anneau circulaire : calories restantes / consommées / brûlées
- Déficit calorique du jour
- Répartition macros du jour (3 cercles : protéines, glucides, lipides)
- Poids actuel + évolution depuis le début
- Résumé de la semaine (poids, séances, eau)
- Boutons rapides : + Repas / + Séance

### 3.3 Journal alimentaire
- Ajout manuel d'un aliment : nom, quantité, calories, protéines, glucides, lipides
- Regroupement par repas : Petit-déjeuner / Déjeuner / Dîner / Collation
- Aliments favoris (accès rapide)
- Totaux caloriques et macros calculés automatiquement par repas et par jour
- **Assistance IA à la saisie** : résolution automatique des aliments saisis vers
  leurs macros réelles via les bases nutrition (voir §3.7)

### 3.4 Entraînements
- Log manuel d'une séance : type (Musculation / Cardio / HIIT / Football /
  Basketball / Natation / Autre)
- Musculation : exercice, séries, répétitions, charge, temps de repos
- Cardio : type, durée
- Calories estimées brûlées (saisie manuelle ou calcul simple)

### 3.5 Progression
- Graphique évolution du poids
- Graphique calories consommées / déficit calorique
- **Timeline narrative** : résumé de chaque semaine en une ligne
  (ex : "Semaine 2 — -0.6kg · 4 séances · déficit moyen 480 kcal")
- Mensurations optionnelles (tour de taille, bras, poitrine, cuisses, hanches)

### 3.6 Profil / Réglages
- Modification des objectifs (poids cible, objectif, niveau d'activité)
- Mode clair / sombre
- Unités (kg/lb, cm/in)

### 3.7 Estimation IA des repas (pilier V1, feature différenciante)

À partir d'une **photo** du plat ou d'une **saisie manuelle**, une IA identifie
les aliments et estime calories + macros.

- **Modèle** : Google Gemini (API Gemini, clé gratuite sans carte bancaire pour
  démarrer) — vision, sorties structurées JSON. Choisi le 2026-08-10 à la
  place de Claude Opus 4.8 (choix initial) pour éviter la config de paiement
  requise par l'API Anthropic sur un prototype perso.
- **Ancrage nutritionnel** (le levier anti-erreur) : l'IA ne devine pas les
  valeurs — elle interroge **Open Food Facts** (produits emballés) et **CIQUAL**
  (table ANSES, aliments et plats FR génériques), puis calcule
  `portion × valeurs /100 g`. Elle n'invente jamais un chiffre : elle le calcule.
- **Résultat** : liste d'aliments avec portion estimée, kcal,
  protéines/glucides/lipides, **indice de confiance** et **fourchette**
  (ex. « ≈620 kcal · 540–700 »).
- **Validation utilisateur** : l'IA propose le détail, l'utilisateur ajuste les
  portions avant enregistrement (humain dans la boucle = confiance + correction).
- **Sécurité** : la clé API Gemini reste **côté serveur**, jamais dans l'app
  (extractible du bundle sinon). Appel via une **Supabase Edge Function** (Deno)
  qui relaie photo/texte → Gemini → bases nutrition → JSON structuré vers l'app.
- **Limite assumée** : le poids de la portion estimé depuis une photo 2D est
  intrinsèquement approximatif (aucun système ne le donne au gramme près sans
  balance). Objectif = estimation **fiable et traçable**, pas « zéro erreur »,
  toujours corrigeable par l'utilisateur.

## 4. Fonctionnalités — V2 (plus tard)

- Scanner code-barres dédié via caméra (l'ancrage Open Food Facts est déjà en V1
  pour l'estimation IA ; ici il s'agit de la lecture directe d'un code-barres)
- Notifications (hydratation, repas, séance, pesée hebdo, objectif atteint)
- Photos avant/après
- Recettes personnalisées
- Historique de plats fréquents / log vocal

## 5. Design

Voir `design-tokens.md` pour le détail complet (couleurs, rayons, typo) et
`screens-mockups.md` pour la description des écrans validés.

Direction générale : interface simple, professionnelle et dynamique, fond crème
chaud, cartes blanches, vert olive foncé comme couleur dominante, anneaux de
progression circulaires façon "Apple Health", navigation basse avec bouton
central "+" mis en avant.

## 6. Stack technique

| Couche | Choix |
|---|---|
| Frontend mobile | React Native + Expo (SDK 54 — compatible Expo Go) |
| IA — estimation repas | Google Gemini (`gemini-3.6-flash`), appelé **côté serveur** |
| Bases nutrition (V1) | Open Food Facts (produits emballés) + CIQUAL / ANSES (aliments FR) |
| Backend | Supabase Edge Functions (Deno) ; Node.js + Express seulement si une logique custom le justifie |
| Base de données | PostgreSQL via Supabase |
| Authentification | Supabase Auth (email + Google/Apple sign-in) |
| Hébergement | Supabase (DB + auth + Edge Functions) |

## 7. Roadmap

1. Scaffolding du projet (Expo + structure de dossiers + connexion Supabase)
2. Écran Onboarding (saisie profil + calcul BMR/TDEE/macros)
3. Écran Dashboard (anneau calories, macros, résumé semaine)
4. Écran Journal alimentaire + **pipeline IA d'estimation** (Supabase Edge Function
   + Claude Opus 4.8 + Open Food Facts/CIQUAL) : ajout par photo, aide à la saisie,
   favoris, totaux
5. Écran Entraînements (log séances)
6. Écran Progression (graphiques + timeline narrative)
7. Écran Profil / Réglages
8. Tests d'usage personnel sur quelques semaines
9. Itération V2 (scanner code-barres dédié, notifications, etc.)

## 8. Hors périmètre (explicitement exclu de la V1)

- Pas d'intégration liée à After Effects ou FL Studio dans l'app
- Pas de scanner code-barres dédié en V1 (l'ancrage Open Food Facts sert
  l'estimation IA ; la lecture directe d'un code-barres via caméra est V2)
- Pas de fonctionnalités multi-utilisateurs / sociales
- Pas de monétisation prévue à ce stade
