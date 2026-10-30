# Tâche : packager Stellar Drift en APK Android (Capacitor) + CI GitHub

Modèle de référence à copier : /home/dev/projects/potato-clicker (lis capacitor.config.ts, android/app/build.gradle (signingConfigs via variables d'env + keystore), .github/workflows/android.yml).

1. Ajoute Capacitor (@capacitor/core, @capacitor/cli, @capacitor/android) : capacitor.config.ts avec appId `com.alexandrelebegue.stellardrift`, appName `Stellar Drift`, webDir `dist`. Vérifie que le build Vite fonctionne en chemin relatif (base: './') et que les musiques public/audio sont bien incluses.
2. `npx cap add android`. Orientation paysage forcée (AndroidManifest screenOrientation="sensorLandscape"), plein écran immersif (barre d'état masquée), pas de zoom. Icône simple si possible.
3. Signature fixe comme potato : variables d'env STELLAR_KEYSTORE_B64 / STELLAR_KEYSTORE_STORE_PASSWORD / STELLAR_KEYSTORE_KEY_PASSWORD / STELLAR_KEYSTORE_ALIAS, keystore dans android/keystore/ (ignoré par git). versionCode/versionName depuis STELLAR_VERSION_CODE / STELLAR_VERSION_NAME.
4. .github/workflows/android.yml identique dans l'esprit à potato : push main, tags v*, workflow_dispatch ; Node 22 + Java 21 ; npm ci ; npm run build ; npx cap sync android ; ./gradlew assembleDebug ; artefact `stellar-drift-debug.apk` ; release GitHub sur tag v*.
5. Ne touche PAS au gameplay. Ne crée aucun secret ni dépôt GitHub (ProxBoss s'en charge). Commit à la fin, mets à jour README.md (section Android) et PROGRESS.md.
Sois rapide, n'analyse pas trop longtemps.
