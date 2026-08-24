# Design tokens — Ocho

Référence visuelle unique à utiliser dans tout le code (constantes de thème).

## Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `background` | `#F6F3EA` | Fond principal (crème chaud) |
| `surface` | `#FFFFFF` | Cartes |
| `primary` | `#1E2A1A` | Vert olive foncé — boutons, textes forts, nav active |
| `accent` | `#3B6D11` | Vert — anneau de progression, succès, graphiques |
| `highlight` | `#C7E86B` | Touche lime — badges, streaks, éléments ponctuels |
| `text-secondary` | `#6B6A5F` | Texte secondaire / labels |
| `border` | `#EDEAE0` | Bordures fines |
| `border-strong` | `#DEDACB` | Bordures / séparateurs plus marqués |

### Couleurs macros (fond clair + texte foncé assorti)

| Macro | Fond | Texte |
|---|---|---|
| Protéines | `#FAECE7` | `#712B13` |
| Glucides | `#FAEEDA` | `#633806` |
| Lipides | `#E6F1FB` | `#0C447C` |

## Rayons (border-radius)

| Élément | Valeur |
|---|---|
| Cartes principales | 24px |
| Cartes secondaires / boutons | 14–20px |
| Pilules / badges | 999px (full) |

## Typographie

- Police : Plus Jakarta Sans (Google Fonts, chargée via `expo-font`) —
  remplace la police système d'origine pour un rendu plus « designé ».
- Titres et chiffres clés : graisses bold/extrabold
- Texte secondaire / labels : medium, léger tracking, taille réduite (11–13px)

## Navigation basse

5 icônes : Accueil, Journal (carnet), bouton central "+" (fond `primary`,
icône `background`), Progression (graphique), Profil. Icône active en
`accent`, icônes inactives en `#B4B2A9`.

## Composants clés

- **Anneau de progression** : SVG, fond `border`, tracé `accent`, épaisseur 14px,
  coins arrondis (`stroke-linecap: round`)
- **Timeline narrative** : ligne verticale `border-strong`, points `accent`
  (semaines passées) ou `border-strong` (à venir), carte résumé par semaine
