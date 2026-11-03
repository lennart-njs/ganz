# Abgleich der Befunde aus dem Review

Stand: 03.11.2026 · nach Schritt 23 (Ein Weg, einen Fall zu öffnen) · Befunde: `docs/REVIEW.md` Abschnitt 2 und `docs/ZUKUNFTSPLAN.md` Anhang B

Nach Schritt 14 waren alle P0- und P1-Befunde behoben. Die Code-Review vom 03.11.2026 hat acht davon wieder geöffnet: B-04, B-05, B-17, B-18, B-19, B-23, B-40 und B-53. Sie sind offen, bis die Rückfälle R-01 bis R-18 behoben sind (Abschnitt „Rückfälle“ unten). Wieder behoben sind B-04 (R-01), B-05 (R-06), B-17 (R-02), B-18 (R-07), B-40 (R-12) sowie B-19 und B-23 (R-16). Alle anderen P0- und P1-Befunde bleiben behoben. Die Spalte „Nachweis“ nennt den Test, der das Verhalten prüft, oder die Stelle im Code.

## P0

| ID | Behoben durch | Nachweis |
|---|---|---|
| B-03 | Store mit Speicherung auf dem Gerät, Karte „Offener Fall“ | `__tests__/store.test.ts`, `__tests__/guide.test.tsx` (Neustart in Schritt 4) |
| B-05 | Zurück, Wischgeste und Android-Zurück gehen in der Anleitung einen Schritt zurück. Ein neuer Einstieg setzt eine laufende Anleitung fort | `__tests__/guide.test.tsx`, `__tests__/diagnosis.test.tsx`, `__tests__/regressions/fehlverhalten.test.tsx` (R-06) |
| B-06 | „Geht nicht“ in jedem Schritt, Abbruchschritt im `GuideRun` | `__tests__/guide.test.tsx` |
| B-11 | Regel-Mock je Modus, Typenschild ohne Diagnose | `__tests__/diagnosis.test.tsx` |
| B-12 | Sicherheit in drei Stufen, Rückfrage bei „unsicher“, „Passt nicht“ | `__tests__/diagnosis.test.tsx` |
| B-17 | Schadenfall nur durch „Schadenfall melden“ mit gespeicherter Bestätigung, genau einmal je Fall | `__tests__/model/caseMachine.test.ts`, `__tests__/costs.test.tsx`, `__tests__/regressions/abstuerze.test.tsx` (R-02) |
| B-18 | „Die Kosten prüft … nach dem Befund“ statt Zusage. Während der Prüfung kein Selbstzahlen und kein „Du zahlst“ | `__tests__/help.test.tsx`, Test „Kein Text sagt Kosten zu“, `__tests__/regressions/fehlverhalten.test.tsx` (R-07) |
| B-19 | Hinweis „Das sieht … (Betrieb)“, Bestätigung vor dem Call und vor dem Rückruf, weder Call noch Rückruf ohne Bestätigung | `__tests__/help.test.tsx`, `__tests__/regressions/datenschutz.test.tsx` (R-16) |
| B-27 | „vorbehaltlich Freigabe“, `freigabe_noetig` nach der Meldung | `__tests__/costs.test.tsx` |
| B-29 | Zusammenfassung mit Adresse, „Termin anfragen“ oder „Zahlungspflichtig buchen“ | `__tests__/costs.test.tsx` |

## P1

| ID | Behoben durch | Nachweis |
|---|---|---|
| B-01 | Gerätekarte öffnet das Gerätedetail, Suchpille „Problem melden“ | `app/(tabs)/index.tsx`, `app/geraet/[id].tsx` |
| B-04 | X im Fall: „Später weitermachen“ oder „Fall abbrechen“ mit Grund, beides nur, wo die Regeln es erlauben | `__tests__/navigation.test.tsx`, `__tests__/regressions/abstuerze.test.tsx` (R-01) |
| B-07 | „Läuft noch nicht“ und „Läuft wieder“ | `__tests__/guide.test.tsx` |
| B-08 | Anleitungstyp, Pflege endet mit „Fertig“ | `__tests__/guide.test.tsx` |
| B-09 | Zuerst entfernt. Seit Entscheidung 6: „Frag den Assistenten zu diesem Schritt“ öffnet den Reparatur-Assistenten in der App, nicht nach außen | `__tests__/chat.test.tsx` |
| B-10 | Kein Chat nach außen. Seit Entscheidung 6: „Reparatur-Assistent fragen“ in der App, mit Einwilligung | `__tests__/chat.test.tsx`, `__tests__/chatApi.test.ts` |
| B-13 | Kostenhinweis im Ergebnis ohne Zusage | `__tests__/diagnosis.test.tsx` |
| B-14 | Abbrechen, Fehler „unscharf“, Ansage für den Screenreader | `__tests__/diagnosis.test.tsx`, `app/fall/[id]/analyse.tsx` |
| B-15 | Erklärung vor dem Systemdialog, Weg in die Einstellungen | `__tests__/devices.test.tsx`, `__tests__/diagnosis.test.tsx` |
| B-16 | Foto mit Zeitstempel, Gerät, Zweck, Fall und Quelle | `__tests__/diagnosis.test.tsx` |
| B-21 | Kundendienst aus `Manufacturer.serviceContact` | `__tests__/devices.test.tsx` |
| B-22 | Protokoll mit echten Schritten, „Anleitung nicht gestartet“ | `__tests__/help.test.tsx` |
| B-23 | Warteraum, Wartezeit, „keine Fachkraft frei“ mit Rückruf nach Bestätigung | `__tests__/help.test.tsx`, `__tests__/regressions/datenschutz.test.tsx` (R-16) |
| B-24 | Mikrofon und Kamera als Umschalter mit Zustand | `__tests__/help.test.tsx` |
| B-25 | „Keine Aufnahme“ vor und im Call, Screenshots nur mit Einwilligung | `__tests__/help.test.tsx` |
| B-26 | Befund der Fachkraft im Gespräch: „Im Call gelöst“, Reparatur oder Ersatzgerät. Seit Entscheidung 14 bestätigst du ihn oder sagst „Stimmt nicht“ | `__tests__/help.test.tsx` |
| B-28 | Pumpe bestellt und baut der Betrieb ein, Store sperrt den Versand an den Haushalt | `__tests__/costs.test.tsx` |
| B-31 | Direktweg heißt „Vor-Ort-Diagnose“, Texte aus dem Fall | `__tests__/costs.test.tsx` |
| B-32 | „Termin anfragen“, Bestätigung durch den Betrieb im Status | `__tests__/costs.test.tsx`, `__tests__/status.test.tsx` |
| B-33 | Status aus einer Quelle (`Case`, `CaseEvent`) | `lib/statusView.ts`, `__tests__/status.test.tsx` |
| B-34 | Keine Portal-Links in der App | `__tests__/problem.test.tsx` (keine Web-Adresse im Code) |
| B-35 | Fall-Status, Mitteilungen, Abschlussfoto, Bewertung, „Problem besteht weiter“ | `__tests__/status.test.tsx` |
| B-36 | Tab „Fälle“ aus dem Store, Fallakte je Fall | `__tests__/casesProfile.test.tsx` |
| B-38 | Scan prüfen und ändern, manuelle Eingabe | `__tests__/devices.test.tsx` |
| B-39 | Onboarding mit Vertragsnummer oder Händler-Code | `__tests__/devices.test.tsx`, `__tests__/navigation.test.tsx` |
| B-40 | Profil mit Schutz, Weitergaben, Widerruf, Datenschutz. Nach einem Widerruf hält die Simulation an | `__tests__/casesProfile.test.tsx`, `__tests__/status.test.tsx`, `__tests__/regressions/datenschutz.test.tsx` (R-12) |
| B-42 | Alle Bedienteile mindestens 44 pt | `__tests__/a11y.test.tsx` |
| B-43 | Typo skaliert bis 200 %, Spalten stapeln sich | `__tests__/a11y.test.tsx`, Galerie |
| B-46 | Glossar aus Review Abschnitt 6 in `i18n/de.ts` | Durchsicht der Texte |
| B-47 | Demo-Modus per Konfiguration und Geste, Hinweise schließbar | `__tests__/demo.test.tsx` |
| B-48 | Werte in `demo.config.ts`, Ersparnis berechnet und „in diesem Fall“ | `__tests__/model/caseMachine.test.ts`, `__tests__/costs.test.tsx` |
| B-50 | Fall als modaler Stack, X öffnet das Schließen-Sheet | `__tests__/navigation.test.tsx` |
| B-51 | „Achtung“-Block vor dem Schritttext, „Wasserhahn ist zu“ bestätigen | `__tests__/guide.test.tsx` |
| B-53 (wieder offen, R-14) | Vorschau „Das geht an …“ vor der Schadenmeldung | `__tests__/costs.test.tsx` |
| B-54 | Eigene Worte gehen an den Reparatur-Assistenten, ohne Einwilligung als Notiz an die Fachkraft (Entscheidung 12) | `__tests__/problem.test.tsx`, `__tests__/chat.test.tsx` |

## P2

| ID | Stand |
|---|---|
| B-02 | erledigt: Gerätekarte führt ins Gerätedetail mit Abschnitt „Schutz“ |
| B-20 | erledigt: Videocall nur in der Aktionsleiste |
| B-30 | erledigt: Auswahlkarten mit Radio-Semantik und Häkchen |
| B-37 | erledigt: Leerzustand „Du entscheidest, wer ihn sieht.“ |
| B-41 | offen: Hinweis „Zuerst der Händler“ kommt mit Schritt 15 |
| B-44 | erledigt: Token `borderControl` mit mindestens 3 : 1, Test |
| B-45 | erledigt: Platzhalterfarbe nur in Eingabefeldern |
| B-49 | erledigt: Gerätestatus aus dem Fall |
| B-52 | erledigt: kleines Lucide-Set, im Designsystem vermerkt |
| B-55 | offen: kein eigener Offline-Zustand. Anleitungen laufen ohne Netz, weil alles lokal ist |
| B-56 | erledigt: M.-Nr. vom Typenschild getrennt von der Anleitungsquelle |

## Rückfälle aus der Code-Review vom 03.11.2026

Befunde: `docs/ZUKUNFTSPLAN.md` Anhang B. Jeder hat einen Test mit dem erwarteten Verhalten. Er ist als `test.failing` markiert, dazu kommt eine „Ausgangslage“ als normaler Test. Mit der Behebung wird `test.failing` im selben Commit zu `test`. Die Spalte „Behebung“ nennt den Schritt aus `docs/BUILD_PLAN.md` Abschnitt 8.2.

R-07, R-12, R-13, R-16 und R-17 brechen eine feste Regel. Solange einer davon offen ist, gibt es keinen Pitch-Tag. Seit den ersten Commits von Phase 1 sind alle fünf behoben (`node scripts/open-findings.js`).

| ID | Befund | Wieder offen | Stand | Behebung | Test |
|---|---|---|---|---|---|
| R-01 | „Fall abbrechen“ in `in_reparatur`, `erledigt` oder `abgebrochen` stürzt ab | B-04 | behoben | Schritt 22 | `__tests__/regressions/abstuerze.test.tsx` |
| R-02 | „Schadenfall melden“ nach der Meldung, mit verwaister Bestätigung | B-17 | behoben | Schritt 22 | `__tests__/regressions/abstuerze.test.tsx` |
| R-03 | „Neues Problem melden“ bei einem Fall in `in_reparatur` stürzt ab | – | behoben | Schritt 23 | `__tests__/regressions/abstuerze.test.tsx` |
| R-04 | Zwei offene Fälle über „Passt nicht“ (Nr. 13) | – | behoben | Schritt 23 | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-05 | Zwei offene Fälle über eine Pflege-Zeile im Gerätedetail (Nr. 13) | – | behoben | Schritt 23 | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-06 | Fortschritt der Anleitung verloren über „Details → Anleitung starten“, Stift lässt eine Anleitung offen | B-05 | behoben | Schritt 23 | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-07 | „Du zahlst 189 €“ während der Prüfung durch den Versicherer | B-18 | behoben | Schritt 22 (vorgezogen) | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-08 | Zweite Buchung macht einen Selbstzahler-Fall unvollendbar | – | behoben | Schritt 22 (Kosten fragen `can`), Store-Regel in Schritt 25 | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-09 | Termin ignoriert die Ablehnung des Schadenfalls | – | behoben | Schritt 22 | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-10 | Befund nach Vor-Ort-Diagnose dem falschen Betrieb zugeschrieben | – | offen | Schritt 25 | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-11 | Grenze von 40 Nachrichten im Chat fehlt | – | offen | Schritt 25 | `__tests__/regressions/fehlverhalten.test.tsx` |
| R-12 | Widerruf einer Weitergabe nach lit. b ohne Wirkung | B-40 | behoben | Schritt 26 (vorgezogen) | `__tests__/regressions/datenschutz.test.tsx` |
| R-13 | Mitteilungen ohne gespeicherte Einwilligung | – | behoben | Schritt 26 (vorgezogen) | `__tests__/regressions/datenschutz.test.tsx` |
| R-14 | Vorschau „Das geht an …“ zeigt mehr als die bestätigten Kategorien | B-53 | offen | Schritt 26 | `__tests__/regressions/datenschutz.test.tsx` |
| R-15 | Chat-Einwilligung mit `caseId`, andere Fallakten zeigen nichts | – | offen | Schritt 26 | `__tests__/regressions/datenschutz.test.tsx` |
| R-16 | Rückruf ohne Bestätigung | B-19, B-23 | behoben | Schritt 26 (vorgezogen) | `__tests__/regressions/datenschutz.test.tsx` |
| R-17 | Mitteilungstexte mit Falldetails auf dem Sperrbildschirm | – | behoben | Schritt 26 (vorgezogen) | `__tests__/regressions/datenschutz.test.tsx` |
| R-18 | Termin mit unbekannter Fallnummer per Deep Link stürzt ab | – | offen | Schritt 24 | `__tests__/regressions/abstuerze.test.tsx` |
