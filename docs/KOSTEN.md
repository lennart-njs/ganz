# Kosten

Stand: 03.11.2026 · Vorlage aus Schritt 29, noch ohne Messung · gehört zu Phase 2 in `docs/ZUKUNFTSPLAN.md`

Diese Datei sammelt, was der Pitch ohne Laptop kostet: die Kosten je Fall für den Reparatur-Assistenten und die festen Kosten im Monat. Gemessen wird in Schritt 30, sobald die Chat-Route auf dem EU-Host läuft. Bis dahin sind alle Zahlen offen. Eine Zahl kommt erst hier hinein, wenn sie gemessen oder einer Rechnung entnommen ist. Daneben steht, woher sie kommt.

Abnahme von Phase 2: Diese Datei nennt die gemessenen Kosten je Fall.

## Preise für das Modell

Die Route ruft `claude-opus-5-5` auf (`app/api/chat+api.ts`). Input und Output laut Zukunftsplan (Anthropic-Doku im Okt. 2026), der Cache laut Modellreferenz von Anthropic:

| Posten                         | USD je Million Token | Hinweis                                                    |
| ------------------------------ | -------------------: | ---------------------------------------------------------- |
| Input                          |                 4,00 | ungecachter Teil der Anfrage                               |
| Output                         |                20,00 | zählt auch das Denken des Modells mit                      |
| Cache lesen                    |                 0,20 | fester Teil des Prompts (`STABLE_SYSTEM`) bei einem Treffer |
| Cache schreiben (5 Minuten)    |                 5,00 | 1,25-fach Input, beim ersten Aufruf und nach Ablauf         |

Vor der ersten Messung die Preisliste von Anthropic prüfen und das Datum hier eintragen: **offen**.

Was die Kosten außerdem bewegt:

- **`effort: 'low'`** in der Route. Weniger Denken heißt weniger Output-Token.
- **`max_tokens: 4000`** begrenzt den Output je Anfrage, Denken eingeschlossen. Eine Anfrage kostet im Output also höchstens 4.000 × 20 / 1.000.000 = 0,08 USD.
- **Cache:** Ist der feste Teil des Prompts kürzer als die Mindestlänge für den Cache, bleibt `cache_read_input_tokens` bei 0, und jede Anfrage zahlt den vollen Input. Das zeigt die erste Messung.
- **Ersatzmodell bei Ablehnung:** Springt ein anderes Modell ein, zählt dessen Preis. Solche Anfragen in der Messung eigens zählen.
- **Gespräch als Ganzes:** Jede Anfrage schickt das ganze Gespräch mit, höchstens 40 Nachrichten (`lib/chat/limits.ts`). Spätere Nachrichten in einem Fall kosten darum mehr Input als frühe.

## So wird gemessen

1. Die Route läuft auf dem Host mit echtem Schlüssel. Kein anderer Verkehr auf diesem Schlüssel, solange gemessen wird.
2. Zehn Demo-Fälle nach der Tabelle unten, jeder aus „Demo-Startstand Versicherung“ (Kranich, Waschmaschine). Nur Zeile 8 startet aus „Demo-Startstand laden“ (Geschirrspüler von Fründ, ohne Schutz).
3. Je Anfrage die vier Zahlen aus `response.usage`: `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`. Die Route schreibt sie heute nicht ins Log. Schritt 30 ergänzt dafür eine Log-Zeile nur mit diesen Zahlen und der Anfrage-Nummer, ohne Inhalte (wie bei den Fehlern seit Schritt 27). Gegenprobe: die Nutzung des Tages in der Console von Anthropic.
4. Kosten je Anfrage in USD:
   `(input × 4,00 + cache_geschrieben × 5,00 + cache_gelesen × 0,20 + output × 20,00) / 1.000.000`
5. Kosten je Fall = Summe über alle Anfragen des Falls. Dazu Mittelwert und höchster Wert.

## Kosten je Fall (10 Demo-Fälle)

| #   | Weg                                                          | Anfragen | Input | Cache geschrieben | Cache gelesen | Output | Kosten USD |
| --- | ------------------------------------------------------------ | -------: | ----: | ----------------: | ------------: | -----: | ---------: |
| 1   | Golden Path, eine Frage zum Ergebnis                         |    offen | offen |             offen |         offen |  offen |      offen |
| 2   | Golden Path, eine Frage je Schritt der Anleitung             |    offen | offen |             offen |         offen |  offen |      offen |
| 3   | „Etwas anderes“ mit eigenen Worten, Assistent schlägt vor    |    offen | offen |             offen |         offen |  offen |      offen |
| 4   | Problem per Symptom, zwei Rückfragen                         |    offen | offen |             offen |         offen |  offen |      offen |
| 5   | Meldung im Display, Frage zur Meldung                        |    offen | offen |             offen |         offen |  offen |      offen |
| 6   | Pflege-Anleitung, eine Frage                                 |    offen | offen |             offen |         offen |  offen |      offen |
| 7   | Langes Gespräch bis zur Grenze von 40 Nachrichten            |    offen | offen |             offen |         offen |  offen |      offen |
| 8   | Gerät ohne Schutz, Frage zu den Kosten                       |    offen | offen |             offen |         offen |  offen |      offen |
| 9   | Zwei Fälle hintereinander, Cache noch warm                   |    offen | offen |             offen |         offen |  offen |      offen |
| 10  | Erste Anfrage nach mehr als 5 Minuten Pause, Cache kalt      |    offen | offen |             offen |         offen |  offen |      offen |
|     | **Mittelwert je Fall**                                       |          |       |                   |               |        |  **offen** |
|     | **Höchster Wert**                                            |          |       |                   |               |        |  **offen** |

Gemessen am: **offen** · Commit: **offen** · Host: **offen**

## Obergrenze am Tag

Die Route nimmt höchstens `CHAT_DAILY_LIMIT` Anfragen am Tag an, ohne Angabe 1.000 (Schritt 27). Daraus folgt eine Obergrenze, die unabhängig vom Verhalten der Nutzer gilt:

- Output: 1.000 × 0,08 USD = höchstens 80 USD am Tag.
- Input: 1.000 × größte gemessene Input-Kosten je Anfrage (Fall 7). **offen**
- Obergrenze gesamt am Tag: **offen**

Der Budget-Alarm beim Anbieter liegt unter dieser Grenze. Betrag: **offen**.

## Feste Kosten im Monat

Je Posten der Betrag aus der Rechnung oder der Preisliste, mit Datum. Jährliche oder einmalige Beträge stehen umgerechnet auf den Monat daneben.

| Posten                                         | Wofür                                              | Betrag | je Monat | Quelle und Datum | Entscheidung     |
| ---------------------------------------------- | -------------------------------------------------- | -----: | -------: | ---------------- | ---------------- |
| Apple Developer Program                        | TestFlight und Pitch-Build auf dem iPhone          |  offen |    offen | offen            | Nr. 17           |
| Expo Application Services (EAS)                | Builds und Updates; reicht der kostenlose Tarif?   |  offen |    offen | offen            | Schritt 30       |
| EU-Host für die Chat-Route                     | Node 24, `expo-server` mit http- oder express-Adapter |  offen |    offen | offen            | Nr. 18           |
| Domain und TLS-Zertifikat                      | `EXPO_PUBLIC_API_URL` mit https                    |  offen |    offen | offen            | Schritt 30       |
| Nächtlicher iOS-Lauf (Maestro)                 | Minuten auf macOS-Runner, EAS Workflows oder Mac   |  offen |    offen | offen            | Lennart          |
| Android-Smoke einmal pro Woche                 | Emulator-Minuten                                   |  offen |    offen | offen            | Lennart          |
| Zweites Pitch-Gerät                            | einmalig, auf 24 Monate umgelegt                   |  offen |    offen | offen            | Phase 2          |
| Google Play Developer                          | erst für einen Android-Build außerhalb des Teams   |  offen |    offen | offen            | später           |
| **Summe fest**                                 |                                                    |        |  **offen** |                  |                  |

## Minuten für End-to-End

Der Zukunftsplan verlangt den Golden Path jede Nacht auf iOS und einmal pro Woche auf Android. Je Lauf die Dauer messen:

| Flow                      | Plattform | Dauer je Lauf | Läufe im Monat | Minuten im Monat |
| ------------------------- | --------- | ------------: | -------------: | ---------------: |
| `e2e/golden-path.yaml`    | iOS       |         offen |             30 |            offen |
| `e2e/abbruch.yaml`        | iOS       |         offen |             30 |            offen |
| `e2e/dark-200.yaml`       | iOS       |         offen |             30 |            offen |
| `e2e/golden-path.yaml`    | Android   |         offen |              4 |            offen |

Dazu Bau und Start des Simulators je Lauf: **offen**.

## Hochrechnung

Kosten im Monat = Fälle im Monat × Mittelwert je Fall + Summe fest. Für den Pitch reicht eine grobe Zahl: Fälle je Pitch-Woche und Teamtests. Ein Budget für Phase 5 und 6 folgt mit dem LOI.

| Annahme              | Fälle im Monat | Assistent | Fest  | Summe |
| -------------------- | -------------: | --------: | ----: | ----: |
| Nur Pitch und Team   |          offen |     offen | offen | offen |
