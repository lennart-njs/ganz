# Pitch-Check

Stand: 04.11.2026 · gehört zum Pitch-Gate in `docs/ZUKUNFTSPLAN.md` (Abschnitt 0 und Grundsatz 1)

Diese Prüfungen laufen vor jedem Pitch-Tag, also mindestens einmal pro Woche und vor jedem wichtigen Termin. Du prüfst auf dem Pitch-Telefon, mit dem Commit, der den Tag bekommt. Was ein Test im Repo schon abdeckt, steht hier nicht. Hier steht, was nur auf dem Gerät sichtbar wird.

## Ablauf

1. Alles ist committet, der Arbeitsbaum ist sauber.
2. Die App läuft auf dem Pitch-Telefon. Heute über Expo Go und `npx expo start`, ab Phase 2 als eigener Pitch-Build.
3. Demo-Startstand laden: Profil → 7-mal auf die Versionsnummer tippen → „Demo-Startstand laden“. Danach ist der Schutz verknüpft, die Waschmaschine ist da, und es gibt keinen Fall.
4. Die sieben Prüfungen unten durchgehen. Je Prüfung Datum, Commit, Gerät und Ergebnis in die Tabelle „Stand“ eintragen.
5. Die Tabelle committen. Der Commit ändert nur diese Datei.
6. `scripts/pitch-tag.sh` ausführen. Es bricht ab, solange ein regelbrechender Befund offen ist (R-07, R-12, R-13, R-16, R-17). Danach läuft `scripts/ci-checks.sh`. Ist alles grün, setzt es den lokalen Tag `pitch-JJJJ-Wxx`.
7. Vor wichtigen Terminen gilt danach ein Merge-Freeze von 48 Stunden.

Scheitert eine Prüfung, gibt es keinen Tag. Trag den Fehler in `docs/BEFUNDE.md` ein, wenn möglich mit einem Test. Welche Tags es gibt: `git tag -l 'pitch-*' -n1`.

## Die Prüfungen

### 1. Golden Path

Vom Demo-Startstand aus die Schritte 2 bis 8 aus „Golden Path für den Pitch“ im `README.md`: Foto, Ergebnis, Anleitung, Hilfe holen, Videocall, Befund, Kosten, Schadenfall melden, Termin, Reparatur, Abschluss.

Bestanden, wenn:
- jeder Schritt ohne Hänger, Fehlermeldung oder leere Fläche läuft,
- der Fall die erste Fallnummer aus `config/demo.config.ts` trägt,
- vor der Freigabe nirgends eine Kostenzusage steht,
- vor jeder Weitergabe steht, wer welche Daten bekommt, und erst der Tap sie auslöst,
- der Schadenfall erst nach dem Tap auf „Schadenfall melden“ entsteht,
- der Fall am Ende im Tab „Fälle“ steht.

Einmal im Monat zusätzlich mit „Alles zurücksetzen“ und dem Onboarding aus Schritt 1.

Einmal im Monat zusätzlich mit 50 € Selbstbeteiligung (Demo-Steuerung, nach dem Demo-Startstand), wie im Flow `e2e/selbstbeteiligung.yaml` (Entscheidung Nr. 31). Bestanden, wenn:
- während der Prüfung nur „Termin anfragen“ steht, mit „Die Anfrage ist unverbindlich“, und nirgends „Zahlungspflichtig buchen“,
- nach der Freigabe die Zusammenfassung mit Betrieb, Zeitfenster, Auftrag und „Selbstbeteiligung 50 €“ steht,
- „Nächster Schritt (Demo)“ erst nach „Zahlungspflichtig buchen“ wieder da ist und der Betrieb erst dann bestätigt,
- die Fallakte „Zahlungspflichtig gebucht“ mit Betrieb, Zeitfenster und 50 € zeigt.

Einmal im Monat zusätzlich die misslungene Reparatur, wie im Flow `e2e/gewaehrleistung.yaml` (Entscheidung Nr. 32): in Schritt 8 „Problem besteht weiter“. Bestanden, wenn:
- „Die Reparatur ist noch in der Gewährleistung.“ steht, mit „… muss die Reparatur nachbessern. Für die Nachbesserung zahlst du nichts Neues.“,
- es weder „Schadenfall melden“ noch „Zahlungspflichtig buchen“ noch einen Betrag gibt und die Zusammenfassung „Keine neuen Kosten für dich, Gewährleistung“ nennt,
- der Betrieb nach „Nachbesserung anfragen“ ohne weiteren Tap bestätigt und die Fallakte „Nachbesserung in der Gewährleistung“ zeigt,
- nach einem zweiten „Problem besteht weiter“ „Auch die Nachbesserung hat nicht geholfen.“ und wieder Hilfe holen kommt,
- mit „Reparatur liegt länger zurück“ (Demo-Steuerung, vor Schritt 8) gleich „Die Gewährleistung für die Reparatur ist vorbei.“ und eine neue Runde kommt.

Dazu einmal Abbrechen in der Reparatur (Entscheidung Nr. 34): nach „Termin anfragen“ und „Nächster Schritt (Demo)“ X → „Fall abbrechen“. Bestanden, wenn vor dem Grund „… bekommt die Absage.“ und „Ob schon Kosten entstanden sind, klärt … mit dir.“ steht, nirgends „kostenlos“, und nach dem Abbruch kein „Nächster Schritt (Demo)“ mehr kommt.

### 2. Dark Mode

Profil → „Darstellung“ → „Dunkel“. Dann Start, Gespräch, Ergebnis, Anleitung, Kosten, Termin, Status, Fallakte und Profil ansehen. Danach „Wie System“ wählen und das System im Kontrollzentrum auf dunkel stellen.

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
