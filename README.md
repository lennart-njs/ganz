# ganz – Haushalts-App (Prototyp)

Expo SDK 58, React Native 0.88, TypeScript strict, Expo Router. Stand: Schritte 1 bis 14 aus `docs/BUILD_PLAN.md`, dazu das Review nach dem Gerätetest (Layout, Tastatur, Texte je Hausgerät, Reparatur-Assistent).

## Start in 3 Befehlen

```bash
npm install
npx expo start
# QR-Code scannen: iPhone mit der Kamera-App, Android in Expo Go
```

Voraussetzungen: Node 20 oder neuer, Expo Go (SDK 58) auf dem Handy, Handy und Rechner im selben WLAN. Auf dem iPhone müssen Expo Go und der Rechner mit demselben Expo-Konto angemeldet sein (`npx expo login`). Klappt das WLAN nicht: `npx expo start --tunnel`.

## Reparatur-Assistent (Chat mit Claude)

Der Chat läuft über den Expo-Dev-Server auf deinem Rechner. Der Schlüssel bleibt dort und kommt nie in die App.

```bash
cp .env.example .env
# In .env den Schlüssel eintragen: ANTHROPIC_API_KEY=sk-ant-...
npx expo start   # neu starten, damit .env gelesen wird
```

Den Schlüssel bekommst du unter console.anthropic.com (API Keys). Ohne Schlüssel zeigt der Chat „noch nicht eingerichtet“ und verweist auf die Fachkraft. Der Chat funktioniert nur, solange `npx expo start` läuft. Modell und Einstellungen stehen in `app/api/chat+api.ts`, der Systemprompt in `lib/chat/prompt.ts`.

## Demo-Modus

Der Demo-Modus ist in `config/demo.config.ts` eingeschaltet (`demo.enabled`).

- **Demo-Steuerung öffnen:** Profil → 7-mal schnell auf die Versionsnummer tippen.
- **Dort einstellen:** Ergebnis der Intelligenten Fehlererkennung (Standard, unsicher, unscharf), Typenschild erkannt oder nicht, Fachkraft frei oder nicht, Freigabe oder Ablehnung, Selbstbeteiligung 0 € oder 50 €.
- **Hinweise an/aus:** An zeigt schließbare Tipps, „Wartezeit überspringen“, „Nächster Schritt (Demo)“ und die Kennzeichnung „Beispielwerte“. Aus: keine Demo-Spur in der App.
- **Offene Fälle einen Schritt weiter:** schaltet Freigabe, Termin, unterwegs, repariert. Ohne Tap läuft das per Timer (Freigabe 10 s, danach je 5 s).
- **Alles zurücksetzen:** löscht Geräte, Fälle und Einwilligungen und startet das Onboarding neu.

- **Hell oder dunkel:** Profil → „Darstellung“: Wie System, Hell, Dunkel.
- **Alles im Gespräch:** Jeder Fall ist ein Gespräch. Ergebnis, Kosten, Schadenmeldung, Termin und Status stehen darin, es gibt keine Formulare daneben. Die Fallakte bleibt als Dokument.

### Golden Path für den Pitch (ca. 3 Minuten)

Der ganze Fall ist ein Gespräch. Die Antworten stehen unten, Karten mit Ergebnis, Kosten und Stand stehen im Verlauf.

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
- `services/` – Schnittstellen zum späteren Backend, heute Mock-Services. Der Chat spricht mit `app/api/chat+api.ts`
- `config/demo.config.ts` – Beispielwerte für den Pitch
- `data/guides.ts` – Anleitungen, wörtlich aus der Demo
- `i18n/de.ts` – alle Texte
- `docs/` – Review, Bauplan, Entscheidungen, Annahmen, Befunde, Datenmodell
- `design-system/` – ganz-Designsystem (verbindlich)
- `reference/demo-v1.0/` – Klick-Demo v1.0 (nur Spezifikation)
