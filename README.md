# ganz – Haushalts-App (Prototyp)

Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router, Zustand. Stand 03.11.2026: Schritte 1 bis 14 aus `docs/BUILD_PLAN.md` mit den Reviews nach den Gerätetests, dazu Phase 0 und Phase 1 des Zukunftsplans (Schritte 16 bis 28) und die Vorbereitung der Build-Varianten (Schritt 29). Was je Schritt erledigt ist, steht in `docs/BUILD_PLAN.md` Abschnitt 8, die Befunde in `docs/BEFUNDE.md`.

## Start in 3 Befehlen

```bash
npm install
npx expo start
# QR-Code scannen: iPhone mit der Kamera-App, Android in Expo Go
```

Voraussetzungen: Node 24 (siehe `.nvmrc` und `engines` in `package.json`, mit nvm: `nvm use`), Expo Go (SDK 58) auf dem Handy, Handy und Rechner im selben WLAN. Auf dem iPhone müssen Expo Go und der Rechner mit demselben Expo-Konto angemeldet sein (`npx expo login`). Klappt das WLAN nicht: `npx expo start --tunnel`.

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

Ist `CHAT_PITCH_TOKEN` leer, prüft die Route keinen Token, so wie heute auf dem Dev-Server. Ohne `EXPO_PUBLIC_CHAT_TOKEN` schickt die App keinen Header. Den Token wechselst du jede Woche: erst `CHAT_PITCH_TOKEN=neu,alt`, dann den neuen Build auf das Telefon, dann den alten Token entfernen. Dazu zählt die Route Anfragen je IP-Adresse und je Installation (Header `X-Ganz-Installation`, eine zufällige ID auf dem Telefon): 10 je Minute, 200 am Tag und 1.000 am Tag insgesamt, sonst 429. Die Installations-ID entsteht mit der ersten Frage nach der Einwilligung. Der Widerruf im Profil, „Alles zurücksetzen“, der Demo-Startstand und „Zurücksetzen“ nach einem Ladefehler löschen sie. Die Werte änderst du mit `CHAT_RATE_PER_MINUTE`, `CHAT_RATE_PER_DAY` und `CHAT_DAILY_LIMIT`. Die Adresse liest die Route aus `X-Forwarded-For` nur, wenn `CHAT_TRUSTED_PROXY_HOPS` sagt, wie viele Proxys davor Einträge anhängen. Ohne die Angabe, etwa auf dem Dev-Server, zählen alle Anfragen als eine Adresse, denn sonst könnte der Client jede Anfrage mit einer neuen Adresse schicken. Das begrenzt Missbrauch, ist aber kein Schutz: Der Token steckt in der App und lässt sich auslesen, Adresse und Installation lassen sich wechseln. Echte Anmeldung kommt erst mit dem Pilot-Backend (Phase 5).

## Start mit kaputtem Speicher

Lässt sich der gespeicherte Stand nicht laden (kaputtes JSON, falsche Form, unbekannte Version, Lesefehler), zeigt die App statt des Splash-Screens einen Hinweis (`components/app/RecoveryScreen.tsx`). „Erneut versuchen“ lädt noch einmal. „Zurücksetzen“ sichert erst den Rohwert unter `ganz-app-backup-<Zeit>`, löscht dann den Stand und die Installations-ID und beginnt mit dem Onboarding. Lässt sich der Rohwert nicht sichern, löscht es nichts. Die Sicherungen bleiben auf dem Telefon, aufgeräumt wird noch nicht. Ein neuer Stand mit höherer Version braucht einen Schritt in `MIGRATIONS` (`store/persistence.ts`), ein Test verhindert das Gegenteil.

## Demo-Modus

Der Demo-Modus ist in `config/demo.config.ts` eingeschaltet (`demo.enabled`).

- **Demo-Steuerung öffnen:** Profil → 7-mal schnell auf die Versionsnummer tippen.
- **Dort einstellen:** Ergebnis der Intelligenten Fehlererkennung (Standard, unsicher, unscharf), Typenschild erkannt oder nicht, Fachkraft frei oder nicht, Freigabe oder Ablehnung, Selbstbeteiligung 0 € oder 50 €, „Reparatur liegt länger zurück“ (Gewährleistung vorbei, Entscheidung Nr. 32).
- **Hinweise an/aus:** An zeigt schließbare Tipps, „Wartezeit überspringen“, „Nächster Schritt (Demo)“ und die Kennzeichnung „Beispielwerte“. Aus: keine Demo-Spur in der App.
- **Offene Fälle einen Schritt weiter:** schaltet Freigabe, Termin, unterwegs, repariert. Ohne Tap läuft das per Timer (Freigabe 10 s, danach je 5 s). Wartet ein Termin auf „Zahlungspflichtig buchen“, geht es erst nach deinem Tap im Gespräch weiter, auch per Timer nicht (Entscheidungen Nr. 31 und Nr. 33).
- **Demo-Startstand laden:** der feste Stand nach dem Onboarding im Golden Path (`store/demoStart.ts`): Schutz verknüpft, die Waschmaschine aus dem Vertrag, kein Fall, keine Einwilligung, feste Zeit `demo.startAt`. Er ersetzt den Stand ohne Rückfrage, die Darstellung bleibt. Danach steht die App auf der Startseite. So beginnt jeder Pitch gleich (`docs/PITCH_CHECK.md`).
- **Alles zurücksetzen:** löscht Geräte, Fälle, Einwilligungen und die Installations-ID und startet das Onboarding neu. Die Darstellung bleibt.

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

Mit 50 € Selbstbeteiligung (Demo-Steuerung, nach dem Demo-Startstand) ändert sich Schritt 7: Während Kranich prüft, bleibt es bei „Termin anfragen“, unverbindlich. Nach „Kranich hat die Kosten freigegeben“ steht im Gespräch die Zusammenfassung mit Betrieb, Zeitfenster, Auftrag und „Selbstbeteiligung 50 €“. Erst nach „Zahlungspflichtig buchen“ bestätigt der Betrieb den Termin (Entscheidung Nr. 31, Flow `e2e/selbstbeteiligung.yaml`). Mit 0 € gibt es diesen Schritt nicht.

Vor-Ort-Diagnose (wenn keine Fachkraft frei ist oder statt des Videocalls): „Termin anfragen“ ist unverbindlich. Mit „Nächster Schritt (Demo)“ nennt der Betrieb den Preis (79 €, Beispielwert). Dann „Zahlungspflichtig buchen“ oder „Nicht buchen“. Ohne den Tap kommt kein Termin (Entscheidung Nr. 33).

Misslungene Reparatur: In Schritt 8 statt „Läuft wieder“ „Problem besteht weiter“. Die Reparatur ist noch in der Gewährleistung (Annahme: 24 Monate ab Abschluss, Beispielwert). Der Betrieb bessert nach: Zeitfenster wählen → „Nachbesserung anfragen“. Keine neue Schadenmeldung, kein Betrag, kein „Zahlungspflichtig buchen“. Hilft auch das nicht, beginnt eine neue Runde mit Hilfe holen (Entscheidung Nr. 32, Flow `e2e/gewaehrleistung.yaml`). Mit „Reparatur liegt länger zurück“ in der Demo-Steuerung beginnt die neue Runde gleich.

Abbrechen geht in jedem offenen Fall, auch in der Reparatur: X → „Fall abbrechen“ → Grund. Läuft ein Termin, steht davor, dass der Betrieb die Absage bekommt, und beim Auftrag, dass er mit dir klärt, ob schon Kosten entstanden sind (Entscheidung Nr. 34).

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

Neue Versionen und den monatlichen Stand der Abhängigkeiten notierst du in `docs/RELEASES.md`, die Kosten für Assistent, Host und Builds in `docs/KOSTEN.md`.

`eas.json` hat dieselben drei Profile und setzt die Variante je Profil. Gebaut wird erst mit Expo-Konto und Apple Developer Program (Schritt 30), etwa `eas build --profile pitch`. Gebaut oder veröffentlicht ist noch nichts, `expo-updates` und `expo-dev-client` sind noch nicht installiert.

**Ungeprüft, bis Schritt 30 es gegen die Expo-Doku prüft** (sie war aus der Sitzung nicht erreichbar, `docs/ANNAHMEN.md` Schritt 29): dass `eas update` nur die Variablen der EAS-Umgebung liest und nicht das `env` aus `eas.json`, darum laut Annahme `eas update --channel pitch --environment preview`. Dazu die festen Namen der EAS-Umgebungen (`development`, `preview`, `production`), das Verhalten von Expo Go bei einer Fingerprint-Laufzeit und die Node-Version im Build-Image von EAS. Geprüft ist nur, was hier lief: `npx expo config` für alle drei Varianten und dass `development` im Dev-Server `exposdk:58.0.0` für Expo Go liefert.

## Prüfen

```bash
npm run check          # Typecheck, Lint über das ganze Repo, Prettier und alle Tests
npm run check:fast     # Typecheck, Lint auf geänderten Dateien, Jest-Projekte unit und build
npm test               # nur Tests
npm run guides:check   # Anleitungen wörtlich gegen die Demo prüfen
npm run lint           # nur Lint
scripts/ci-checks.sh   # alles wie in CI: check, guides:check, gitleaks, osv-scanner
scripts/commit-if-green.sh -m "Nachricht"   # committet, was mit git add bereitliegt, nur wenn alles grün ist und nichts anderes offen ist
scripts/pitch-tag.sh   # lokaler Tag pitch-JJJJ-Wxx, nach docs/PITCH_CHECK.md und grünem Check
node scripts/open-findings.js   # offene Regelbrüche R-07, R-12, R-13, R-16, R-17 (mit Nummern als Argument: diese, mit --results jest.json auch das Ergebnis von Jest)
npm run typecheck      # nur tsc
npm run format         # Prettier schreibt
```

`scripts/ci-checks.sh` ist die eine Quelle für alle Prüfungen. CI (`.github/workflows/check.yml`) und `scripts/commit-if-green.sh` rufen es auf. gitleaks und osv-scanner laufen lokal nur, wenn sie installiert sind, sonst steht ein Hinweis da. In CI laufen sie immer, mit fester Version und fester SHA-256 im Workflow. Die Actions stehen auf Commit-SHA. osv-scanner braucht api.osv.dev, ohne Zugang geht nur `osv-scanner scan source --offline-vulnerabilities --download-offline-databases --lockfile package-lock.json`. Ausnahmen für osv-scanner stehen mit Grund und Enddatum in `osv-scanner.toml`, bekannte Fehlalarme von gitleaks einzeln in `.gitleaksignore`. Auf GitHub gelaufen ist der Workflow noch nicht, das geht erst mit Push (Nr. 15).

`scripts/pitch-tag.sh` setzt den Pitch-Tag der Woche nur, wenn der Arbeitsbaum sauber ist, kein regelbrechender Befund offen ist (R-07, R-12, R-13, R-16, R-17, geprüft von `scripts/open-findings.js`) und `scripts/ci-checks.sh` grün ist. Dafür lässt es zuerst Jest über `__tests__/regressions/` laufen und gibt das Ergebnis (`--json`) an `open-findings.js --results`. Ein Befund ist nur zu, wenn jeder Test zu ihm wirklich grün gelaufen ist. Ein übersprungener, offener (`todo`) oder mit `.only` markierter Test, ein roter Test oder eine Datei, die nicht lief, macht alle offen. Das gilt auch für Formen, die man dem Quelltext nicht ansieht, etwa einen Test hinter einem `if`. Ohne `--results` prüft das Gate nur den Quelltext und sagt das. Vorher gehst du `docs/PITCH_CHECK.md` auf dem Pitch-Telefon durch. Gelaufen ist das Script noch nicht, geprüft sind nur `bash -n` und `open-findings.js`.

`scripts/commit-if-green.sh` prüft den Arbeitsbaum, committet aber nur, was bereitliegt. Darum bricht es ab, solange eine Datei geändert ist, ohne dass sie bereitliegt, oder eine neue Datei fehlt. So gilt das Grün genau für den Commit.

Lint prüft das ganze Repo mit `--max-warnings 0`. Eigene Regeln stehen im Plugin `ganz` in `eslint.config.js`: keine Farbwerte außerhalb von `theme/` (`ganz/farben-aus-theme`), kein Text außerhalb von `i18n/de.ts` (`ganz/text-aus-i18n` für JSX, auch `text` und `lines` der Gesprächsblasen und jede Prop, deren Wert nach Text aussieht, `ganz/text-in-ausdruecken` für Strings in `app/`, `components/` und `hooks/`, auch Konstanten, Objektwerte und Argumente in Handlern) und kein Status-Vergleich in diesen Ordnern (`ganz/kein-status-vergleich`, auch über `includes`, `has`, `Object.is`, `??`, eine Kopie, eine spätere Zuweisung oder einen Selektor, Ausnahmen nur mit Grund in der Allowlist). Die Regeln gelten für `.js`, `.jsx`, `.ts` und `.tsx`. Dazu kein `Text` direkt aus `react-native`. Beide Regeln sind ein Netz, keine Garantie: Was nicht nach Text aussieht (klein, ohne Leerzeichen), fällt außerhalb einer Text-Prop nicht auf, `lib/` prüft die Textregel nicht, und ein Status, den eine Funktion liefert (`getStatus(c)`), fällt der Statusregel nicht auf. `__tests__/lint.test.ts` zeigt, dass alle Regeln gleichzeitig greifen. Ein Test prüft jeden Screen auf Rolle, Label, 44 pt und Schrift bis 200 %.

Jest hat drei Projekte. `unit` prüft `model/` ohne React Native (Preset `jest-expo/node`), die Tests dazu liegen in `__tests__/model/`. `build` prüft die Build-Konfiguration, ebenfalls ohne React Native mit `jest-expo/node`: `app.config.ts` je Variante, `eas.json` und Texte und IDs in den Maestro-Flows (`__tests__/build/`). `ui` prüft alles andere mit dem Preset `jest-expo`. Projekte erben nichts voneinander, darum steht die Konfiguration in jedem Projekt für sich. `npx jest --selectProjects unit` startet nur die Unit-Tests, `check:fast` startet `unit` und `build`.

Alle Tests in `ui` laufen mit Fake Timers. Die Zeit läuft nur weiter, wenn ein Test sie weiterstellt. Router-Tests nehmen `APP` aus `test/app.ts`. Die Datei lädt alle Routen, bevor der erste Test startet. Kein Test braucht einen eigenen Timeout.

## Ordner

- `app/` – Screens (Expo Router): `(onboarding)`, `(tabs)`, `geraet/`, `fall/` (modaler Stack)
- `components/ds/` – Designsystem in React Native, Galerie über die Demo-Steuerung
- `components/app/` – App-Bausteine (Kamera, Fallakte, Kostenvergleich, Videocall)
- `model/` – Datenmodell und Status-Maschine, dazu `model/policies/` als eine Quelle für die Regeln (Fakten je Fall, erlaubte Aktionen, Zahler, Termine, Weitergaben)
- `store/` – Zustand mit Speicherung auf dem Gerät, Migration und Formprüfung beim Laden, Simulation für Freigabe und Betrieb, Demo-Startstand
- `lib/` – Ableitungen für die Screens, Chat (Kontext, Katalog, Grenzen, Route-Schutz) und versionierte Rechtstexte
- `hooks/` – `useCommand` mit Sperre gegen Doppeltaps und ruhigem Hinweis bei einer Ablehnung
- `services/` – Schnittstellen zum späteren Backend, heute Mock-Services. Der Chat spricht mit `app/api/chat+api.ts`
- `config/demo.config.ts` – Beispielwerte für den Pitch
- `data/guides.ts` – Anleitungen, wörtlich aus der Demo
- `i18n/de.ts` – alle Texte
- `docs/` – Review, Bauplan, Zukunftsplan, Entscheidungen, Annahmen, Befunde, Datenmodell, Pitch-Check, Review-Checkliste, Kosten (`KOSTEN.md`), Releases (`RELEASES.md`)
- `e2e/` – Maestro-Flows für Golden Path, Abbruch, dunkel und 200 %, Selbstbeteiligung 50 €, Gewährleistung. Noch nicht gelaufen, das kommt mit dem Pitch-Build (Schritt 30). `__tests__/build/e2eFlows.test.ts` hält sie bis dahin mit Texten und Code im Einklang
- `docs/recht/` – offene Rechtsfragen mit Frist je Frage
- `__tests__/` – Tests der drei Jest-Projekte, `__tests__/regressions/` mit R-01 bis R-18. `test/` hält gemeinsame Helfer
- `scripts/` – Prüfungen (`ci-checks.sh`, `commit-if-green.sh`, `lint-changed.js`), Pitch-Tag und Abgleich der Anleitungen
- `design-system/` – ganz-Designsystem (verbindlich)
- `reference/demo-v1.0/` – Klick-Demo v1.0 (nur Spezifikation)
