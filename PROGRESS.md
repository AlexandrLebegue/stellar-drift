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

## Reste
- **EXE Windows** (`EXE-TASK.md`, « après l'APK ») : Electron + electron-builder (portable + NSIS x64) + workflow `windows.yml`.

## Notes / blocages
- Le CLI Capacitor 8 exige **Node ≥ 22** (la machine de dev est en Node 20) : les commandes `npx cap …` se font avec un Node 22 (ex. le tarball `node-v22.23.4-linux-x64.tar.xz` du projet potato-clicker).
