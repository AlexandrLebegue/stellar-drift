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
| F | supercroisière (vitesse ×65, auto-freinée près des corps) |
| J | saut hyperspatial |
| K | amarrage (si en approche) |
| Entrée | confirmer / démarrer |
| Échap | pause / retour |

### Mobile (tactile)
- Joystick virtuel (gauche) : tangage / lacet.
- Thrusters (droite) : poussée + / −.
- Boutons : HYPERSPACE, SCAN (maintenu), SUPER-CRUISE, DOCK (contextuel).

## Sauvegarde

- Auto-save dans `localStorage` : toutes les 10 s en jeu, et à chaque scan,
  amarrage, achat, saut, ou fermeture de l'onglet.
- Sauvegardé : crédits, vaisseaux possédés / courant, modules, peinture,
  cargaison, données de scan, carburant/coque, position, système courant.
- « NOUVEAU JEU » (écran pause) : efface la sauvegarde et relance le jeu.

## Audio

Musique d'ambiance (5 pistes libres de droits, lecture en playlist aléatoire
avec fondu, bouton SON: ON/OFF en bas à droite, réglage mémorisé) + bruitages
procéduraux WebAudio (moteur, scan, saut, amarrage, interface). La musique
démare après la première interaction (politique autoplay des navigateurs).
Crédits et licences : `CREDITS.md`.

## Univers (échelle réaliste)

- **Échelle** : 1 u ≈ 637 km — Terre = 10 u, Soleil (G) = 1 090 u. Les
  planètes gardent leurs vrais rapports (Jupiter ≈ 10× la Terre) ; les
  orbites sont compressées : l'orbite intérieure fait ~3× le rayon de
  l'étoile (qui y paraît énorme), les orbites extérieures 10–50× (qui y
  paraît minuscule). Le mode croisière / supercroisière (F, ×65)
  auto-freine à l'approche des corps ; l'arrivée de saut se fait à
  distance sûre, face à l'étoile.
- **11 types d'étoiles**, en français sur la carte et le HUD : naine
  brune, naines rouge / orange / jaune (type Soleil) / F / A / B, géante
  bleue (O), géante rouge (sans planètes intérieures), naine blanche,
  pulsar (faisceaux balayants).
- **Raretés** (~2 % des systèmes chacune, déterministes) : **trou noir**
  (disque d'accrétion, puits de gravité, mort par marées trop près),
  **trou de ver** (saut gratuit vers un système lointain), **épave
  extraterrestre** (scan = lore + 5 000 CR, une seule fois). Les systèmes
  à rareté déjà visités ou détectés par un « SCAN LOINTAIN » (carte,
  portée 10 KLY) sont marqués « ??? » sur la carte galactique.

## Structure du code
- `src/core` — boucle, input, état, PRNG, sauvegarde
- `src/render` — pipeline PS1 (basse rés, vertex snap, dither), textures procédurales
- `src/world` — galaxie, systèmes, planètes, stations
- `src/ship` — modèle vaisseau, vol 6DOF, modules
- `src/economy` — marché, marchandises, crédits
- `src/ui` — HUD, titre, carte, menus station
- `src/audio` — musique, bruitages WebAudio

## Android (APK)

Le jeu est empaqueté en **APK** avec [Capacitor](https://capacitorjs.com)
(`@capacitor/core` + `@capacitor/android`, CLI en devDependency) :

- Build Vite en **`base: './'`** : `dist/` contient des chemins relatifs
  (indispensable au chargement `file://` de Capacitor) ; les musiques
  `public/audio/` (5 pistes) sont embarquées dans l'APK.
- `capacitor.config.ts` : `appId = com.alexandrelebegue.stellardrift`,
  `appName = "Stellar Drift"`, `webDir = dist`, `android.zoomEnabled = false`.
- **Paysage** forcé (`screenOrientation="sensorLandscape"`), **plein écran
  immersif** (barres d'état + navigation masquées via `WindowInsetsControllerCompat`
  dans `MainActivity`, thème `windowFullscreen`), pas de zoom WebView.
- Icônes (launcher carré/ronde, adaptive foreground) et splash générés
  procéduralement : `node scripts/gen-icons.mjs` (aucun outil externe).

```bash
# Build local de l'APK (nécessite Node >= 22, Java 21 et l'Android SDK)
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

### CI (`.github/workflows/android.yml`)

Déclencheurs : push sur `main`, tag `v*`, manuel. Node 22 + Java 21 (Temurin) :
`npm ci` → `npm run build` → `npx cap sync android` → `./gradlew assembleDebug`.
Artefact `stellar-drift-debug.apk` à chaque run ; sur un tag `v*`, une
**release GitHub** est créée avec le `.apk`.

### Signature fixe

Tous les builds sont signés avec **le même keystore**
(`android/keystore/stellar-drift.keystore`, hors du dépôt — `android/keystore/`
est ignoré par git) : une nouvelle APK s'installe **par-dessus** l'ancienne
sans désinstallation, et la sauvegarde (`localStorage`) est **conservée**.

- **En CI** : le keystore est décodé à la volée depuis les secrets GitHub
  `STELLAR_KEYSTORE_B64` (fichier en base64), `STELLAR_KEYSTORE_STORE_PASSWORD`,
  `STELLAR_KEYSTORE_KEY_PASSWORD`, `STELLAR_KEYSTORE_ALIAS`. Tant que ces
  secrets n'existent pas, le build est signé par la clé debug automatique
  (usage dev uniquement).
- **En local** : pointer le keystore via `STELLAR_KEYSTORE_FILE`
  (+ `STELLAR_KEYSTORE_STORE_PASSWORD`, `STELLAR_KEYSTORE_KEY_PASSWORD`,
  `STELLAR_KEYSTORE_ALIAS`) ; sans ces variables, signature debug.
- **Versioning** : en CI `versionCode = numéro de run GitHub` (toujours
  croissant) et `versionName = tag` ou `0.0.0-ci<n>` ; en local
  `versionCode` volontairement élevé (2 000 000) pour croiser les deux mondes.

## Windows (.exe)

Version bureau avec **Electron** (`electron` + `electron-builder` en devDeps) :

- `electron/main.cjs` : fenêtre **1280×720 redimensionnable**, **sans barre de
  menu**, **F11 = plein écran** (intercepté au niveau fenêtre, hors du jeu),
  charge `dist/index.html` en `file://`. La musique (`dist/audio/`) et la
  sauvegarde (`localStorage` du profil Electron) fonctionnent **hors ligne**.
- Config `electron-builder` dans `package.json` : `appId =
  com.alexandrelebegue.stellardrift`, `productName = "Stellar Drift"`, cibles
  **portable** (un seul `.exe`) + **NSIS** (installeur, per-user, choix du
  répertoire), **x64**.

```bash
# Build local des .exe (nécessite Node + le SDK/SDK Electron selon l'OS ;
# le cross-build NSIS depuis Linux exige wine)
npm run build
npm run dist:win
# -> release/stellar-drift-<version>-portable.exe
# -> release/stellar-drift-<version>-setup.exe
```

### CI (`.github/workflows/windows.yml`)

Déclencheurs : push sur `main`, tag `v*`, manuel. `windows-latest`, Node 22 :
`npm ci` → `npm run build` → `npx electron-builder --win --publish never`
(pas de signature de code). Artefact `stellar-drift-windows` (les 2 `.exe`) ;
sur un tag `v*`, les `.exe` sont ajoutés à la **release GitHub** du tag
(créée si le workflow Android ne l'a pas déjà créée).
