# ganz – Haushalts-App (Prototyp)

Status: Phase 2 (Build). Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router.

## Start in 3 Befehlen

```bash
npm install
npx expo start
# QR-Code mit Expo Go scannen (iPhone: Kamera-App, Android: Expo Go)
```

Voraussetzungen: Node 20 oder neuer, Expo Go (SDK 58) auf dem Handy, Handy und Rechner im selben WLAN.
Klappt das WLAN nicht: `npx expo start --tunnel`.

## Prüfen

```bash
npm run check      # Typecheck, Lint, Prettier und Tests
npm test           # nur Tests
npm run guides:check  # Anleitungen gegen die Demo prüfen
npm run lint       # nur Lint
```

## Ordner

- `app/` – Screens (Expo Router): `(onboarding)`, `(tabs)`, `geraet/`, `fall/` (modaler Stack)
- `components/ds/` – Designsystem in React Native, Galerie unter Profil → „Komponenten (Demo)“
- `model/` – Datenmodell und Status-Maschine
- `store/` – Zustand mit Speicherung auf dem Gerät
- `config/demo.config.ts` – Versicherer, Händler, Hersteller, Preise (Beispielwerte)
- `data/guides.ts` – Anleitungen, wörtlich aus der Demo
- `i18n/de.ts` – alle Texte
- `docs/` – Review, Bauplan, Entscheidungen, Annahmen
- `design-system/` – ganz-Designsystem (verbindlich)
- `reference/demo-v1.0/` – Klick-Demo v1.0 (nur Spezifikation)

Stand: Schritte 1 bis 4 aus `docs/BUILD_PLAN.md` Abschnitt 5. Screens ab Schritt 5 sind Platzhalter mit funktionierender Navigation.

Onboarding neu starten: Profil → „Onboarding neu starten (Demo)“.
