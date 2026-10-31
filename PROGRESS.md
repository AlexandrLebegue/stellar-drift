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

- **Étape 5 — Amarrage + menu station** : détection station (< 260 u du pad), amarrage assisté (vitesse < 10 + alignement) sinon coque −15 + rebond ; phases « docking » (lerp vers le pad) → « docked » (menu plein écran, caméra orbitale). Menu : MARCHÉ (12 marchandises, prix par type de station + dérive offre/demande), CARTOGRAPHIE (vente des scans), CARBURANT/RÉPARATION, CHANTIER/ÉQUIPEMENT. Undoock = K / UNDOCK.

- **Étape 6 — Galaxie + saut hyperspatial** : carte galactique plein écran (canvas, 120 systèmes, anneau de portée, sélection tap/clic, info distance/coût), bouton HYPERSPACE + M pour ouvrir, coût carburant = 3 + 0,15×dist % (max 30 %), tunnel de saut 2,8 s (140 lignes additives étirées avec la vitesse, FOV 62→100→62) rendu dans le pipeline PS1, chargement du système destination (id + seed déterministes), flash d'arrivée.

- **Étape 7 — 3 vaisseaux + modules + customisation** :
  - `shipdefs.ts` : 4 classes (prototype gratuit, Sparrow 25 000, Mule 45 000, Falcon 80 000) avec stats propres (vitesse/poussée/turn/soute/saut/scan/capacité carburant/coque) ; 6 modules (moteur, FSD, soute, scanner, réservoir, coque) 3 niveaux chacun, coût = base×(niv+1) ; 6 peintures.
  - `models.ts` : 3 coques low-poly distinctes (chasseur effilé, cargo trapu, explorateur à volets balayés) + prototype, matériau de coque exposé (`userData.hullMat`) pour la peinture, glow moteur, vertex-snapping.
  - `Ship` : `setShip(cls)` (reconstruit le modèle), `setPaint`, `recompute(mods)` (stats effectives = classe + modules), carburant/coque en unités absolues (0..capacité) ; scanner reparamétré selon vaisseau/modules.
  - Menu station : onglets CHANTIER (acheter/reprendre un vaisseau, stats affichées) et ÉQUIPEMENT (6 modules avec pips de niveau + bouton d'achat, pastilles de peinture). Sauvegarde des vaisseaux possédés / vaisseau courant / modules / peinture / carburant / coque.

- **Étape 8 — Audio** : 5 pistes d'ambiance OpenGameArt (2 CC0, 3 CC-BY 3.0, crédits dans CREDITS.md) ré-encodées en MP3 96 kbps mono dans `public/audio/` (~11 Mo), playlist aléatoire avec fondu 2 s via deux HTMLAudioElement mixés en WebAudio, démarrage après première interaction, bouton SON ON/OFF persisté. Bruitages 100 % synthétisés WebAudio (`src/audio/sfx.ts`) : ronronnement moteur lié à la poussée, blips de scan + chime de fin, whoosh de saut, thump/crash d'amarrage, clics UI.

- **Étape 9 — Sauvegarde, polish, perf mobile** :
  - Sauvegarde complète (localStorage) : crédits, vaisseaux possédés, vaisseau courant, modules, peinture, cargaison, scans, carburant/coque (unités absolues), position + orientation, système courant. Au démarrage : chargement du système sauvegardé + restauration de la position (avec garde-fou). Auto-save périodique (10 s) + sur chaque événement (scan, amarrage, achats, saut, départs) + beforeunload.
  - « NOUVEAU JEU » sur l'écran pause : efface la sauvegarde et rechargé.
  - Avertissements HUD au franchissement des seuils : carburant < 10 %, coque < 20 %.
  - Perf mobile : résolution basse adaptative (240 → 200 → 160 px de haut, retour auto si > 57 fps, hystérésis 45 fps, 5 s de chauffe), moyenne fps glissante 2 s.
  - Corrections : bouton SON cliquable au-dessus de la couche tactile (z-index), viewport mobile déjà verrouillé.

- **Étape 10 — APK Android (Capacitor 8) + CI** (`APK-TASK.md`) :
  - `capacitor.config.ts` : appId `com.alexandrelebegue.stellardrift`, appName « Stellar Drift », webDir `dist`, `android.zoomEnabled: false`. Vite en `base: './'` (chemins relatifs, requis pour `file://`) ; chemins audio passés en relatifs (`audio/…`) — seul changement hors packaging, `npm run build` OK, `dist/` contient bien les 5 MP3.
  - `npx cap add android` (CLI Capacitor 8 exige Node ≥ 22) : manifeste en **paysage** (`sensorLandscape`), **plein écran immersif** (thème `windowFullscreen` + `WindowInsetsControllerCompat` dans `MainActivity`, réappliqué au focus), pas de zoom. Icônes launcher (carré/rond), adaptive foreground et splash **générés procéduralement** (`scripts/gen-icons.mjs`, encodeur PNG maison).
  - Signature fixe (modèle potato-clicker) : env `STELLAR_KEYSTORE_B64` / `_STORE_PASSWORD` / `_KEY_PASSWORD` / `_ALIAS`, keystore dans `android/keystore/` (gitignoré), `versionCode`/`versionName` depuis `STELLAR_VERSION_CODE` / `STELLAR_VERSION_NAME` (défaut local 2000000 / 0.1.0-dev).
  - `.github/workflows/android.yml` : push main + tag `v*` + manuel ; Node 22 + Java 21 Temurin ; `npm ci` → `npm run build` → `npx cap sync android` → `./gradlew assembleDebug` ; artefact `stellar-drift-debug.apk` ; release GitHub (`.apk`) sur tag `v*`.
  - Build Gradle **non vérifié en local** (pas d'Android SDK sur cette machine) : première validation en CI.

- **Étape 11 — EXE Windows (Electron)** (`EXE-TASK.md`) :
  - `electron` + `electron-builder` en devDeps ; `electron/main.cjs` : fenêtre 1280×720 redimensionnable, sans barre de menu (`Menu.setApplicationMenu(null)`), F11 plein écran via `before-input-event` (preventDefault, ne perturbe pas les contrôles du jeu), charge `dist/index.html` (chemins relatifs du build `base: './'`) ; musique + sauvegarde hors ligne OK.
  - Config `electron-builder` dans `package.json` : appId `com.alexandrelebegue.stellardrift`, productName « Stellar Drift », `files` restreint à `dist/` + `electron/` (+ `package.json`) pour un asar propre sans node_modules ; cibles **portable** + **nsis** x64, `artifactName` propres (`stellar-drift-<v>-portable.exe` / `-setup.exe`), NSIS per-user avec choix du répertoire. Script `npm run dist:win`.
  - `.github/workflows/windows.yml` : push main + tag `v*` + manuel ; windows-latest + Node 22 ; `npm ci` → `npm run build` → `npx electron-builder --win --publish never` (`CSC_IDENTITY_AUTO_DISCOVERY=false`, pas de signature) ; artefact `stellar-drift-windows` ; sur tag `v*` upload des `.exe` dans la release GitHub (créée si absente — évite le conflit avec le workflow Android sur le même tag).
  - Vérifié en local (Linux) : schema electron-builder OK, cible **portable** buildée de bout en bout (`stellar-drift-0.1.0-portable.exe`, PE32 valide) ; la cible NSIS échoue **localement** uniquement faute de `wine` (rcedit) — sans objet sur `windows-latest` où rcedit tourne nativement.

- **Étape 12 — Échelle réaliste + nouveaux types d'étoiles + raretés** (`SCALE-TASK.md`) :
  - **12a — Échelle réaliste** : 1 u ≈ 637 km → Terre = 10 u, Soleil G = 1 090 u (`SUN_RADIUS`). `planet.ts` recalibré (rocheuse 3-8, glacée 8-32, gazeuse 95-130, océan 9-14, lave 4-7, terrestre 9-12). Orbites compressées : intérieure ≈ 3,2×R★ (l'étoile paraît énorme), chaque orbite ×(1+0,55i)^1,6 (10-50×R★ à l'extérieur, l'étoile paraît minuscule), `ORBIT_CAP` 1,5 Mu ; géantes rouges sans planètes intérieures (`skip`), WD/pulsar `minInner` 800 u. Stations liées à une orbite planétaire (échelle ×3). Caméra far 4 Mu + `logarithmicDepthBuffer` (paramètre du `WebGLRenderer`, pas de la caméra) → pas de z-fighting ; skybox 300 ku ; brouillard par système (fogNear ≈ 1,05R★, fogFar ≈ 2,2× l'orbite la plus externe + 20 ku). **Mode croisière/supercroisière (F / bouton tactile)** : vMax ×(1+64s) et poussée ×(1+128s) où s = clearance 0..1 entre 1 200 et 4 000 u, drag exponentiel qui auto-freine près des corps. Arrivée de saut = apparition à 8×R★ (min 1 200 u) face à l'étoile. Zone d'exclusion stellaire : dégâts coque < 1,25R★, mort à l'intérieur (−15 % CR, récupération). Migration des sauvegardes : position sauvegardée dans l'étoile / trop loin → repositionnée à distance sûre.
  - **12b — 11 types d'étoiles** (`galaxy.ts` STAR_TABLE) : naine brune, M/K/G/F/A/B, géante bleue O, géante rouge (25-80×R☉, énorme à l'écran), naine blanche (~10 u), pulsar (~3 u, faisceaux balayants dans le plan orbital) — rayons relatifs réels (Soleil = 1), couleurs, intensité/lumière et halo par type, pondération démographique (M 40, K 22, G 14, F 8, A 6, B 3, BD 3, RG 2, PS 1,2, WD 1, O 0,8) ; passe de garantie : au moins 1 de chaque type rare dans la galaxie de 120. Labels français dans la carte (pastilles colorées par type) et le HUD (« ÉTOILE Naine rouge »…).
  - **12c — Raretés** (~2 % des systèmes CHACUNE, tirées sur un RNG `seed ^ 0xa11ce5` indépendant du flux principal de la galaxie + passe de garantie 1 de chaque) :
    - **Trou noir** (remplace l'étoile) : sphère noire (horizon 100 u), double disque d'accrétion additives contre-rotatifs + anneau photonique + halo + lumière orange ; puits de gravité 20 ku (traction ∝ d^-1,5 plafonnée à 4 000 u/s² — fuitable en pleine poussée), dégâts de marée < 400 u, mort dans l'horizon (« ASPIRÉ PAR LE TROU NOIR », −15 % CR) ; HUD « TROU NOIR ».
    - **Trou de ver** : portail animé (vortex canvas + 2 anneaux contre-rotatifs + halo) placé au-delà de l'orbite la plus externe ; y entrer (160 u) = saut **sans carburant** vers un système lointain déterministe (≥ 12 KLY, choisi dans le plus-lointain) — tunnel 2,8 s, arrivée à 8×R★.
    - **Épave extraterrestre** : vaisseau déraisonnable non-humanoïde (fragments asymétriques + proue sectionnée + lumières clignotantes ambre/rouge) dérivant parmi les orbites intérieures ; scanner = lore (« le navire qui ne reviendra pas ») + **+5 000 CR une seule fois** (persisté dans `loot`), « ÉPAVE VIDE » au re-scan ; cible HUD « ÉPAVE EXTRATERRESTRE ».
    - **Carte galactique** : marqueur « ??? » (carré + libellé) sur les systèmes à rareté **connus** — après visite (`visited`) ou scan longue portée (bouton « SCAN LOINTAIN », 1,5 s, portée 10 KLY, persisté dans `sensed`).
    - Sauvegarde : nouveaux tableaux `visited`/`sensed`/`loot` (défaut `[]` à la migration, les vieilles sauvegardes chargent sans casse).
  - **Vérification** : build OK ; Playwright headless (SwiftShader) — trou noir (gravité, avertissement marée, mort, respawn, −15 %), trou de ver (saut sans carburant vers le bon système, arrivée 8×R★), épave (scan +5 000 CR, loot persisté, pas de double butin), carte (marqueurs ??? après visite, scan lointain détecte et persiste, pas de marqueur sur système normal). Galaxie 120 systèmes : 1 trou noir (sys53), 4 trous de ver (25,9-68,9 KLY), 1 épave (sys6), déterministe par seed (vérifié sur plusieurs seeds).
  - Fix au passage : `heatWarned` déclaré avant `loadSystem` (TDZ) ; hook de test `?dbg=1` (expose `__dbg` : game/galaxy/ship/system) pour les vérifications automatisées.

## Reste
- (les 12 étapes sont terminées ; APK et EXE attendent la CI de ProxBoss)

## Notes / blocages
- Le CLI Capacitor 8 exige **Node ≥ 22** (la machine de dev est en Node 20) : les commandes `npx cap …` se font avec un Node 22 (ex. le tarball `node-v22.23.4-linux-x64.tar.xz` du projet potato-clicker).
- Cross-build NSIS depuis Linux nécessite `wine` (absent ici, pas de root) : validation NSIS première CI `windows-latest`.
- **Captures d'écran headless = noires** : le headless shell de Chromium ne capture pas la surface WebGL dans `page.screenshot()` (le framebuffer est vérifié par `readPixels` en fin de frame : le jeu rend bien — étoile 30→99 % de la zone centrale à l'approche). La vérification visuelle « en vrai » se fait dans un navigateur normal.
- three r160 : `logarithmicDepthBuffer` est un **paramètre du constructeur `WebGLRenderer`** (pas une propriété caméra) ; l'erreur « Canvas has an existing context of a different type » est trompeuse (elle part quand le contexte webgl échoue et que 2d existe).
