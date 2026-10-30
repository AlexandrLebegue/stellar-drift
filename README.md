# STELLAR DRIFT

Jeu spatial type Elite Dangerous, rendu PlayStation 1, Three.js. Web + mobile.

## Lancement

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5180
```

Ouvrir `http://localhost:5180` (desktop) ou l'IP de la machine (mobile, même réseau).

```bash
npm run build    # build de production (doit passer à chaque commit)
npm run preview  # servir le build
```

## Contrôles

### Desktop (clavier/souris)
| Touche | Action |
|---|---|
| W (AZERTY: Z) | tangage haut |
| S | tangage bas |
| A (AZERTY: Q) | lacet gauche |
| D | lacet droit |
| Q (AZERTY: A) | roulis gauche |
| E | roulis droite |
| Shift / Ctrl | poussée + / − |
| C | caméra cockpit / 3e personne |
| Espace / clic (maintenu) | scanner |
| M | carte galactique |
| J | saut hyperspatial |
| K | amarrage (si en approche) |
| Entrée | confirmer / démarrer |
| Échap | pause / retour |

### Mobile (tactile)
- Joystick virtuel (gauche) : tangage / lacet.
- Thrusters (droite) : poussée + / −.
- Boutons : HYPERSPACE, SCAN (maintenu), DOCK (contextuel).

## Structure du code
- `src/core` — boucle, input, état, PRNG, sauvegarde
- `src/render` — pipeline PS1 (basse rés, vertex snap, dither), textures procédurales
- `src/world` — galaxie, systèmes, planètes, stations
- `src/ship` — modèle vaisseau, vol 6DOF, modules
- `src/economy` — marché, marchandises, crédits
- `src/ui` — HUD, titre, carte, menus station
- `src/audio` — musique, bruitages WebAudio
