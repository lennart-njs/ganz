# Pitch-Check

Stand: 04.11.2026 (Übertragung 2.1) · gehört zum Pitch-Gate in `docs/ZUKUNFTSPLAN.md` (Abschnitt 0 und Grundsatz 1)

Diese Prüfungen laufen vor jedem Pitch-Tag, also mindestens einmal pro Woche und vor jedem wichtigen Termin. Du prüfst auf dem Pitch-Telefon, mit dem Commit, der den Tag bekommt. Was ein Test im Repo schon abdeckt, steht hier nicht. Hier steht, was nur auf dem Gerät sichtbar wird.

## Ablauf

1. Alles ist committet, der Arbeitsbaum ist sauber.
2. App und Portal laufen wie in `docs/ABLAEUFE.md` → „Starten“: `npx expo start` für App und Backend, das Portal mit `npm run build` und `npm start`. Die App läuft auf dem Pitch-Telefon, heute über Expo Go, ab Phase 2 als eigener Pitch-Build.
3. Demo-Startstand laden: Profil → 7-mal auf die Versionsnummer tippen → „Demo-Startstand laden“. Danach ist der Geschirrspüler da, gekauft bei Fründ, ohne Versicherung, und es gibt keinen Fall. Dann `.data/ganz-backend.json` löschen, denn der erste Fall bekommt wieder die erste Fallnummer.
4. Die sieben Prüfungen unten durchgehen. Je Prüfung Datum, Commit, Gerät und Ergebnis in die Tabelle „Stand“ eintragen.
5. Die Tabelle committen. Der Commit ändert nur diese Datei.
6. `scripts/pitch-tag.sh` ausführen. Es bricht ab, solange ein regelbrechender Befund offen ist (R-07, R-12, R-13, R-16, R-17). Danach läuft `scripts/ci-checks.sh`. Ist alles grün, setzt es den lokalen Tag `pitch-JJJJ-Wxx`.
7. Am Vortag einer Demo gilt ab 18 Uhr ein Feature-Freeze. Danach nur noch Doku oder der Rückweg auf den letzten guten Stand (`docs/ANNAHMEN.md`, Übertragung, U13).

Scheitert eine Prüfung, gibt es keinen Tag. Trag den Fehler in `docs/BEFUNDE.md` ein, wenn möglich mit einem Test. Welche Tags es gibt: `git tag -l 'pitch-*' -n1`.

## Die Prüfungen

### 1. Golden Path

Der Ablauf aus `docs/ABLAEUFE.md` → „Demo“, vom Demo-Startstand aus. Telefon und Portal stehen nebeneinander.

1. Am Telefon: „Was ist kaputt?“ → „Wasser bleibt stehen“. Fünf Schritte „Erledigt“, im Schritt „Ablaufpumpe reinigen“ „Geht nicht“ → „Hilfe holen“.
2. „Fall an Fründ Elektrogeräte AG senden“ → die Vorschau lesen → „Ja, senden“.
3. Im Portal anmelden (`demo@fruend.example`, `demo`). Den Fall öffnen, „Annehmen“, „Gewährleistung bestätigen“. Dann eine Nachricht und einen Terminvorschlag senden.
4. Am Telefon ein Zeitfenster wählen.
5. Im Portal Auswertung und Einstellungen → Schnittstellen zeigen.

Bestanden, wenn:
- jeder Schritt ohne Hänger, Fehlermeldung oder leere Fläche läuft,
- der Fall die erste Fallnummer aus `config/demo.config.ts` trägt,
- vor „Ja, senden“ steht, was Fründ sieht, und erst der Tap den Fall sendet,
- nach dem Tap „Gesendet. Fründ Elektrogeräte AG meldet sich hier im Gespräch.“ steht, danach die Begrüßung mit Kontaktkarte und „Hast du den Kaufbeleg noch?“,
- im Portal der Hinweis „Neuer Fall“ mit der Fallnummer kommt,
- die Prüfung im Portal mit dem Kaufdatum aus dem Startstand „Gewährleistung“ vorschlägt,
- jede Antwort aus dem Portal nach höchstens 5 Sekunden in der App steht,
- vor einer Freigabe nirgends eine Kostenzusage steht.

Den Weg in der App bis „Ja, senden“ geht auch der Flow `e2e/haendler.yaml`, mit dem Onboarding statt des Startstands.

Einmal im Monat zusätzlich mit „Alles zurücksetzen“ und dem Onboarding nach Entscheidung 31: „Los geht’s“ → „G 5833“ → „Miele G 5833 SC“ → „Fründ Elektrogeräte AG“ → „Weiter“ → „Nein, keine Versicherung“. Danach `.data/ganz-backend.json` löschen. Ohne Kaufdatum zeigt die Prüfung im Portal „Abgelaufen“ mit „Ablehnen“. „Gewährleistung bestätigen“ dann über „Anders entscheiden“.

Einmal im Monat zusätzlich der Golden Path mit Versicherung, wie im Flow `e2e/golden-path.yaml`: Demo-Steuerung → „Demo-Startstand Versicherung“, dann die Schritte 2 bis 8 aus „Golden Path für den Pitch“ im `README.md`: Foto, Ergebnis, Anleitung, Hilfe holen, Videocall, Befund, Kosten, Schadenfall melden, Termin, Reparatur, Abschluss. Bestanden, wenn:
- jeder Schritt ohne Hänger, Fehlermeldung oder leere Fläche läuft,
- vor der Freigabe nirgends eine Kostenzusage steht,
- vor jeder Weitergabe steht, wer welche Daten bekommt, und erst der Tap sie auslöst,
- der Schadenfall erst nach dem Tap auf „Schadenfall melden“ entsteht,
- der Fall am Ende im Tab „Fälle“ steht.

Die drei Prüfungen danach starten ebenso aus „Demo-Startstand Versicherung“.

Einmal im Monat zusätzlich mit 50 € Selbstbeteiligung (Demo-Steuerung, nach dem Demo-Startstand Versicherung), wie im Flow `e2e/selbstbeteiligung.yaml` (ganz Nr. 31). Bestanden, wenn:
- während der Prüfung nur „Termin anfragen“ steht, mit „Die Anfrage ist unverbindlich“, und nirgends „Zahlungspflichtig buchen“,
- nach der Freigabe die Zusammenfassung mit Betrieb, Zeitfenster, Auftrag und „Selbstbeteiligung 50 €“ steht,
- „Nächster Schritt (Demo)“ erst nach „Zahlungspflichtig buchen“ wieder da ist und der Betrieb erst dann bestätigt,
- die Fallakte „Zahlungspflichtig gebucht“ mit Betrieb, Zeitfenster und 50 € zeigt.

Einmal im Monat zusätzlich die misslungene Reparatur, wie im Flow `e2e/gewaehrleistung.yaml` (ganz Nr. 32): in Schritt 8 „Problem besteht weiter“. Bestanden, wenn:
- „Die Reparatur ist noch in der Gewährleistung.“ steht, mit „… muss die Reparatur nachbessern. Für die Nachbesserung zahlst du nichts Neues.“,
- es weder „Schadenfall melden“ noch „Zahlungspflichtig buchen“ noch einen Betrag gibt und die Zusammenfassung „Keine neuen Kosten für dich, Gewährleistung“ nennt,
- der Betrieb nach „Nachbesserung anfragen“ ohne weiteren Tap bestätigt und die Fallakte „Nachbesserung in der Gewährleistung“ zeigt,
- nach einem zweiten „Problem besteht weiter“ „Auch die Nachbesserung hat nicht geholfen.“ und wieder Hilfe holen kommt,
- mit „Reparatur liegt länger zurück“ (Demo-Steuerung, vor Schritt 8) gleich „Die Gewährleistung für die Reparatur ist vorbei.“ und eine neue Runde kommt.

Dazu einmal Abbrechen in der Reparatur (ganz Nr. 34): nach „Termin anfragen“ zweimal „Nächster Schritt (Demo)“, bis „Termin steht“, dann X → „Fall abbrechen“. Bestanden, wenn vor dem Grund „… bekommt die Absage.“ und „Ob schon Kosten entstanden sind, klärt … mit dir.“ steht, nirgends „kostenlos“, und nach dem Abbruch kein „Nächster Schritt (Demo)“ mehr kommt.

### 2. Dark Mode

Profil → „Darstellung“ → „Dunkel“. Dann Start, Gespräch, Ergebnis, Anleitung, Vorschau vor „Ja, senden“, Gespräch mit Fründ, Kosten, Termin, Status, Fallakte und Profil ansehen. Danach „Wie System“ wählen und das System im Kontrollzentrum auf dunkel stellen.

Bestanden, wenn alle Texte lesbar sind, keine hellen Flächen aufblitzen, Fotos und Icons sichtbar sind und die Statusleiste zum Hintergrund passt.

### 3. Schrift 200 %

Einstellungen → Bedienungshilfen → Anzeige & Textgröße → Größerer Text. „Größere Schriftgrößen“ an, den Regler auf die zweite der großen Stufen (AX2, etwa 200 %). Dieselben Screens wie in Prüfung 2.

Bestanden, wenn nichts abgeschnitten ist oder sich überlappt, jeder Button lesbar und tippbar bleibt und alles per Scrollen erreichbar ist. Danach die Schrift zurückstellen.

### 4. VoiceOver-Stichprobe

VoiceOver an. Auf Start, Problem melden, Ergebnis im Gespräch, Kosten und Status mit Wischen nach rechts durchgehen.

Bestanden, wenn:
- jedes Element einen verständlichen Namen und die richtige Rolle hat (Taste, Überschrift, Auswahl),
- die Reihenfolge dem Bild folgt,
- neue Nachrichten im Gespräch und kurze Hinweise angesagt werden,
- ein offenes Sheet den Fokus hat und sich schließen lässt.

### 5. Anleitung ohne Netz

Einen Fall bis „Anleitung starten“ bringen. Dann Flugmodus an und WLAN aus. Mit Expo Go die App nicht neu laden, sonst fehlt das Bundle vom Rechner. Alle Schritte durchgehen, in einem Schritt „Geht nicht“ wählen. Die App in den Hintergrund schicken und zurückholen.

Bestanden, wenn Texte und Bilder der Anleitung da sind, der Fortschritt bleibt und es keine Fehlermeldung gibt. Dazu einmal eigene Worte an den Assistenten schicken: Es kommt der Hinweis „Keine Verbindung zum Assistenten“, und die App läuft weiter. Ab Schritt 26 bietet der Assistent ohne Netz „Als Notiz speichern“ an. Ab dem Pitch-Build in Phase 2 auch die App ohne Netz neu starten.

### 6. Assistent mit Schlüssel

`ANTHROPIC_API_KEY` steht in `.env`, `npx expo start` ist neu gestartet. Im Gespräch eigene Worte schreiben und senden. Ist `CHAT_PITCH_TOKEN` gesetzt, steht derselbe Wert in `EXPO_PUBLIC_CHAT_TOKEN`. Sonst antwortet die Route mit 401, und die Nachricht geht als Notiz an die Fachkraft.

Bestanden, wenn vor dem ersten Senden steht, wohin die Nachricht geht, und erst der Tap sie schickt. Die Antwort kommt nach wenigen Sekunden, ruhig und ohne Kostenzusage. In der Fallakte steht der Anbieter des Assistenten.

Ab Phase 2: dieselbe Prüfung über Mobilfunk, mit ausgeschaltetem Laptop. Das Datum steht in der eigenen Zeile der Tabelle.

### 7. Assistent ohne Schlüssel

`ANTHROPIC_API_KEY` in `.env` leeren, `npx expo start` neu starten. Eigene Worte senden.

Bestanden, wenn der Hinweis „Der Assistent ist auf diesem Rechner noch nicht eingerichtet. Eine Fachkraft hilft dir weiter.“ kommt, der Weg zur Fachkraft da ist und nichts abstürzt. Danach den Schlüssel wieder eintragen und neu starten.

## Stand

Je Prüfung das letzte Datum. Ältere Stände zeigt `git log -p docs/PITCH_CHECK.md`.

| Prüfung | Zuletzt geprüft | Commit | Gerät und iOS | Ergebnis | Wer |
|---|---|---|---|---|---|
| 1 Golden Path | – | – | – | noch nicht geprüft | – |
| 2 Dark Mode | – | – | – | noch nicht geprüft | – |
| 3 Schrift 200 % | – | – | – | noch nicht geprüft | – |
| 4 VoiceOver-Stichprobe | – | – | – | noch nicht geprüft | – |
| 5 Anleitung ohne Netz | – | – | – | noch nicht geprüft | – |
| 6 Assistent mit Schlüssel | – | – | – | noch nicht geprüft | – |
| 7 Assistent ohne Schlüssel | – | – | – | noch nicht geprüft | – |
| 6 ohne Laptop (ab Phase 2) | – | – | – | noch nicht möglich | – |
