# ganz – Haushalts-App (Prototyp)

Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router. Stand: Schritte 1 bis 14 aus `docs/BUILD_PLAN.md`, dazu das Review nach dem Gerätetest (Layout, Tastatur, Texte je Hausgerät, Reparatur-Assistent).

## Start in 3 Befehlen

```bash
npm install
npx expo start
# QR-Code scannen: iPhone mit der Kamera-App, Android in Expo Go
```

Voraussetzungen: Node 24 (siehe `.nvmrc`, mit nvm: `nvm use`), Expo Go (SDK 58) auf dem Handy, Handy und Rechner im selben WLAN. Auf dem iPhone müssen Expo Go und der Rechner mit demselben Expo-Konto angemeldet sein (`npx expo login`). Klappt das WLAN nicht: `npx expo start --tunnel`.

## Reparatur-Assistent (Chat mit Claude)

Der Chat läuft über den Expo-Dev-Server auf deinem Rechner. Der Schlüssel bleibt dort und kommt nie in die App.

```bash
cp .env.example .env
# In .env den Schlüssel eintragen: ANTHROPIC_API_KEY=sk-ant-...
npx expo start   # neu starten, damit .env gelesen wird
```

Den Schlüssel bekommst du unter console.anthropic.com (API Keys). Ohne Schlüssel zeigt der Chat „noch nicht eingerichtet“ und verweist auf die Fachkraft. Der Chat funktioniert nur, solange `npx expo start` läuft. Modell und Einstellungen stehen in `app/api/chat+api.ts`, der Systemprompt in `lib/chat/prompt.ts`.

Die App fragt die Route unter `EXPO_PUBLIC_API_URL` (etwa `https://chat.example.org`, ohne `/api/chat`). Ohne die Variable nimmt sie den Dev-Server, von dem sie geladen ist. Die Route schreibt keine Nachrichten, keinen Kontext und keine Fehlermeldungen ins Log, nur Status, Fehlerart und Anfrage-Nummer.

Die Route nimmt nur Anfragen in der festen Form an (`requestSchema` in `lib/chat/prompt.ts`). Der Systemblock entsteht nur aus Schlüsseln und dem Katalog, eigene Worte gehen nur als Nachricht des Haushalts mit.

**Missbrauch begrenzen.** Für einen Pitch über einen erreichbaren Server setzt du zwei Werte in `.env` (siehe `.env.example`):

```bash
CHAT_PITCH_TOKEN=pitch-2026-w45         # Server: ohne diesen Token antwortet die Route mit 401
EXPO_PUBLIC_CHAT_TOKEN=pitch-2026-w45   # App: schickt ihn im Header X-Ganz-Token
```

Den Token wechselst du jede Woche: erst `CHAT_PITCH_TOKEN=neu,alt`, dann den neuen Build auf das Telefon, dann den alten Token entfernen. Dazu zählt die Route Anfragen je IP-Adresse und je Installation (Header `X-Ganz-Installation`, eine zufällige ID auf dem Telefon): 10 je Minute, 200 am Tag und 1.000 am Tag insgesamt, sonst 429. Die Werte änderst du mit `CHAT_RATE_PER_MINUTE`, `CHAT_RATE_PER_DAY` und `CHAT_DAILY_LIMIT`. Das begrenzt Missbrauch, ist aber kein Schutz: Der Token steckt in der App und lässt sich auslesen, Adresse und Installation lassen sich wechseln. Echte Anmeldung kommt erst mit dem Pilot-Backend (Phase 5).

## Demo-Modus

Der Demo-Modus ist in `config/demo.config.ts` eingeschaltet (`demo.enabled`).

- **Demo-Steuerung öffnen:** Profil → 7-mal schnell auf die Versionsnummer tippen.
- **Dort einstellen:** Ergebnis der Intelligenten Fehlererkennung (Standard, unsicher, unscharf), Typenschild erkannt oder nicht, Fachkraft frei oder nicht, Freigabe oder Ablehnung, Selbstbeteiligung 0 € oder 50 €.
- **Hinweise an/aus:** An zeigt schließbare Tipps, „Wartezeit überspringen“, „Nächster Schritt (Demo)“ und die Kennzeichnung „Beispielwerte“. Aus: keine Demo-Spur in der App.
- **Offene Fälle einen Schritt weiter:** schaltet Freigabe, Termin, unterwegs, repariert. Ohne Tap läuft das per Timer (Freigabe 10 s, danach je 5 s).
- **Demo-Startstand laden:** der feste Stand nach dem Onboarding im Golden Path. Schutz verknüpft, die Waschmaschine aus dem Vertrag, kein Fall. Danach steht die App auf der Startseite. So beginnt jeder Pitch gleich (`docs/PITCH_CHECK.md`).
- **Alles zurücksetzen:** löscht Geräte, Fälle und Einwilligungen und startet das Onboarding neu.

- **Hell oder dunkel:** Profil → „Darstellung“: Wie System, Hell, Dunkel.
- **Gespräch und Formular:** Jeder Fall ist ein Gespräch. „Details“ an Ergebnis, Kosten und Termin öffnet die Formular-Ansicht.

### Golden Path für den Pitch (ca. 3 Minuten)

Der ganze Fall ist ein Gespräch. Die Antworten stehen unten, „Details“ zeigt das Formular.

1. Onboarding: „Los geht’s“ → Vertragsnummer `KV-2023-0471` → „Ja, das ist es“.
2. „Was ist kaputt?“ → „Foto machen“ → Auslöser (im Browser: „Beispielfoto nehmen“).
3. Im Gespräch: Ergebnis „Laugenfilter verstopft“, Sicherheit hoch → „Anleitung starten“.
4. Vier Schritte „Erledigt“, in Schritt 5 „Geht nicht“ → „Hilfe holen“. Zurück im Gespräch.
5. „Videocall starten“ (vorher steht, wer welche Daten sieht) → Auflegen → Befund der Fachkraft → „Passt, weiter“.
6. Kosten: „Das geht an Kranich“ aufklappen → „Schadenfall melden“.
7. Betrieb und Zeitfenster wählen → „Termin anfragen“ → „Nächster Schritt (Demo)“ bis „Repariert“.
8. „Läuft wieder“ → Sterne → „Fertig“ → Fall im Tab „Fälle“.

Eigene Worte: Unten ins Feld schreiben. Der Reparatur-Assistent antwortet im selben Gespräch.

### Whitelabel

Versicherer, Händler, Hersteller, Betriebe, Fachkraft, Preise und Zeitfenster stehen nur in `config/demo.config.ts`. Ein Wechsel dort ändert alle Texte. Alle Werte sind Beispielwerte.

## Build-Varianten

`app.config.ts` kennt drei Varianten. `APP_VARIANT` wählt sie, ohne Wert gilt `development`. So läuft `npx expo start` mit Expo Go wie bisher.

| Variante      | Name unter dem Icon | Bundle-ID und Paket | Update-Kanal  | Laufzeit                 |
| ------------- | ------------------- | ------------------- | ------------- | ------------------------ |
| `development` | ganz dev            | `de.ganz.app.dev`   | `development` | wie das SDK, für Expo Go |
| `pitch`       | ganz pitch          | `de.ganz.app.pitch` | `pitch`       | Fingerprint              |
| `production`  | ganz                | `de.ganz.app`       | `production`  | Fingerprint              |

`de.ganz.app` ist ein Platzhalter. Lennart bestätigt die Kennung vor dem ersten Build, danach lässt sie sich nicht mehr ändern.

```bash
APP_VARIANT=pitch npx expo config --type public   # Konfiguration einer Variante ansehen
```

Ein unbekannter Wert bricht ab. Die Variante steht in jedem Build unter `extra.appVariant`, mit `EXPO_PUBLIC_APP_VARIANT` auch fest im Bundle.

`eas.json` hat dieselben drei Profile und setzt die Variante je Profil. Gebaut wird erst mit Expo-Konto und Apple Developer Program (Schritt 30), etwa `eas build --profile pitch`. `eas update` liest nur die Variablen der EAS-Umgebung, darum `eas update --channel pitch --environment preview` (`docs/ANNAHMEN.md`, Schritt 29).

## Prüfen

```bash
npm run check          # Typecheck, Lint über das ganze Repo, Prettier und alle Tests
npm run check:fast     # Typecheck, Lint auf geänderten Dateien, Jest-Projekt unit
npm test               # nur Tests
npm run guides:check   # Anleitungen wörtlich gegen die Demo prüfen
npm run lint           # nur Lint
scripts/ci-checks.sh   # alles wie in CI: check, guides:check, gitleaks, osv-scanner
scripts/commit-if-green.sh -m "Nachricht"   # committet, was mit git add bereitliegt, nur wenn alles grün ist
scripts/pitch-tag.sh   # lokaler Tag pitch-JJJJ-Wxx, nach docs/PITCH_CHECK.md und grünem Check
```

`scripts/ci-checks.sh` ist die eine Quelle für alle Prüfungen. CI (`.github/workflows/check.yml`) und `scripts/commit-if-green.sh` rufen es auf. gitleaks und osv-scanner laufen lokal nur, wenn sie installiert sind, sonst steht ein Hinweis da. In CI laufen sie immer, mit fester Version. Ausnahmen für osv-scanner stehen mit Grund und Enddatum in `osv-scanner.toml`.

`scripts/pitch-tag.sh` setzt den Pitch-Tag der Woche nur, wenn der Arbeitsbaum sauber ist, kein regelbrechender Befund offen ist (R-07, R-12, R-13, R-16, R-17, geprüft von `scripts/open-findings.js`) und `scripts/ci-checks.sh` grün ist. Vorher gehst du `docs/PITCH_CHECK.md` auf dem Pitch-Telefon durch.

Lint prüft das ganze Repo. Eigene Regeln stehen im Plugin `ganz` in `eslint.config.js`: keine Farbwerte außerhalb von `theme/` (`ganz/farben-aus-theme`), kein Text außerhalb von `i18n/de.ts` (`ganz/text-aus-i18n`, dazu `ganz/text-in-ausdruecken` für Bedingungen, Template-Literale, Verkettungen, Listen und Objekte in JSX). Dazu kein `Text` direkt aus `react-native`. `__tests__/lint.test.ts` zeigt, dass alle Regeln gleichzeitig greifen. Ein Test prüft jeden Screen auf Rolle, Label, 44 pt und Schrift bis 200 %.

Jest hat zwei Projekte. `unit` prüft `model/` ohne React Native (Preset `jest-expo/node`), die Tests dazu liegen in `__tests__/model/`. `ui` prüft alles andere mit dem Preset `jest-expo`. `npx jest --selectProjects unit` startet nur die Unit-Tests.

Alle Tests in `ui` laufen mit Fake Timers. Die Zeit läuft nur weiter, wenn ein Test sie weiterstellt. Router-Tests nehmen `APP` aus `test/app.ts`. Die Datei lädt alle Routen, bevor der erste Test startet. Kein Test braucht einen eigenen Timeout.

## Ordner

- `app/` – Screens (Expo Router): `(onboarding)`, `(tabs)`, `geraet/`, `fall/` (modaler Stack)
- `components/ds/` – Designsystem in React Native, Galerie über die Demo-Steuerung
- `components/app/` – App-Bausteine (Kamera, Fallakte, Kostenvergleich, Videocall)
- `model/` – Datenmodell und Status-Maschine
- `store/` – Zustand mit Speicherung auf dem Gerät, Simulation für Freigabe und Betrieb
- `services/` – Schnittstellen zum späteren Backend, heute Mock-Services. Der Chat spricht mit `app/api/chat+api.ts`
- `config/demo.config.ts` – Beispielwerte für den Pitch
- `data/guides.ts` – Anleitungen, wörtlich aus der Demo
- `i18n/de.ts` – alle Texte
- `docs/` – Review, Bauplan, Zukunftsplan, Entscheidungen, Annahmen, Befunde, Datenmodell, Pitch-Check, Review-Checkliste
- `docs/recht/` – offene Rechtsfragen mit Frist je Frage
- `design-system/` – ganz-Designsystem (verbindlich)
- `reference/demo-v1.0/` – Klick-Demo v1.0 (nur Spezifikation)
