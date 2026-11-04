# Rechtsfragen und ungeprüfte Annahmen

Stand: 04.11.2026 · Startbestand aus `docs/ZUKUNFTSPLAN.md` Abschnitt 10, Nr. 46 aus Schritt 28, Nr. 47 aus seiner Gegenprüfung, Nr. 48 bis 50 aus den Entscheidungen Nr. 31 und Nr. 33, Nr. 51 aus Nr. 34, Nr. 52 und 53 aus Nr. 32

Diese Liste geht an Anwalt und Datenschutzbeauftragte (DSB). Den ersten Termin mit beiden buchst du für Woche 2 (KW 46). Danach gibt es feste Termine im Monat. Bis eine Antwort da ist, baut ihr die strengere Variante (ZUKUNFTSPLAN Grundsatz 5). Die Antwort kann dann nur lockern.

Aussagen „laut Recherche“ stammen aus einer Web-Recherche vom 03.11.2026 mit Sekundärquellen. Sie sind vor der Umsetzung im Original zu prüfen.

**Kennzeichnung**

- **RA:** Rechtsfrage für Anwalt oder DSB, bevor sie umgesetzt wird.
- **Technik:** vor der Umsetzung gegen die aktuelle Doku prüfen. Das macht ihr selbst.
- **Wortlaut:** App-Store-Richtlinie im aktuellen Wortlaut prüfen. Bei Zweifeln mit dem Anwalt.

**Fristen**

Die Frist nennt die Phase oder das Gate, vor dem die Antwort da sein muss. Phasen und Gates stehen in `docs/ZUKUNFTSPLAN.md` Abschnitt 0 und 4.

| Frist | Zeitraum laut Plan |
|---|---|
| Phase 0 | Woche 1, KW 45 |
| vor Phase 2 | vor Woche 4, KW 48 |
| vor Phase 3a | vor KW 50 |
| vor Phase 3b | im Lauf von Phase 3, vor der Arbeit an Mandant und Kategorien |
| vor Phase 4 | vor KW 3/2027 |
| vor Gate externe Tests | Ende Phase 4, etwa KW 8/2027 |
| vor Phase 5 | mit dem LOI, ab etwa März 2027 |
| vor Phase 6 | ab etwa Juni 2027 |
| vor Pilot-Gate | vor dem ersten echten Fall, mit dem Pilotvertrag |

**Status:** offen, gestellt, entschieden, beantwortet, umgesetzt. „Entschieden (Nr. X), Prüfung RA offen“ heißt: Lennart hat in `docs/ENTSCHEIDUNGEN.md` entschieden, die App setzt das um, der Anwalt prüft noch. Bei „beantwortet“ stehen Datum und Quelle in der Spalte „Antwort“. Die Antwort selbst kommt als eigene Datei in `docs/recht/`.

## Technik

| Nr. | Frage | Kennzeichnung | Frist | Status | Antwort |
|---|---|---|---|---|---|
| 1 | Ist claude-opus-5-5 auf Vertex AI eu oder auf Bedrock in einer EU-Region verfügbar, mit Structured Outputs und Prompt-Caching? Was kostet es dort? (Nr. 18, Nr. 28) | Technik | vor Gate externe Tests | offen | – |
| 2 | AVV-Bedingungen, Aufbewahrung, Ausschluss von Training, DPF-Zertifizierung und Unterauftragnehmer des Anbieters der Anthropic-API | Technik | vor Phase 2 | offen | – |
| 3 | Läuft die Route mit `web.output: server` per `expo export` stabil auf einem Node-Host ohne EAS? Die Adapter sind vorhanden, getestet ist es nicht. | Technik | vor Phase 2 | offen | – |
| 4 | Wie verhält sich `eas update` mit `--environment` und EAS-Umgebungsvariablen? | Technik | vor Phase 2 | offen | – |
| 5 | Läuft fast-check ohne Anpassung unter Jest 30 mit jest-expo? zod 4 läuft dort ohne Anpassung (Schritt 19, `docs/ANNAHMEN.md`). | Technik | vor Schritt 24 (Phase 1) | offen | – |
| 6 | Sentry mit EU-Region unter Expo SDK 58 und RN 0.88 (Nr. 20) | Technik | vor Phase 4 | offen | – |
| 7 | Welche Dienste eines EU-Hosters fallen unter ein BSI-C5-Testat? (Nr. 18) | Technik | vor Phase 5 | offen | – |
| 8 | Was kostet ein externer Pen-Test für App und API? Geschätzt 8.000 bis 15.000 Euro. | Technik | vor Phase 5 | offen | – |

## Datenschutz

| Nr. | Frage | Kennzeichnung | Frist | Status | Antwort |
|---|---|---|---|---|---|
| 9 | Welche Rolle hat ganz nach DSGVO gegenüber Versicherer und Betrieb: getrennte Verantwortliche, Art. 26 oder Art. 28? (Nr. 22) | RA | Hypothese vor Phase 3a, Bestätigung vor Phase 5 | offen | – |
| 10 | Widerruf bei lit. b: Was bewirkt er, und was bleibt beim Empfänger? (Nr. 16) | RA | vor Phase 3a | offen | – |
| 11 | Transfermechanismus für die Anthropic-API: SCC mit Transfer-Folgenabschätzung oder DPF? `inference_geo` global oder us? | RA | vor Phase 2 | offen | – |
| 12 | DSFA-Pflicht für den Assistenten (DSK-Muss-Liste) und förmliche Benennung der DSB (§ 38 BDSG) | RA | vor Gate externe Tests | offen | – |
| 13 | Art. 22 DSGVO bei regelbasierten Freigaben des Versicherers (EuGH C-634/21, § 37 BDSG) | RA | vor Phase 5 | offen | – |
| 14 | § 25 TDDDG für jeden Zugriff auf das Gerät: Installations-ID, Push-Token, Speicherstand, Crash-Reporting (Nr. 20) | RA | vor Phase 4 | offen | – |
| 15 | Art. 8 DSGVO: Mindestalter für Einwilligungen | RA | vor Gate externe Tests | offen | – |
| 16 | Rechtsgrundlagen neben lit. a und b: lit. c und lit. f für Rate-Limit mit IP, `audit_log`, Server-Logs und Consent-Nachweise | RA | vor Phase 2 | offen | – |
| 17 | Hersteller-Aggregate: Zweck, Rechtsgrundlage, Art. 6 Abs. 4, Anonymität (Nr. 29) | RA | vor Phase 6 | offen | – |
| 18 | Löschfristen (Nr. 25), Löschung bei einer Hash-Kette, Ausnahmen nach Art. 17 Abs. 3 | RA | Hash-Kette vor Phase 3a, Löschfristen als Entwurf vor Gate externe Tests | offen | – |
| 19 | Mehrere Verantwortliche: Wer beantwortet Auskunft und Löschung? Mitteilung an Empfänger nach Art. 19 | RA | vor Phase 5 | offen | – |

## KI-VO

| Nr. | Frage | Kennzeichnung | Frist | Status | Antwort |
|---|---|---|---|---|---|
| 20 | Art. 50 Abs. 1 gilt laut Recherche seit dem 02.08.2026. Der Digital Omnibus (laut Recherche VO (EU) 2026/1744) hat ihn nicht verschoben. Wortlaut im Amtsblatt prüfen. | RA | vor Gate externe Tests | offen | – |
| 21 | Ist ganz Anbieter oder Betreiber? | RA | vor Gate externe Tests | offen | – |
| 22 | Genügt als Hinweis „Computerprogramm, kein Mensch“? Wie lautet der Pflichtsatz? (Nr. 19) | RA | vor Gate externe Tests | offen | – |
| 23 | Art. 50 Abs. 2: Was verlangt die Kennzeichnung für jede Antwort, für die Fallakte und für den Export? | RA | vor Gate externe Tests | offen | – |

## Versicherung und Finanzaufsicht

| Nr. | Frage | Kennzeichnung | Frist | Status | Antwort |
|---|---|---|---|---|---|
| 24 | § 30 VVG: Gilt die Meldung über ganz schon als Anzeige? Ist ganz Empfangsbote des Versicherers? Welche Form verlangen die AVB? Ab wann darf die App „gemeldet“ zeigen? | RA | vor Phase 3a | offen | – |
| 25 | DORA: Ist ganz IKT-Drittdienstleister mit Klauseln nach Art. 30 Abs. 2, bei kritischen oder wichtigen Funktionen auch nach Abs. 3? Wie ist das Informationsregister mit LEI zu füllen? | RA | vor Pilot-Gate | offen | – |
| 26 | § 32 VAG: Ist die Bearbeitung von Schadenfällen von Hand im Concierge-Piloten eine Ausgliederung? (Nr. 23) | RA | vor Pilot-Gate | offen | – |
| 27 | § 34d GewO: Ist ganz Vermittler? | RA | vor Phase 5 | offen | – |

## Verbraucher, Marktplatz, Reparatur

| Nr. | Frage | Kennzeichnung | Frist | Status | Antwort |
|---|---|---|---|---|---|
| 28 | Recht auf Reparatur: §§ 479a ff. BGB gelten laut Recherche seit dem 23.07.2026. Fundstelle im Original prüfen. | RA | vor Phase 3a | offen | – |
| 29 | Pflichten nach § 479b BGB, mit Entgelt und der Verlängerung der Gewährleistung | RA | vor Phase 3a | offen | – |
| 30 | Welche Felder braucht das Recht auf Reparatur in Ereignisse v2? | RA | vor Phase 3a | offen | – |
| 31 | Das Europäische Formular für Reparaturinformationen stellt laut Recherche freiwillig der Reparaturbetrieb aus (Art. 245 EGBGB). Stimmt das, und was folgt daraus für ganz? | RA | vor Phase 6 | offen | – |
| 32 | Ökodesign: Frist von 15 Arbeitstagen für Ersatzteile gegen EUR-Lex prüfen (REVIEW 4.1). Die App zeigt den Wert heute schon (`ecoDesignDeliveryDays` in `config/demo.config.ts`). | RA | vor Gate externe Tests | offen | – |
| 33 | Marktplatz: Pflichten von ganz als Vermittler (§ 312l BGB mit Art. 246d EGBGB), P2B-Verordnung (EU) 2019/1150, § 5b UWG zur Reihenfolge der Betriebe. Ab welcher Größe gelten Art. 30 bis 32 DSA? | RA | vor Phase 6 | offen | – |
| 34 | Selbstzahler: Button-Lösung nach § 312j Abs. 3 BGB und Widerrufsrecht im Namen des Fachbetriebs (Nr. 27). Dazu die Vor-Ort-Diagnose ohne festen Preis: Die App fragt sie mit „Termin anfragen“ an, und der Betrieb nennt den Preis vor dem Termin. Reicht das? Wo muss dann der Schritt mit „Zahlungspflichtig buchen“ kommen? | RA | vor Phase 6 | entschieden (Nr. 33), Prüfung RA offen | Vor-Ort-Diagnose: Nr. 33 vom 04.11.2026, umgesetzt (`docs/ANNAHMEN.md`, Nach Phase 1). Selbstzahler im Pilot (Nr. 27) und das Widerrufsrecht bleiben offen |
| 35 | BFSG (gilt seit dem 28.06.2025): Sind Buchungen in der App eine Dienstleistung im elektronischen Geschäftsverkehr? Wer ist Dienstleistungserbringer, ganz oder der Versicherer im Co-Branding? Die Ausnahme für Kleinstunternehmen nach § 3 Abs. 3 hilft nur dem Anbieter selbst. | RA | vor Pilot-Gate | offen | – |
| 36 | Produkthaftung: Sind App, Anleitungen und Fehlererkennung ein Produkt nach der Richtlinie (EU) 2024/2853? Sie ist laut Recherche bis 09.12.2026 umzusetzen. | RA | vor Pilot-Gate | offen | – |
| 37 | Wer haftet, wenn eine Anleitung oder ein Befund zu einem Schaden führt? Was dürfen die Nutzungsbedingungen begrenzen? Welche Versicherung braucht ganz vor dem Pilot? (Nr. 26) | RA | vor Pilot-Gate | offen | – |
| 38 | Lizenz der Anleitungstexte des Herstellers (Nr. 26) | RA | vor Gate externe Tests | offen | – |
| 46 | Selbstbeteiligung bei einem Termin vorbehaltlich Freigabe (Nr. 4, Nr. 5): Die App bucht heute mit „Zahlungspflichtig buchen“ und nennt die Selbstbeteiligung „falls Kranich freigibt“. Reicht das? Oder muss die Anfrage während der Prüfung unverbindlich sein und nach der Freigabe ein eigener Schritt mit Zusammenfassung und „Zahlungspflichtig buchen“ folgen? Folgt die Pflicht zur Selbstbeteiligung aus dem Versicherungsvertrag oder aus dem Auftrag an den Betrieb? (Nachtrag aus Schritt 28) | RA | vor Gate externe Tests | entschieden (Nr. 31), Prüfung RA offen | Nr. 31 vom 04.11.2026: unverbindliche Anfrage, nach der Freigabe eigener Schritt mit Zusammenfassung und „Zahlungspflichtig buchen“, umgesetzt (`docs/ANNAHMEN.md`, Nach Phase 1). Woraus die Pflicht zur Selbstbeteiligung folgt, bleibt offen (Nr. 48) |
| 47 | Misslungene Reparatur: Nach „Problem besteht weiter“ beginnt in der App eine neue Runde mit neuem Befund, neuer Meldung an Kranich und neuem Termin, jeweils mit eigenem Tap. Ist das richtig, oder ist es Nachbesserung des Betriebs (§ 634 Nr. 1, § 635 BGB) ohne neue Kosten und ohne neue Schadenmeldung? Wer zahlt die zweite Reparatur, und darf die App dafür einen zweiten Schadenfall anlegen? (Nachtrag aus der Gegenprüfung zu Schritt 28) | RA | vor Gate externe Tests | entschieden (Nr. 32), Prüfung RA offen | Nr. 32 vom 04.11.2026: Läuft die gesetzliche Gewährleistung für die Reparatur noch, bessert der Betrieb nach, ohne neue Schadenmeldung und ohne neue Kosten. Danach eine neue Runde wie bisher. Annahme: 2 Jahre ab Abschluss (§ 634a Abs. 1 Nr. 1 BGB), umgesetzt (`docs/ANNAHMEN.md`, Nach Phase 1). Offen bleiben Nr. 52 und Nr. 53 |
| 48 | Selbstbeteiligung nach der Freigabe (Nr. 31): Die Zusammenfassung vor „Zahlungspflichtig buchen“ nennt Betrieb, Zeitfenster, Adresse, Auftrag und „Du zahlst: Selbstbeteiligung 50 €“. Reicht das nach § 312j Abs. 2 BGB mit Art. 246a § 1 EGBGB? Wem schuldet der Haushalt die Selbstbeteiligung, dem Versicherer oder dem Betrieb, und muss die Karte das nennen? Wer ist Unternehmer im Sinn von § 312j, wenn ganz nur vermittelt? | RA | vor Gate externe Tests | offen | – |
| 49 | „Nicht buchen“ (Nr. 33): Die App sagt nach einer unverbindlichen Anfrage „Die Anfrage endet. Du zahlst nichts.“ Stimmt das auch, wenn der Betrieb schon einen Preis genannt hat? Kann der Betrieb für die Anfrage oder die Preisnennung etwas verlangen? Gilt dasselbe nach der Freigabe, wenn der Haushalt die Selbstbeteiligung nicht buchen will? | RA | vor Gate externe Tests | offen | – |
| 50 | Nachweis der Bestellung (Nr. 31, Nr. 33): Die Fallakte hält den Tap mit Betrag, Betrieb, Zeitfenster, Textversion und SHA-256 des gezeigten Satzes fest. Reicht das als Nachweis nach § 312j Abs. 3 BGB? Muss eine Bestätigung auf einem dauerhaften Datenträger folgen (§ 312f BGB), und schickt sie ganz oder der Betrieb? | RA | vor Gate externe Tests | offen | – |
| 51 | Abbrechen in der Reparatur (Nr. 34): Mit „Fall abbrechen“ storniert die App den Termin, und der Betrieb bekommt die Absage. Hat er den Auftrag schon (bestätigt, zahlungspflichtig gebucht oder Reparatur geplant), sagt die App nur: „Ob schon Kosten entstanden sind, klärt … mit dir.“ Reicht das bei einer Kündigung nach § 648 BGB, oder muss die App vorher die vereinbarte Vergütung abzüglich ersparter Aufwendungen nennen? Wer schuldet sie, wenn der Versicherer freigegeben hat? Ist die Absage eine Kündigung des Haushalts, und darf ganz sie als Vermittler übermitteln, auch nach einem Widerruf der Weitergabe (Nr. 16)? | RA | vor Gate externe Tests | offen | – |
| 52 | Nachbesserung in der Gewährleistung (Nr. 32): Die App nimmt 24 Monate ab Abschluss der Reparatur an (§ 634a Abs. 1 Nr. 1 BGB). Beginnt die Frist mit der Abnahme (§ 634a Abs. 2, § 640 BGB), und ist „Läuft wieder“ die Abnahme? Gegen wen richtet sich der Anspruch, wenn der Versicherer den Betrieb beauftragt und bezahlt hat, und wer ist dann Besteller? Reichen die Sätze „… muss die Reparatur nachbessern. Für die Nachbesserung zahlst du nichts Neues.“ und „Eine neue Schadenmeldung an … brauchst du dafür nicht.“, oder sagen sie zu viel (Verweigerung nach § 635 Abs. 3, Verschleiß, ein anderer Fehler)? Darf der Termin zur Nachbesserung mit der Weitergabe aus der Reparatur an den Betrieb gehen (lit. b)? | RA | vor Gate externe Tests | offen | – |
| 53 | Gescheiterte Nachbesserung (Nr. 32): Hilft auch die Nachbesserung nicht, beginnt in der App eine neue Runde mit Hilfe holen und, nur mit eigenem Tap, einer neuen Schadenmeldung. Welche Rechte hat der Haushalt dann gegen den Betrieb (Rücktritt, Minderung, Selbstvornahme mit Ersatz der Aufwendungen, Schadensersatz, §§ 636, 637 BGB)? Wann gilt die Nacherfüllung als fehlgeschlagen, nach einem oder nach zwei Versuchen? Muss die App darauf hinweisen, und darf der Versicherer die zweite Reparatur zahlen, ohne dass der Betrieb in Anspruch genommen wird? | RA | vor Gate externe Tests | offen | – |

## App Store

| Nr. | Frage | Kennzeichnung | Frist | Status | Antwort |
|---|---|---|---|---|---|
| 39 | 5.1.1(ix): Apps in regulierten Bereichen wie Versicherung reicht eine juristische Person ein. Daran hängt der Antrag als Organisation mit D-U-N-S-Nummer. | Wortlaut | Phase 0 | offen | – |
| 40 | 5.1.2(i): Daten an Sprachmodelle von Drittanbietern | Wortlaut | vor Gate externe Tests | offen | – |
| 41 | 5.1.1(v): Löschen des Kontos in der App (Nr. 24) | Wortlaut | vor Phase 5 | offen | – |
| 42 | 2.5.19 versteckte Funktionen (laut Prüfung, früher 2.3.1). Betrifft die Demo-Steuerung hinter der Versionsnummer. | Wortlaut | vor Gate externe Tests | offen | – |
| 43 | 2.3.1(a): Notes for Review mit allen Funktionen | Wortlaut | vor Gate externe Tests | offen | – |
| 44 | 2.5.14: Aufnahmen und Screenshots, etwa im Videocall | Wortlaut | vor Gate externe Tests | offen | – |
| 45 | 4.2.6: Whitelabel-Apps (Nr. 21) | Wortlaut | vor Phase 3b | offen | – |
