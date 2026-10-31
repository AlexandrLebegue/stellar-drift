# Tâche : échelle réaliste + nouveaux types d étoiles + raretés (étape 12)

Objectif principal : donner une VRAIE impression de grandeur. Aujourd hui le soleil fait 80 u de rayon et les planètes 6-48 u : tout paraît de la même taille.

## 1. Tailles proportionnelles à la réalité
- Rayons des corps dans les vrais rapports. Référence : Terre = 1 (6 371 km). Lune 0,27 ; Mars 0,53 ; Neptune 3,9 ; Jupiter 11,2 ; Soleil 109.
- Choisis une unité de base (ex. Terre ≈ 10-12 u -> Soleil G ≈ 1100-1300 u) ; adapte selon ce qui rend bien et reste jouable, mais GARDE les rapports réels entre étoile et planètes et entre types de planètes (rocheuse / géante gazeuse / glacée…). Recalibre `rMin/rMax` de `planet.ts` en conséquence.
- Distances orbitales : les vraies distances sont injouables (1 UA = 215 rayons solaires). Compresse-les (ex. log/racine) mais elles doivent rester nettement plus grandes que l étoile : depuis une planète intérieure, l étoile doit paraître énorme ; depuis l extérieur, petite. Stations : proches de leur planète/orbite, cohérentes avec la nouvelle échelle.
- Conséquences à gérer : `camera.far` / logarithmicDepthBuffer (pas de z-fighting), skybox (`skybox.ts` radiusScale), vitesse du vaisseau : ajoute un mode **croisière / supercroisière** (vitesse qui augmente avec la distance aux corps, ralentit automatiquement près d une planète ou station) pour que les trajets restent courts (< ~60 s entre deux corps). Collision / zone d exclusion autour des étoiles (chaleur, dégâts coque près d une étoile).
- Arrivée de saut hyperespace : apparaître à distance sûre, avec la vue sur l étoile.
- Garde le look PS1 et les perfs mobiles (pas d explosion du nombre de polygones).

## 2. Nouveaux types d étoiles (galaxy.ts StarType)
Ajoute, avec rayons réels relatifs (Soleil = 1) et couleur crédible :
- **Naine brune** (rayon ≈ 0,1, rouge sombre/magenta, peu lumineuse, planètes très proches)
- **Naine rouge** M (0,1-0,6), K, G, F, A, B (2-7), **O / géante bleue** (rare, 10-15)
- **Géante rouge** (rare, 20-100 : énorme à l écran, planètes intérieures absentes)
- **Naine blanche** (≈ 0,01 : minuscule et très brillante, bleu-blanc)
- Optionnel : **étoile à neutrons / pulsar** (rare, minuscule, faisceaux qui tournent)
- Pondère les fréquences (naines rouges les plus communes, géantes rares). Lumière (intensité/couleur de la PointLight), halo et sprite de l étoile selon le type. Affiche le type en français dans la carte galactique et le HUD.

## 3. Raretés (≈ 2 % des systèmes CHACUNE, déterministe via le seed du système)
- **Trou noir** : remplace l étoile ; disque d accrétion lumineux qui tourne, sphère noire, effet de lentille simple (shader ou sprite déformant) ; attraction gravitationnelle qui tire le vaisseau ; trop près = dégâts/mort.
- **Trou de ver** : anneau/tunnel animé ; y entrer téléporte vers un autre système lointain (déterministe) sans carburant.
- **Traces extraterrestres** : épave de vaisseau abandonné (modèle low-poly non humain, lumières clignotantes) ; scan = lore + récompense (crédits, module ou ressource rare). Récompense une seule fois (persistée dans la sauvegarde).
- Ces systèmes sont signalés « ??? » / icône spéciale sur la carte galactique seulement après visite ou scan longue portée.

## Contraintes
- Ne casse pas les sauvegardes existantes (migration si besoin : repositionner le vaisseau à distance sûre si l ancienne position est dans une étoile).
- `npm run build` doit passer. Teste en vrai (Playwright/screenshot si dispo) qu on voit bien la différence d échelle.
- Met à jour README.md et PROGRESS.md (étape 12), commits par sous-partie (1, 2, 3).
