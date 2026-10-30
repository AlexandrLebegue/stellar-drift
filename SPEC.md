# Projet : STELLAR DRIFT — jeu spatial type Elite Dangerous, rendu PS1, Three.js, web + mobile

Tu travailles dans /home/dev/projects/stellar-drift (dépôt git déjà initialisé). Travaille de façon autonome, par étapes, en committant après chaque étape fonctionnelle (messages clairs). Tiens à jour PROGRESS.md (fait / en cours / reste) et README.md (lancement, commandes).

## Stack imposée
- Vite + TypeScript + Three.js (npm). Pas de framework UI lourd : HTML/CSS pour l'interface.
- Serveur de dev : `npm run dev -- --host 0.0.0.0 --port 5180`. `npm run build` doit passer sans erreur à chaque commit.
- Code modulaire : src/core (boucle, input, état, sauvegarde localStorage), src/render (shaders PS1), src/world (galaxie, systèmes, planètes, stations), src/ship, src/economy, src/ui, src/audio.

## Rendu style PlayStation 1 (indispensable)
- Rendu en basse résolution (ex. 320x240 ou hauteur 240 avec ratio écran) dans un WebGLRenderTarget puis upscale en NearestFilter plein écran.
- Vertex snapping (jitter des sommets sur grille écran, dans le vertex shader), textures affine (sans correction de perspective) si possible, filtrage nearest, textures basse définition (64-128 px) générées procéduralement sur canvas, palette réduite + dithering ordonné (Bayer 4x4) en post-process, brouillard, low-poly.

## Univers procédural (seed déterministe)
- Galaxie de ~50-200 systèmes générés depuis une seed (PRNG type mulberry32). Chaque système : étoile (type/couleur), 2-8 planètes, 1-2 stations.
- Planètes procédurales : type (rocheuse, glacée, gazeuse, océan, lave, terrestre), rayon, couleurs, bruit (simplex/fbm) pour texture/relief, anneaux éventuels, orbite qui tourne lentement. Composition (fer, silicates, eau, méthane, métaux rares...) en pourcentages, habitabilité, valeur scientifique.
- Skybox étoilée procédurale.

## Vol et gameplay
- Vol 6DOF simplifié arcade : tangage/lacet/roulis, poussée avant/arrière, vitesse max selon vaisseau, inertie légère. Caméra cockpit ou 3e personne (touche C).
- Supercroisière intra-système facultative ; **saut hyperspatial** entre systèmes : carte galactique pour choisir la destination (portée selon vaisseau, consomme du carburant), séquence animée de tunnel « vitesse lumière » (lignes étirées, FOV, son), puis chargement du nouveau système.
- **Scanner** : viser une planète à portée, maintenir le scan (barre de progression) → révèle composition, type, valeur. Données stockées dans le vaisseau ; vendables en station (prix selon rareté, bonus « premier découvreur »).
- **Stations** : modèle low-poly en rotation avec fente d'entrée. Demande d'amarrage à proximité, atterrissage sur pad (assisté si vitesse faible et bien aligné, sinon dégâts). Une fois amarré : menu station.
- **Menu station** : Marché (achat/revente de 10-15 marchandises, prix différents selon le type de station/système, offre/demande simple), Cartographie (vente des données de scan), Chantier (achat de vaisseaux), Équipement (customisation), Carburant/Réparation.
- **3 vaisseaux achetables** aux stats distinctes (ex. Sparrow : petit, agile, soute 8 ; Mule : cargo, lent, soute 64 ; Falcon : explorateur, grande portée de saut, bon scanner). Modèles low-poly distincts.
- **Customisation** : modules achetables (moteur, réacteur de saut/FSD, soute, scanner, réservoir, coque) qui modifient les stats, + couleur de peinture du vaisseau.
- Sauvegarde/chargement automatique (localStorage) : crédits, vaisseaux possédés, modules, cargaison, données de scan, position.

## Interface (thème spatial)
- HUD rétro-futuriste (orange/ambre ou cyan sur fond sombre, police monospace/pixel, scanlines légères) : vitesse, poussée, carburant, coque, cible, distance, crédits, cible de scan, réticule.
- Écran titre, carte galactique, panneaux station. Lisible sur mobile.

## Mobile (indispensable)
- Détection tactile → contrôles à l'écran : **joystick virtuel** (gauche) pour la direction tangage/lacet ; **thrusters** à droite (glissière ou boutons + / −) pour accélérer/ralentir ; bouton **HYPERSPACE** ; bouton **SCAN** (maintenu) ; bouton **DOCK** contextuel. Multi-touch correct, pas de zoom/scroll de page (touch-action:none, meta viewport), plein écran possible, orientation paysage.
- Clavier/souris sur desktop (WASD/ZQSD + QE roulis, Shift/Ctrl poussée, J saut, Espace/clic scan, M carte).
- Perf : viser 60 fps sur mobile moyen (rendu basse résolution aide).

## Audio
- Télécharge 4-5 musiques d'ambiance science-fiction **libres de droits** (CC0 de préférence, sinon CC-BY avec attribution) depuis OpenGameArt.org ou équivalent, dans public/audio/. Liste chaque piste, auteur, licence et URL source dans CREDITS.md. Lecture en playlist aléatoire avec fondu, démarrage après première interaction utilisateur, réglage volume/mute.
- Bruitages simples générés en WebAudio (moteur, scan, saut, amarrage, UI).

## Ordre de travail conseillé
1. Squelette Vite/TS/Three + pipeline de rendu PS1 + contrôles de vol + HUD. 2. Système procédural (étoile, planètes, station). 3. Contrôles mobiles. 4. Scan + données. 5. Amarrage + menu station + marché. 6. Galaxie + carte + saut hyperspatial. 7. Vaisseaux + customisation. 8. Audio. 9. Sauvegarde, polish, perf mobile.

Ne t'arrête pas à un prototype : avance étape par étape jusqu'au jeu complet. Si une étape bloque, documente-la dans PROGRESS.md et passe à la suivante.
