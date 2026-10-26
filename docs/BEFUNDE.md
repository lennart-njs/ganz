# Abgleich der Befunde aus dem Review

Stand: 26.10.2026 · nach Schritt 14 · Befunde: `docs/REVIEW.md` Abschnitt 2

Alle P0- und P1-Befunde sind behoben. Die Spalte „Nachweis“ nennt den Test, der das Verhalten prüft, oder die Stelle im Code.

## P0

| ID | Behoben durch | Nachweis |
|---|---|---|
| B-03 | Store mit Speicherung auf dem Gerät, Karte „Offener Fall“ | `__tests__/store.test.ts`, `__tests__/guide.test.tsx` (Neustart in Schritt 4) |
| B-05 | Zurück, Wischgeste und Android-Zurück gehen in der Anleitung einen Schritt zurück | `__tests__/guide.test.tsx` |
| B-06 | „Geht nicht“ in jedem Schritt, Abbruchschritt im `GuideRun` | `__tests__/guide.test.tsx` |
| B-11 | Regel-Mock je Modus, Typenschild ohne Diagnose | `__tests__/diagnosis.test.tsx` |
| B-12 | Sicherheit in drei Stufen, Rückfrage bei „unsicher“, „Passt nicht“ | `__tests__/diagnosis.test.tsx` |
| B-17 | Schadenfall nur durch „Schadenfall melden“ mit gespeicherter Bestätigung | `__tests__/caseMachine.test.ts`, `__tests__/costs.test.tsx` |
| B-18 | „Die Kosten prüft … nach dem Befund“ statt Zusage | `__tests__/help.test.tsx`, Test „Kein Text sagt Kosten zu“ |
| B-19 | Hinweis „Das sieht … (Betrieb)“, Bestätigung vor dem Call, kein Call ohne Bestätigung | `__tests__/help.test.tsx` |
| B-27 | „vorbehaltlich Freigabe“, `freigabe_noetig` nach der Meldung | `__tests__/costs.test.tsx` |
| B-29 | Zusammenfassung mit Adresse, „Termin anfragen“ oder „Zahlungspflichtig buchen“ | `__tests__/costs.test.tsx` |

## P1

| ID | Behoben durch | Nachweis |
|---|---|---|
| B-01 | Gerätekarte öffnet das Gerätedetail, Suchpille „Problem melden“ | `app/(tabs)/index.tsx`, `app/geraet/[id].tsx` |
| B-04 | X im Fall: „Später weitermachen“ oder „Fall abbrechen“ mit Grund | `__tests__/navigation.test.tsx` |
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
| B-23 | Warteraum, Wartezeit, „keine Fachkraft frei“ mit Rückruf | `__tests__/help.test.tsx` |
| B-24 | Mikrofon und Kamera als Umschalter mit Zustand | `__tests__/help.test.tsx` |
| B-25 | „Keine Aufnahme“ vor und im Call, Screenshots nur mit Einwilligung | `__tests__/help.test.tsx` |
| B-26 | Befund mit „Im Call gelöst“, Reparatur, Ersatzgerät | `__tests__/help.test.tsx` |
| B-28 | Pumpe bestellt und baut der Betrieb ein, Store sperrt den Versand an den Haushalt | `__tests__/costs.test.tsx` |
| B-31 | Direktweg heißt „Vor-Ort-Diagnose“, Texte aus dem Fall | `__tests__/costs.test.tsx` |
| B-32 | „Termin anfragen“, Bestätigung durch den Betrieb im Status | `__tests__/costs.test.tsx`, `__tests__/status.test.tsx` |
| B-33 | Status aus einer Quelle (`Case`, `CaseEvent`) | `lib/statusView.ts`, `__tests__/status.test.tsx` |
| B-34 | Keine Portal-Links in der App | `__tests__/problem.test.tsx` (keine Web-Adresse im Code) |
| B-35 | Fall-Status, Mitteilungen, Abschlussfoto, Bewertung, „Problem besteht weiter“ | `__tests__/status.test.tsx` |
| B-36 | Tab „Fälle“ aus dem Store, Fallakte je Fall | `__tests__/casesProfile.test.tsx` |
| B-38 | Scan prüfen und ändern, manuelle Eingabe | `__tests__/devices.test.tsx` |
| B-39 | Onboarding mit Vertragsnummer oder Händler-Code | `__tests__/devices.test.tsx`, `__tests__/navigation.test.tsx` |
| B-40 | Profil mit Schutz, Weitergaben, Widerruf, Datenschutz | `__tests__/casesProfile.test.tsx` |
| B-42 | Alle Bedienteile mindestens 44 pt | `__tests__/a11y.test.tsx` |
| B-43 | Typo skaliert bis 200 %, Spalten stapeln sich | `__tests__/a11y.test.tsx`, Galerie |
| B-46 | Glossar aus Review Abschnitt 6 in `i18n/de.ts` | Durchsicht der Texte |
| B-47 | Demo-Modus per Konfiguration und Geste, Hinweise schließbar | `__tests__/demo.test.tsx` |
| B-48 | Werte in `demo.config.ts`, Ersparnis berechnet und „in diesem Fall“ | `__tests__/caseMachine.test.ts`, `__tests__/costs.test.tsx` |
| B-50 | Fall als modaler Stack, X öffnet das Schließen-Sheet | `__tests__/navigation.test.tsx` |
| B-51 | „Achtung“-Block vor dem Schritttext, „Wasserhahn ist zu“ bestätigen | `__tests__/guide.test.tsx` |
| B-53 | Vorschau „Das geht an …“ vor der Schadenmeldung | `__tests__/costs.test.tsx` |
| B-54 | „Etwas anderes“ mit Freitext, dann „Hilfe holen“ | `__tests__/problem.test.tsx` |

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
