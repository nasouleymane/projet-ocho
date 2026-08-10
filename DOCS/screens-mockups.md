# Écrans validés — Ocho

Ces écrans ont été maquettés et validés en amont du développement. Ils servent
de référence exacte pour l'implémentation (voir `design-tokens.md` pour les
valeurs de couleur/rayon/typo utilisées).

## 1. Onboarding — sélection de l'objectif

- Barre de progression en haut (4 étapes, pastilles arrondies)
- Titre + sous-titre explicatif
- 3 cartes sélectionnables : Sèche / Maintien / Prise de masse
  - Icône ronde à gauche (couleur de fond claire)
  - Nom + description courte
  - Carte sélectionnée : bordure 2px `primary` + coche à droite
- Bouton "Continuer" pleine largeur en bas, fond `primary`

## 2. Dashboard (accueil)

- Header : "Salut, [Prénom]" + badge streak (icône flamme + nombre de jours)
- Carte principale blanche :
  - Anneau circulaire centré : calories restantes en grand, label en dessous
  - Sous l'anneau, séparateur puis 3 cercles de macros (protéines/glucides/lipides)
    avec grammes et labels
- Ligne de 2 boutons : "+ Repas" (fond `primary`) et "+ Séance" (fond `surface`,
  bordure fine)
- Carte "Cette semaine" : 3 mini-stats (poids, séances, eau/jour)
- Navigation basse fixe

## 3. Journal alimentaire

- Titre "Aujourd'hui"
- Barre de recherche (icône loupe + placeholder, pas de résultats live en V1)
- Une carte par repas (Petit-déjeuner, Déjeuner, Dîner, Collation) :
  - Nom du repas + total kcal du repas en haut
  - Liste des aliments ajoutés (nom + kcal), séparés par une ligne fine
  - Bouton pointillé "+ Ajouter un aliment" en bas de carte
  - Repas vide : carte à opacité réduite (~0.55), juste le label "Vide"

## 4. Progression

- Titre "Progression"
- Carte graphique : courbe de poids (SVG polyline) + delta depuis le début
  en haut à droite (texte vert)
- Section "Ton parcours" : timeline verticale
  - Point plein `accent` pour les semaines passées, point `border-strong`
    pour le début du programme
  - Ligne verticale reliant les points
  - Carte résumé par semaine : titre ("Semaine N" / "Jour 1") + une ligne
    de synthèse (perte de poids, nb séances, déficit moyen ou ressenti)

## 5. Entraînements — non maquetté (à définir en cours de dev)

Écran simple : liste des séances loguées + formulaire d'ajout
(type de séance, exercices ou cardio, calories estimées). Reprendre le
style carte blanche + labels `text-secondary` des autres écrans.

## 6. Profil / Réglages — non maquetté (à définir en cours de dev)

Liste de réglages classique : objectifs modifiables, mode clair/sombre,
unités. Reprendre le style de carte + navigation basse.
