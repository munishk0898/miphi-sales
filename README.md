# MiPhi Sales

A read-only mobile app (iOS and Android) for sales and presales. It lists MiPhi brochures, AVLs and presentation decks live from OneDrive, opens them in a built-in viewer, and lets staff download and share them.

Built with Expo SDK 57 (React Native). See **SETUP.md** for the one-time Microsoft Entra ID setup and the build and release steps.

```bash
npm install
npm run typecheck
npx eas-cli@latest build --platform android --profile preview   # Android APK
npx eas-cli@latest build --platform ios --profile production    # iPhone (TestFlight)
```
