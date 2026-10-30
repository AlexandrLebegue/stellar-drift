# STELLAR DRIFT — Progress

## Fait
- **Étape 1 — Squelette + PS1 + vol + HUD** :
  - 1a : Vite + TypeScript + Three.js, boucle de jeu, PRNG mulberry32.
  - 1b : pipeline PS1 (RT 240p NearestFilter, vertex snapping via patch du chunk `project_vertex`, dithering Bayer 4x4 + quantification 5 bits/canal, vignette, pipeline couleur brut), starbox nébuleuse procédurale, soleil, planètes placeholder.
  - 1c : vol 6DOF arcade (tangage/lacet/roulis local, poussée + inertie/expo-drag, vitesse max, cam cockpit/chase toggle C), HUD DOM ambre (SPD/THR/FUEL/HULL/CR/cible/réticule/barre scan + scanlines), écran titre + pause, entrée clavier (event.code, QWERTY/AZERTY) + souris.
  - `npm run build` OK à chaque commit.

- **Étape 2 — Univers procédural** : galaxie 120 systèmes (disc, seed déterministe), étoile 6 types (O..M colorées), 2-8 planètes/système (rocheuse, glacée, gazeuse, océan, lave, terrestre) avec composition %/habitabilité/valeur scientifique, anneaux, coquilles d'atmosphère, 1-2 stations low-poly en rotation, orbites inclinées lentes. Système courant rechargé via `loadSystem`.

- **Étape 3 — Contrôles mobiles** : joystick virtuel (gauche, tangage/lacet), boutons THR+ / THR−, SCAN (maintenu), HYPERSPACE, DOCK (contextuel, masqué), CAM. Multi-touch par identifiant, `touch-action:none` + preventDefault, events souris synthétiques ignorés. Note « paysage » sur l'écran titre.

- **Étape 4 — Scanner** : scan maintenu (3 s, décroît si cible perdue), portée 900 u + cône, révèle type/composition/habitabilité/valeur ; record persistant (id planète déterministe seed+index), prix de vente = valeur × (1 + rares/50) × bonus 150 % première découverte, flash HUD, sauvegarde immédiate.

## Reste
- Étape 5 — Amarrage + menu station + marché.
- Étape 6 — Galaxie + carte galactique + saut hyperspatial.
- Étape 7 — 3 vaisseaux + modules + customisation.
- Étape 8 — Audio (musiques + bruitages WebAudio).
- Étape 9 — Sauvegarde complète, polish, perf mobile.

## Notes / blocages
- (aucun)
