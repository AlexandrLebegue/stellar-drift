# Tâche : version Windows .exe de Stellar Drift (après l'APK)

1. Ajoute Electron + electron-builder (devDependencies). `electron/main.cjs` : fenêtre 1280x720 redimensionnable, plein écran avec F11, sans barre de menu, charge `dist/index.html` (build Vite en base './'). Les musiques de public/audio doivent marcher hors ligne.
2. Config electron-builder dans package.json : appId `com.alexandrelebegue.stellardrift`, productName `Stellar Drift`, cible Windows `portable` (un seul .exe) + `nsis` (installeur), x64. Script `npm run dist:win`.
3. Workflow `.github/workflows/windows.yml` : runs-on windows-latest, déclencheurs push main + tags v* + workflow_dispatch ; Node 22 ; npm ci ; npm run build ; electron-builder --win --publish never ; artefact `stellar-drift-windows` (les .exe) ; sur tag v* : ajouter les .exe à la release GitHub du tag (gh release upload, ou création si absente). Pas de signature de code (non nécessaire).
4. Ne casse pas le build web ni le workflow Android. Ne touche pas au gameplay. Mets à jour README.md (section Windows) et PROGRESS.md, puis commit.
Sois rapide.
