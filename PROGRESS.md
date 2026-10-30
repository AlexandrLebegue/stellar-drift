# STELLAR DRIFT — Progress

## Fait
- **Étape 1 — Squelette + PS1 + vol + HUD** :
  - 1a : Vite + TypeScript + Three.js, boucle de jeu, PRNG mulberry32.
  - 1b : pipeline PS1 (RT 240p NearestFilter, vertex snapping via patch du chunk `project_vertex`, dithering Bayer 4x4 + quantification 5 bits/canal, vignette, pipeline couleur brut), starbox nébuleuse procédurale, soleil, planètes placeholder.
  - 1c : vol 6DOF arcade (tangage/lacet/roulis local, poussée + inertie/expo-drag, vitesse max, cam cockpit/chase toggle C), HUD DOM ambre (SPD/THR/FUEL/HULL/CR/cible/réticule/barre scan + scanlines), écran titre + pause, entrée clavier (event.code, QWERTY/AZERTY) + souris.
  - `npm run build` OK à chaque commit.

## Reste
- Étape 2 — Système procédural (étoile, planètes, station, orbites).
- Étape 3 — Contrôles mobiles (joystick virtuel, thrusters, boutons).
- Étape 4 — Scanner + données de scan.
- Étape 5 — Amarrage + menu station + marché.
- Étape 6 — Galaxie + carte galactique + saut hyperspatial.
- Étape 7 — 3 vaisseaux + modules + customisation.
- Étape 8 — Audio (musiques + bruitages WebAudio).
- Étape 9 — Sauvegarde complète, polish, perf mobile.

## Notes / blocages
- (aucun)
