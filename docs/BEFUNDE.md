# Abgleich der Befunde aus dem Review

Stand: 03.11.2026 · nach Schritt 28 (Abschluss Phase 1) · Befunde: `docs/REVIEW.md` Abschnitt 2, `docs/ZUKUNFTSPLAN.md` Anhang B und die Review zu Phase 1 vom 03.11.2026 (Abschnitt unten)

Nach Schritt 14 waren alle P0- und P1-Befunde behoben. Die Code-Review vom 03.11.2026 hat acht davon wieder geöffnet: B-04, B-05, B-17, B-18, B-19, B-23, B-40 und B-53. Sie waren offen, bis die Rückfälle R-01 bis R-18 behoben waren (Abschnitt „Rückfälle“ unten). Seit Schritt 26 sind alle 18 Rückfälle behoben und alle acht wieder behoben: B-04 (R-01), B-05 (R-06), B-17 (R-02), B-18 (R-07), B-40 (R-12), B-53 (R-14) sowie B-19 und B-23 (R-16). Alle anderen P0- und P1-Befunde bleiben behoben. Die Spalte „Nachweis“ nennt den Test, der das Verhalten prüft, oder die Stelle im Code.

## P0

| ID | Behoben durch | Nachweis |
|---|---|---|
| B-03 | Store mit Speicherung auf dem Gerät, Karte „Offener Fall“ | `__tests__/store.test.ts`, `__tests__/guide.test.tsx` (Neustart in Schritt 4) |
| B-05 | Zurück, Wischgeste und Android-Zurück gehen in der Anleitung einen Schritt zurück. Ein neuer Einstieg setzt eine laufende Anleitung fort | `__tests__/guide.test.tsx`, `__tests__/diagnosis.test.tsx`, `__tests__/regressions/fehlverhalten.test.tsx` (R-06) |
| B-06 | „Geht nicht“ in jedem Schritt, Abbruchschritt im `GuideRun` | `__tests__/guide.test.tsx` |
| B-11 | Regel-Mock je Modus, Typenschild ohne Diagnose | `__tests__/diagnosis.test.tsx` |
| B-12 | Sicherheit in drei Stufen, Rückfrage bei „unsicher“, „Passt nicht“ | `__tests__/diagnosis.test.tsx` |
| B-17 | Schadenfall nur durch „Schadenfall melden“ mit gespeicherter Bestätigung, genau einmal je Fall | `__tests__/model/caseMachine.test.ts`, `__tests__/costs.test.tsx`, `__tests__/regressions/abstuerze.test.tsx` (R-02) |
| B-18 | „Die Kosten prüft … nach dem Befund“ statt Zusage. Während der Prüfung kein Selbstzahlen und kein „Du zahlst“, die Selbstbeteiligung nur „falls Kranich freigibt“ | `__tests__/help.test.tsx`, Test „Kein Text sagt Kosten zu“, `__tests__/regressions/fehlverhalten.test.tsx` (R-07) |
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
| B-53 | Vorschau „Das geht an …“ vor der Schadenmeldung. Vorschau und Bestätigung nutzen dasselbe Array aus `model/policies/consentScopes.ts` | `__tests__/costs.test.tsx`, `__tests__/consentScopes.test.tsx`, `__tests__/regressions/datenschutz.test.tsx` (R-14) |
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
| B-55 | offen: kein eigener Offline-Zustand. Anleitungen laufen ohne Netz, weil alles lokal ist. Der Reparatur-Assistent bietet ohne Netz „Noch einmal senden“ und „Als Notiz für die Fachkraft speichern“ (Schritt 26, `__tests__/chat.test.tsx`) |
| B-56 | erledigt: M.-Nr. vom Typenschild getrennt von der Anleitungsquelle |

## Rückfälle aus der Code-Review vom 03.11.2026

Befunde: `docs/ZUKUNFTSPLAN.md` Anhang B. Jeder hat einen Test mit dem erwarteten Verhalten, dazu eine „Ausgangslage“ als normaler Test, die nur den Aufbau prüft. Bis zur Behebung war der Test `test.failing`, mit der Behebung wurde er im selben Commit zu `test`. Die Spalte „Behebung“ nennt den Schritt aus `docs/BUILD_PLAN.md` Abschnitt 8.2, die Spalte „Test“ Datei und Namen des Tests zum Befund.

R-07, R-12, R-13, R-16 und R-17 brechen eine feste Regel. Solange einer davon offen ist, gibt es keinen Pitch-Tag. Seit Schritt 26 sind alle 18 behoben. In `__tests__/` steht kein `test.failing` mehr, auch kein `skip` oder `only` in `__tests__/regressions/`. `node scripts/open-findings.js R-01 … R-18` meldet „Keiner offen“, `__tests__/openFindings.test.ts` prüft das bei jedem Lauf.

| ID | Befund | Wieder offen | Stand | Behebung | Test |
|---|---|---|---|---|---|
| R-01 | „Fall abbrechen“ in `in_reparatur`, `erledigt` oder `abgebrochen` stürzt ab | B-04 | behoben | Schritt 22, Test in Schritt 28 geschärft | `regressions/abstuerze.test.tsx`: „R-01 „Fall abbrechen“ steht nur da, wo der Fall abbrechbar ist, und wirft nie“ |
| R-02 | „Schadenfall melden“ nach der Meldung, mit verwaister Bestätigung | B-17 | behoben | Schritt 22 | `regressions/abstuerze.test.tsx`: „R-02 nach der Meldung kein zweites Melden und keine zweite Bestätigung“ |
| R-03 | „Neues Problem melden“ bei einem Fall in `in_reparatur` stürzt ab | – | behoben | Schritt 23 | `regressions/abstuerze.test.tsx`: „R-03 ein Fall, der sich nicht abbrechen lässt, bietet nur „Weitermachen““ |
| R-04 | Zwei offene Fälle über „Passt nicht“ (Nr. 13) | – | behoben | Schritt 23 | `regressions/fehlverhalten.test.tsx`: „R-04 „Passt nicht“ und ein anderes Symptom: höchstens ein offener Fall je Gerät“ |
| R-05 | Zwei offene Fälle über eine Pflege-Zeile im Gerätedetail (Nr. 13) | – | behoben | Schritt 23 | `regressions/fehlverhalten.test.tsx`: „R-05 Pflege bei laufendem Fall: höchstens ein offener Fall, Frage „Weitermachen““ |
| R-06 | Fortschritt der Anleitung verloren über „Details → Anleitung starten“, Stift lässt eine Anleitung offen | B-05 | behoben | Schritt 23 | `regressions/fehlverhalten.test.tsx`: „R-06 eine laufende Anleitung geht weiter, nie zwei offene Anleitungen“ |
| R-07 | „Du zahlst 189 €“ während der Prüfung durch den Versicherer | B-18 | behoben | Schritt 22 (vorgezogen), Selbstbeteiligung mit Bedingung in Schritt 28 | `regressions/fehlverhalten.test.tsx`: „R-07 während der Prüfung kein Selbstzahlen und kein „Du zahlst““, „R-07 mit Selbstbeteiligung: der Betrag nur unter der Bedingung der Freigabe“ |
| R-08 | Zweite Buchung macht einen Selbstzahler-Fall unvollendbar | – | behoben | Schritt 22 (Kosten fragen `can`) und 25 (`bookingRules` im Store) | `regressions/fehlverhalten.test.tsx`: „R-08 höchstens ein laufender Termin je Art“, „R-08 auch der Store bucht keinen zweiten Termin derselben Art“ |
| R-09 | Termin ignoriert die Ablehnung des Schadenfalls | – | behoben | Schritt 22 | `regressions/fehlverhalten.test.tsx`: „R-09 nach der Ablehnung kein Termin auf Kosten des Versicherers“ |
| R-10 | Befund nach Vor-Ort-Diagnose dem falschen Betrieb zugeschrieben | – | behoben | Schritt 25 | `regressions/fehlverhalten.test.tsx`: „R-10 Befund und Kostenvoranschlag kommen vom gebuchten Betrieb“ |
| R-11 | Grenze von 40 Nachrichten im Chat fehlt | – | behoben | Schritt 25 | `regressions/fehlverhalten.test.tsx`: „R-11 nach 40 Nachrichten verweist das Gespräch auf die Fachkraft, Senden ist aus“ |
| R-12 | Widerruf einer Weitergabe nach lit. b ohne Wirkung | B-40 | behoben | Schritt 26 (vorgezogen), ohne Sackgasse in Schritt 28 | `regressions/datenschutz.test.tsx`: „R-12 nach dem Widerruf entscheidet der Versicherer nicht weiter“. Dazu `store.test.ts`, describe „Widerruf in der Reparatur: keine Sackgasse (R-12)“ |
| R-13 | Mitteilungen ohne gespeicherte Einwilligung | – | behoben | Schritt 26 (vorgezogen), Text aus dem Termin in Schritt 28 | `regressions/datenschutz.test.tsx`: „R-13 Erlauben speichert eine Einwilligung, Ausschalten widerruft sie“ |
| R-14 | Vorschau „Das geht an …“ zeigt mehr als die bestätigten Kategorien | B-53 | behoben | Schritt 26 | `regressions/datenschutz.test.tsx`: „R-14 die Vorschau zeigt nur Kategorien, die die Bestätigung speichert“. Dazu `consentScopes.test.tsx` je Zweck |
| R-15 | Chat-Einwilligung mit `caseId`, andere Fallakten zeigen nichts | – | behoben | Schritt 26 | `regressions/datenschutz.test.tsx`: „R-15 Einwilligung ohne Fall, jede Fallakte mit Nachrichten zeigt sie“. Dazu `chat.test.tsx`, describe „Einwilligung ohne Fall (R-15)“ |
| R-16 | Rückruf ohne Bestätigung | B-19, B-23 | behoben | Schritt 26 (vorgezogen) | `regressions/datenschutz.test.tsx`: „R-16 ohne gültige Bestätigung kein Rückruf, auch nicht im Store“ |
| R-17 | Mitteilungstexte mit Falldetails auf dem Sperrbildschirm | – | behoben | Schritt 26 (vorgezogen) | `regressions/datenschutz.test.tsx`: „R-17 Mitteilungen sind neutral: kein Gerät, Betrag, Betrieb, Entscheidung, Fall“ |
| R-18 | Termin mit unbekannter Fallnummer per Deep Link stürzt ab | – | behoben | Schritt 24 | `regressions/abstuerze.test.tsx`: „R-18 statt des Formulars ein Hinweis, kein Absturz“ |

Alle Pfade in der Spalte „Test“ liegen unter `__tests__/`.

## Weitere Befunde aus der Code-Review

Kleinere Befunde aus `docs/ZUKUNFTSPLAN.md` Anhang B, ohne eigene R-Nummer.

| Befund | Stand | Behebung | Test |
|---|---|---|---|
| Unvalidierte Felder in der Chat-Route | behoben: zod-Schema mit Katalog-Schlüsseln, Höchstlängen und ohne unbekannte Felder (400). Der Systemblock entsteht nur aus Schlüsseln, Freitext geht nur als Nachricht des Haushalts. Dazu Pitch-Token (401), Rate-Limit und Tagesgrenze (429), Logs ohne Inhalte | Schritt 27 | `__tests__/chatApi.test.ts`, `__tests__/chat.test.tsx` |
| Doppeltaps | behoben: `hooks/useCommand.ts` sperrt für die Dauer des Befehls plus 800 ms, eine Ablehnung bekommt einen ruhigen Satz | Schritt 24 | `__tests__/command.test.tsx`: „ein Doppeltap führt den Befehl einmal aus, nach der Sperre wieder“, describe „Buttons, die nur einmal zählen“ |
| Hänger beim Laden des Speichers | behoben: Fehlerpfad beim Laden, Sicherung des Rohwerts, Hinweis zum Wiederherstellen | Schritt 19 | `__tests__/persistence.test.ts`, describe „Speicher laden“, `__tests__/recovery.test.tsx` |
| `tel:`-Links ohne Fehlerbehandlung | behoben: `lib/linking.ts` liefert `false` statt zu werfen, dann steht die Nummer im Hinweis | Schritt 24 | `__tests__/linking.test.tsx`, describe „Telefon-App“ |
| Mitteilungs-Schalter im Web | behoben: ohne Einstellungen des Telefons ein ruhiger Hinweis | Schritt 24 | `__tests__/linking.test.tsx`: „Profil: Mitteilungen ausgeschaltet und keine Einstellungen, dann ein ruhiger Hinweis“ |
| Vor-Ort-Diagnose ohne Preis und Zahler | behoben: Den Besuch zahlt der Haushalt, die Zusammenfassung sagt das ohne Betrag, der Betrieb nennt den Preis vorher. Der Button bleibt „Termin anfragen“, offen als Rechtsfrage Nr. 34 | Schritt 25, Kommentar in Schritt 28 | `__tests__/costs.test.tsx`, describe „Vor-Ort-Diagnose: wer den Besuch zahlt“, `__tests__/model/policies/payer.test.ts` |
| Zweig „Ersatzgerät“ ohne Rechtshinweis (heute nicht erreichbar) | offen | Phase 3b | – |

## Review zu Phase 1 vom 03.11.2026 (Nr. 0 bis 13)

Eine zweite Review nach Schritt 29 fand 14 Befunde in der Umsetzung von Phase 1. Schritt 28 hat jeden geprüft. Alle waren echt. Die Annahmen dazu stehen in `docs/ANNAHMEN.md` unter „Schritt 28“.

| Nr. | Schwere | Befund | Wie behandelt | Commit | Test |
|---|---|---|---|---|---|
| 0 | hoch | R-12: Nach einem Widerruf in `in_reparatur` blieb der Fall für immer stehen, und das Gerät war für neue Fälle gesperrt | behoben: Aktion `weitergabe_erneuern`, im Gespräch „Weitergabe erneut bestätigen“ mit demselben Text, Empfänger und Umfang. Abbrechen in der Reparatur bleibt aus (R-01), das klärt Entscheidung Nr. 16 | 28a | `store.test.ts`, describe „Widerruf in der Reparatur: keine Sackgasse (R-12)“, `model/policies/actions.test.ts`, describe „Nach einem Widerruf (R-12)“, `status.test.tsx`: „in der Reparatur: kein Abbruch, aber erneut bestätigen, dann kommt der Betrieb“, Fuzz-Test |
| 1 | mittel | Status zeigte einen erledigten Fall als „Abgebrochen.“, wenn das Gerät schon einen neuen Fall hat | behoben: Tatsache `closedAs` statt der Regel `problem_besteht_weiter` | 28b | `status.test.tsx`: „erledigt bleibt erledigt, auch wenn für das Gerät schon ein neuer Fall offen ist“ |
| 2 | mittel | Nach „Passt nicht“ blieb das abgelehnte Ergebnis im Fall und ging an Assistent, Fachkraft und Versicherer | behoben: `discardedAt` am Ergebnis, `latestDiagnosis` überspringt es | 28c | `diagnosis.test.tsx`, describe „„Passt nicht“ verwirft das Ergebnis“ |
| 3 | mittel | Text- und Status-Regel im Lint übersahen Text außerhalb von JSX und Vergleiche über Namen | behoben: Textregel für jeden String in `app/`, `components/`, `hooks/`, Status-Regel auch für `status` und `{ status }` | 28d | `lint.test.ts`, describe „Text außerhalb von JSX“ |
| 4 | mittel | Die Einwilligung in Mitteilungen aus dem Termin stempelte den Text des Profils, den man dort nie sah | behoben: eigener Satz vor „Termin anfragen“ (`mitteilungen_termin`), die Einwilligung speichert ihn | 28e | `consentScopes.test.tsx`, Zweck `mitteilungen`: „Termin: der Satz vor dem Systemdialog ist der gespeicherte Text, nicht der im Profil“ |
| 5 | mittel | Der R-01-Test duldete „Fall abbrechen“ in der Reparatur und im abgebrochenen Fall | behoben: Der Test prüft die Buttons in jedem Status | 28f | `regressions/abstuerze.test.tsx` (R-01) |
| 6 | niedrig | Die Fallakte zählte auch Nachrichten als weitergegeben, die nie beim Anbieter ankamen | behoben: `ChatMessage.forwarded`, ohne Netz und bei Ablehnung der eigenen Route zählt die Nachricht nicht | 28j | `chat.test.tsx`: „die Fallakte zählt nur Nachrichten, die beim Anbieter ankommen konnten“ |
| 7 | niedrig | Mit Selbstbeteiligung über 0 € stand während der Prüfung „Zahlungspflichtig buchen“, der Bericht sagte das Gegenteil | teilweise: Die Selbstbeteiligung steht nur noch „falls Kranich freigibt“. Der Button bleibt nach Entscheidung Nr. 4. Eine unverbindliche Anfrage mit eigenem Schritt nach der Freigabe ist offen für Lennart (Rechtsfrage Nr. 46) | 28k | `regressions/fehlverhalten.test.tsx`: „R-07 mit Selbstbeteiligung: der Betrag nur unter der Bedingung der Freigabe“, `costs.test.tsx`: „bei Selbstbeteiligung über 0 € heißt der Button „Zahlungspflichtig buchen““ |
| 8 | niedrig | Vor-Ort-Diagnose: „Den Besuch zahlst du selbst“, aber der Button heißt „Termin anfragen“, gegen den Kommentar in `termin.tsx` | Dokumentation: Der Kommentar nennt die echte Regel, Rechtsfrage Nr. 34 nennt die Vor-Ort-Diagnose. „Zahlungspflichtig buchen“ ohne Preis ist nicht gebaut, das entscheidet der Anwalt | 28k | `costs.test.tsx`, describe „Vor-Ort-Diagnose: wer den Besuch zahlt“ |
| 9 | niedrig | CI: Prüfsumme aus demselben Release, Actions nur mit Tag, Dateinamen ungeprüft, Scanner nie gelaufen | behoben: Actions auf Commit-SHA, SHA-256 fest im Workflow, Dateien geladen und geprüft. gitleaks lief, drei Fehlalarme in `.gitleaksignore`. osv-scanner lief nur offline, api.osv.dev ist gesperrt. Ein Lauf auf GitHub fehlt (Nr. 15) | 28l | Lauf von Hand, siehe `docs/ANNAHMEN.md` Schritt 28 |
| 10 | niedrig | Das Pitch-Gate hielt einen Test in `describe.skip` für aktiv | behoben: Jedes `skip`, `only`, `todo`, `xit` oder `fit` in `__tests__/regressions/` macht alle Befunde offen | 28h, Test in 28o | `openFindings.test.ts`, describe „Pitch-Gate“ |
| 11 | niedrig | Das Jest-Projekt `unit` lief auch `__tests__/build/`, gegen Plan und README | behoben: eigenes Projekt `build` | 28m | `npx jest --listTests --selectProjects unit` zeigt nur `__tests__/model/` |
| 12 | niedrig | README nannte das Verhalten von `eas update` als Tatsache | behoben: steht als ungeprüft da, mit den übrigen Punkten zu Expo und EAS | 28n | – |
| 13 | niedrig | Die Installations-ID überlebte „Alles zurücksetzen“, „Zurücksetzen“ nach einem Ladefehler und den Widerruf | behoben: `deleteInstallationId` in allen drei Wegen und beim Demo-Startstand | 28i | `chat.test.tsx`: „Alles zurücksetzen, der Demo-Startstand und der Widerruf löschen die Installations-ID“, `recovery.test.tsx`: „Zurücksetzen löscht auch die Installations-ID für den Assistenten“ |

Dazu Schritt 28g ohne eigene Nummer: `npm run lint` läuft mit `--max-warnings 0` (`lint.test.ts`, describe „Abschluss Phase 1: keine Warnung (Schritt 28)“).
