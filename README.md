# mach’s – Haushalts-App (Prototyp)

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
- **Hinweise an/aus:** Standard ist aus (Entscheidung 21): keine Demo-Spur in der App, Freigabe und Termin laufen per Timer. An zeigt schließbare Tipps, „Wartezeit überspringen“, „Nächster Schritt (Demo)“ und die Kennzeichnung „Beispielwerte“.
- **Offene Fälle einen Schritt weiter:** schaltet Freigabe, Termin, unterwegs, repariert. Ohne Tap läuft das per Timer (Freigabe 10 s, danach je 5 s).
- **Alles zurücksetzen:** löscht Geräte, Fälle und Einwilligungen und startet das Onboarding neu.

- **Hell oder dunkel:** Profil → „Darstellung“: Wie System, Hell, Dunkel.
- **Gespräch und Formular:** Jeder Fall ist ein Gespräch. „Details“ an Ergebnis, Kosten und Termin öffnet die Formular-Ansicht.

### Golden Path für Fründ (Geschirrspüler ohne Versicherung)

1. Onboarding: „Los geht’s“ → Suche „G 5833“ → „Miele G 5833 SC“.
2. „Versicherung vorhanden?“ → „Nein, keine Versicherung“ → Suche „Fründ“ → „Fründ Elektrogeräte AG“ → „Händler speichern“.
3. „Was ist kaputt?“ → „Wasser bleibt stehen“. Die Anleitung kommt aus der Gebrauchsanweisung (Quelle mit Seite unter jedem Schritt).
4. Fünf Schritte „Erledigt“, im Schritt „Ablaufpumpe reinigen“ „Geht nicht“ → „Hilfe holen“.
5. „Videocall starten“ → Markus T. vom Fründ Kundendienst → Auflegen → Befund → „Passt, weiter“.
6. „Weiter zum Termin“ → Fründ Kundendienst → Zeitfenster → „Zahlungspflichtig buchen“.
7. Weiter wie unten ab Schritt 7.

Weitere Geräte im Katalog: Bosch SMI4EAS24E (Geschirrspüler), Miele WQ 1000 WPS (Waschmaschine), Miele WKB 130 (erste Demo).

### Golden Path für den Pitch (ca. 3 Minuten)

Der ganze Fall ist ein Gespräch. Die Antworten stehen unten, „Details“ zeigt das Formular.

1. Onboarding: „Los geht’s“ → Gerät wählen → „Wo hast du es gekauft?“ Fründ → „Weiter“ → „Zusätzlich eine Versicherung?“ Ja: Kranich, Police-Nr. `KV-2023-0471`.
   Ohne Versicherung übernimmt der Fründ Kundendienst. In beiden Fällen geht der Fall im Gespräch auch an Fründ („Fall an … senden“, sobald Hilfe nötig ist).
2. „Was ist kaputt?“ → „Foto machen“ → Auslöser (im Browser: „Beispielfoto nehmen“).
3. Im Gespräch: Ergebnis „Laugenfilter verstopft“, Sicherheit hoch → „Anleitung starten“.
4. Die Schritte stehen im Gespräch: viermal „Erledigt“, in Schritt 5 „Geht nicht“ → „Hilfe holen“. Der Stift am letzten „Erledigt“ geht einen Schritt zurück, „Details“ am Schritt zeigt die Großansicht.
5. „Videocall starten“ (vorher steht, wer welche Daten sieht) → Auflegen → Befund der Fachkraft → „Passt, weiter“.
6. Kosten: „Das geht an Kranich“ aufklappen → „Schadenfall melden“.
7. Betrieb und Zeitfenster wählen → „Termin anfragen“ → „Nächster Schritt (Demo)“ bis „Repariert“.
8. „Läuft wieder“ → Sterne → „Fertig“ → Fall im Tab „Fälle“.

Eigene Worte: Unten ins Feld schreiben. Der Reparatur-Assistent antwortet im selben Gespräch. Mit der Kamera links neben dem Feld geht ein Foto mit, z. B. zu einem Schritt: „Mache ich das so richtig?“. Der Assistent schätzt ein, ob es nach dem Schritt aussieht.

### Whitelabel

Versicherer, Händler, Hersteller, Betriebe, Fachkraft, Preise und Zeitfenster stehen nur in `config/demo.config.ts`. Ein Wechsel dort ändert alle Texte. Alle Werte sind Beispielwerte.

## Anleitungen aus dem Katalog

Die App zeigt nur geprüfte Anleitungen für genau das Modell (Materialnummer oder Modell). Neue Modelle kommen aus der Gebrauchsanweisung des Herstellers:

```bash
npm run guides:import -- anleitung.pdf --id miele-twb140 --hersteller miele --kategorie trockner --modell "TWB 140" --material "12 345 678"
```

```bash
npm run guides:approve -- miele-twb140 --von "Name, Firma"
```

Der Import braucht `ANTHROPIC_API_KEY` in der Umgebung und schreibt einen Entwurf nach `server/guides/drafts/`. Er meldet jeden Text, der nicht wörtlich im PDF steht. Erst die Freigabe legt ihn nach `server/guides/catalog/`. Dann liefert ihn `GET /api/guides`, und der Reparatur-Assistent kennt ihn.

## Händlerportal (machs.io)

Web-App in `portal/` (Next.js), im Look von machs.io. Sie liest die Fälle, die Haushalte in der App an ihren Händler senden („Fall an … senden“), und schickt Antworten zurück ins Gespräch.

- **Fälle:** Warteschlangen (Neu, Wartet auf uns, Wartet auf Kundschaft, Termin, Erledigt), Suche nach Fallnummer, Name, Modell und Seriennummer, „Mir zugewiesen“, Liste oder Tafel (Karten ziehen), Fristenampel, Sammelaktionen.
- **Fallakte:** Gespräch wie im Messenger, Antwortfeld mit Textbausteinen, Rückfrage, Terminvorschlag, Ersatzteil, Foto anfordern, interne Notiz. Rechts „Als Nächstes“, Gewährleistungsprüfung mit Entscheidung per Klick, Zuständig und Stand, Fallakte, Fotos, Zugriffe. Videocall sichtbar, ohne Verbindung.
- **Auswertung:** Fälle pro Woche nach Ausgang, Anteil ohne Einsatz gelöst, Ersparnis, Durchlaufzeit, Bewertung, häufigste Fehlerbilder.
- **Einstellungen:** Profil und Servicezeiten, Begrüßung und Abwesenheit, Textbausteine und Rückfragen, Team, Regeln (annehmen, zuweisen, Kaufbeleg, Gewährleistung, Fristen), Kundendienst, Benachrichtigungen, Datenschutz mit Zugriffsprotokoll, Schnittstellen.
- **Live:** Neue Fälle und Nachrichten erscheinen ohne Neuladen, mit Hinweis. Tastenkürzel mit `?`.

```bash
npx expo start
```

```bash
cd portal && npm install && npm run build && npm start
```

Dann http://localhost:3000 öffnen. Demo-Zugang: `demo@fruend.example` (Sandra K.), Passwort `demo`. Das Portal holt die Daten vom laufenden Expo-Server (`GANZ_API_URL`, Standard `http://127.0.0.1:8081`). Ohne Telefon zeigt es 42 Beispielfälle. Antworten erscheinen in der App nach höchstens 5 Sekunden im Gespräch des Falls. Für die Demo `npm start` statt `npm run dev`: ohne Entwickler-Hinweise im Bild. Beispielfälle ganz neu anlegen: `.data/ganz-backend.json` löschen. Details: `docs/BACKEND.md`.

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
- `data/guides.ts` – Anleitungen, wörtlich aus der Demo (eingebauter Katalog-Eintrag)
- `lib/guideCatalog.ts` – Katalog der Anleitungen, `server/guides/` – freigegebene Einträge und Entwürfe
- `i18n/de.ts` – alle Texte
- `docs/` – Review, Bauplan, Entscheidungen, Annahmen, Befunde, Datenmodell
- `design-system/` – mach’s-Designsystem (verbindlich), mit Logos unter `assets/logos/`
- `reference/ganz-design-system/` – früheres ganz-Designsystem, gilt nicht mehr
- `reference/demo-v1.0/` – Klick-Demo v1.0 (nur Spezifikation)
