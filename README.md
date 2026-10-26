# ganz – Haushalts-App (Prototyp)

Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router. Stand: Schritte 1 bis 14 aus `docs/BUILD_PLAN.md`.

## Start in 3 Befehlen

```bash
npm install
npx expo start
# QR-Code scannen: iPhone mit der Kamera-App, Android in Expo Go
```

Voraussetzungen: Node 20 oder neuer, Expo Go (SDK 58) auf dem Handy, Handy und Rechner im selben WLAN. Auf dem iPhone müssen Expo Go und der Rechner mit demselben Expo-Konto angemeldet sein (`npx expo login`). Klappt das WLAN nicht: `npx expo start --tunnel`.

## Demo-Modus

Der Demo-Modus ist in `config/demo.config.ts` eingeschaltet (`demo.enabled`).

- **Demo-Steuerung öffnen:** Profil → 7-mal schnell auf die Versionsnummer tippen.
- **Dort einstellen:** Ergebnis der Intelligenten Fehlererkennung (Standard, unsicher, unscharf), Typenschild erkannt oder nicht, Fachkraft frei oder nicht, Freigabe oder Ablehnung, Selbstbeteiligung 0 € oder 50 €.
- **Hinweise an/aus:** An zeigt schließbare Tipps, „Wartezeit überspringen“, „Nächster Schritt (Demo)“ und die Kennzeichnung „Beispielwerte“. Aus: keine Demo-Spur in der App.
- **Offene Fälle einen Schritt weiter:** schaltet Freigabe, Termin, unterwegs, repariert. Ohne Tap läuft das per Timer (Freigabe 10 s, danach je 5 s).
- **Alles zurücksetzen:** löscht Geräte, Fälle und Einwilligungen und startet das Onboarding neu.

### Golden Path für den Pitch (ca. 3 Minuten)

1. Onboarding: „Los geht’s“ → Vertragsnummer `KV-2023-0471` → „Ja, das ist es“.
2. „Was ist kaputt?“ → „Foto machen“ → Auslöser (im Browser: „Beispielfoto nehmen“).
3. Ergebnis „Laugenfilter verstopft“, Sicherheit hoch → „Anleitung starten“.
4. Vier Schritte „Erledigt“, in Schritt 5 „Geht nicht“ → „Hilfe holen“.
5. „Videocall starten“ (Hinweis, wer welche Daten sieht) → Auflegen → Befund „Reparatur“.
6. Kosten: „Das geht an Kranich“ aufklappen → „Schadenfall melden“.
7. Betrieb und Zeitfenster wählen → „Termin anfragen“ → Status mit „Nächster Schritt (Demo)“ bis „Repariert“.
8. Abschluss: „Läuft wieder“ → Bewertung → Fallakte im Tab „Fälle“.

### Whitelabel

Versicherer, Händler, Hersteller, Betriebe, Fachkraft, Preise und Zeitfenster stehen nur in `config/demo.config.ts`. Ein Wechsel dort ändert alle Texte. Alle Werte sind Beispielwerte.

## Prüfen

```bash
npm run check          # Typecheck, Lint, Prettier und alle Tests
npm test               # nur Tests
npm run guides:check   # Anleitungen wörtlich gegen die Demo prüfen
npm run lint           # nur Lint
```

Lint-Regeln: keine Hex-Farben außerhalb von `theme/`, kein Text außerhalb von `i18n/de.ts`, kein `Text` direkt aus `react-native`. Ein Test prüft jeden Screen auf Rolle, Label, 44 pt und Schrift bis 200 %.

## Ordner

- `app/` – Screens (Expo Router): `(onboarding)`, `(tabs)`, `geraet/`, `fall/` (modaler Stack)
- `components/ds/` – Designsystem in React Native, Galerie über die Demo-Steuerung
- `components/app/` – App-Bausteine (Kamera, Fallakte, Kostenvergleich, Videocall)
- `model/` – Datenmodell und Status-Maschine
- `store/` – Zustand mit Speicherung auf dem Gerät, Simulation für Freigabe und Betrieb
- `services/` – Schnittstellen zum späteren Backend, heute Mock-Services
- `config/demo.config.ts` – Beispielwerte für den Pitch
- `data/guides.ts` – Anleitungen, wörtlich aus der Demo
- `i18n/de.ts` – alle Texte
- `docs/` – Review, Bauplan, Entscheidungen, Annahmen, Befunde, Datenmodell
- `design-system/` – ganz-Designsystem (verbindlich)
- `reference/demo-v1.0/` – Klick-Demo v1.0 (nur Spezifikation)
