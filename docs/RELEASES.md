# Releases

Stand: 03.11.2026 · gehört zu Phase 2 in `docs/ZUKUNFTSPLAN.md` (Versionen) und Abschnitt 5 (Abhängigkeiten)

Hier steht jede Version von ganz mit einer kurzen Notiz, dazu einmal im Monat der Stand der Abhängigkeiten. Neue Einträge kommen oben dazu.

## So entsteht eine Version

- **Semver in `package.json`.** `app.config.ts` liest `version` von dort, eine zweite Stelle gibt es nicht. Patch für Fehler und Texte, Minor für neue Wege in der App, Major erst mit dem Pilot.
- **Build-Nummern zählt EAS** (`appVersionSource: remote` in `eas.json`). Sie stehen hier nicht.
- **Laufzeit:** `pitch` und `production` nehmen den Fingerprint des nativen Stands. Ändert sich etwas Natives (Paket mit nativem Code, Plugin, Recht, Bundle-ID), braucht es einen neuen Build. Ein Update reicht dann nicht.
- **Updates auf `pitch`** gehen nur per Script aus einem Commit mit Pitch-Tag raus (`scripts/pitch-tag.sh`, das Update-Script kommt mit Schritt 30). Im Pitch-Build lädt die App ein Update nur per Tap in der Demo-Steuerung.
- **Rechtstexte** ändern sich nur mit neuer `textVersion` (`lib/legalTexts.ts`). Die Notiz nennt jede neue Version.
- **Vorher grün:** `scripts/ci-checks.sh`, für einen Pitch-Build dazu `e2e/golden-path.yaml` (ab Schritt 30) und `docs/PITCH_CHECK.md`.

## Vorlage für einen Eintrag

```
### x.y.z · TT.MM.JJJJ

- Commit: … · Tag: pitch-JJJJ-Wxx (falls vorhanden)
- Variante und Kanal: pitch | production
- Build oder Update: neuer Build | Update auf Laufzeit …
- Neue Textversionen: keine | assistent_einwilligung 2026-11-3, …
- Was neu ist: ein bis drei kurze Sätze
```

## Vor dem ersten Build (Schritt 30)

- [ ] Lennart bestätigt die Kennung. Heute steht der Platzhalter `de.ganz.app` in `BASE_APP_ID` (`app.config.ts`). Nach dem ersten Build lässt sie sich bei Apple und Google nicht mehr ändern.
- [ ] Apple Developer Program und Expo-Konto (Entscheidung Nr. 17).
- [ ] `eas init`, die Projekt-ID nach `EAS_PROJECT_ID` in `app.config.ts`.
- [ ] `expo-dev-client` und `expo-updates` installieren.
- [ ] EAS-Umgebungen `development`, `preview` (für pitch) und `production` mit `APP_VARIANT`, `EXPO_PUBLIC_APP_VARIANT`, `EXPO_PUBLIC_API_URL` und `EXPO_PUBLIC_CHAT_TOKEN`. In der Expo-Doku prüfen, ob `eas update` nur diese Variablen liest (`--environment`).
- [ ] Prüfen, ob das Build-Image Node 24 nimmt, sonst `node` je Profil in `eas.json`.
- [ ] App-Icon und Splash aus dem Designsystem.

## Versionen

### 0.1.0 · unveröffentlicht

- Commit: Stand nach Schritt 29 · kein Tag
- Variante und Kanal: noch kein Build, der Pitch läuft über Expo Go und `npx expo start`
- Neue Textversionen: keine in Schritt 29 (zuletzt Schritt 26: `2026-11-1`, Einwilligung für den Assistenten `2026-11-2`)
- Was neu ist: Der Prototyp aus den Schritten 1 bis 15, dazu das Sicherheitsnetz und die Behebungen aus Phase 0 und 1 (Schritte 16 bis 27). Schritt 29 bereitet die Builds vor: `app.config.ts` mit drei Varianten, `eas.json`, Maestro-Flows.

## Abhängigkeiten

Einmal im Monat `npm outdated` und osv-scanner (`osv-scanner scan source --lockfile package-lock.json`). Das Ergebnis steht hier. Upgrades von Expo SDK, React Native und TypeScript kommen als eigener Schritt zwischen den Phasen, Expo höchstens eine SDK-Version hinter dem aktuellen Stand.

### 03.11.2026

- **`npm outdated`:** 23 Pakete haben eine neuere Version.
  - Innerhalb der Bereiche aus `package.json`, also mit `npm update` möglich: Expo und seine Pakete (z. B. `expo` 58.0.19 auf 58.0.23, `expo-router` 58.0.26 auf 58.0.30), `jest-expo`, `react-native-screens`, `lucide-react-native` und `@anthropic-ai/sdk` 1.3.0 auf 1.4.0.
  - Neuere Patch- oder Minor-Versionen außerhalb der festen Versionen: `react` und `react-dom` 19.3.1, `react-native` 0.88.1, `react-native-gesture-handler` 3.4.0, `react-native-keyboard-controller` 1.22.9, `react-native-safe-area-context` 5.11.1, `react-native-worklets` 0.13.1. Diese Versionen gibt Expo mit dem SDK vor, also nur zusammen mit `npx expo install --check`.
  - Neue Hauptversionen: `@react-native-async-storage/async-storage` 3, `eslint` 10, `typescript` 7. Nicht jetzt, sie gehören in den eigenen Upgrade-Schritt.
  - Schritt 29 hat nichts aktualisiert.
- **osv-scanner:** Am 03.11.2026 (Schritt 28) lief 2.7.0 lokal mit der Offline-Datenbank, weil api.osv.dev aus der Sitzung gesperrt ist. 1.074 Pakete, außer den 19 Ausnahmen keine Funde. In CI läuft er bei jedem Push gegen api.osv.dev. `osv-scanner.toml` nimmt 19 bekannte Schwachstellen in Werkzeugen für Build, Lint und Tests aus, je mit Grund. Die Ausnahmen gelten bis 04.12.2026, danach ist CI rot, bis sie erneuert oder durch Upgrades erledigt sind.
