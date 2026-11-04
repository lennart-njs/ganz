# Datenmodell und Dashboards

Stand: 26.10.2026 · Phase 2, Schritt 14, ergänzt um den Händler (Entscheidung 28) und am 04.11.2026 um die ganz-Linie (verbindlicher Schritt, ganz Nr. 31 und ganz Nr. 33) · Typen: `model/types.ts` · Status-Maschine: `model/caseMachine.ts`

Die App erzeugt heute alle Daten lokal (Store `store/appStore.ts`). Ein späteres Backend übernimmt dieselben Typen. Die Web-Dashboards für Versicherer, Händler und Hersteller lesen dann diese Felder. In die App kommen keine Links zu den Dashboards.

**Abkürzungen:** **V** Versicherer · **Hä** Händler · **He** Hersteller · ✓ liest das Feld · (✓) nur aggregiert, ohne Personenbezug · E nur mit Einwilligung im Einzelfall

## 1. Grundsätze

- **Quelle für alles ist `CaseEvent`.** Status, Fallakte, Zeitstrahl und Dashboards lesen dieselben Ereignisse. So steht in App und Portal immer derselbe Stand (B-33).
- **Weitergabe nur nach Bestätigung.** Ein Dashboard sieht einen Fall mit Personenbezug erst, wenn es einen gültigen `Consent` für genau diesen Empfänger und Fall gibt (`revokedAt` leer). Ohne Consent gibt es höchstens Zahlen ohne Personenbezug.
- **Zeitangaben** sind ISO 8601 mit Zeitzone, **Beträge** ganze Cent.
- **Beispielwerte** tragen `Quote.isExample = true`. Dashboards zeigen dann „Beispielwerte“.

## 2. Wer bekommt was, und wann

| Empfänger | Auslöser in der App | Consent (`purpose`) | Grundlage |
|---|---|---|---|
| Betrieb der Fachkraft | „Videocall starten“ | `weitergabe_fachkraft` | lit. b |
| Betrieb der Fachkraft (Rückruf) | Zeitfenster wählen, dann „Rückruf anfragen“ im Sheet | `weitergabe_fachkraft` | lit. b |
| Betrieb (Screenshots) | Häkchen „Screenshots als Nachweis erlauben“ | `screenshots_im_call` | lit. a |
| Versicherer | „Schadenfall melden“ | `weitergabe_versicherer` | lit. b |
| Betrieb (Auftrag) | „Termin anfragen“ / „Zahlungspflichtig buchen“ | `weitergabe_betrieb` | lit. b |
| Hersteller (Einzelfall) | Profil: „Einzelfälle an … weitergeben“ | `hersteller_einzelfall` | lit. a |
| Anbieter des Reparatur-Assistenten (Auftragsverarbeiter) | „Einverstanden“ vor der ersten Nachricht | `chat_assistent`, ohne Fall. Die Fallakte jedes Falls mit Nachrichten nennt die Weitergabe | lit. a |
| Händler (Einzelfall) | „Fall an … senden“ im Gespräch | `weitergabe_haendler` | lit. b |
| niemand, lokale Mitteilung auf dem eigenen Telefon (Absender mach’s) | Systemdialog nach „Termin anfragen“, Profil: „Mitteilungen zum Fall-Status“ | `mitteilungen`, ohne Fall | lit. a |
| Hersteller (aggregiert) | immer | – | ohne Personenbezug |

Der Reparatur-Assistent bekommt je Nachricht nur Gerät, Modell, Problem, Ergebnis, den aktuellen Schritt der Anleitung wörtlich und das Gespräch, keine Adresse und keine Vertragsnummer (`lib/chat/context.ts`). Ein Foto geht nur mit, wenn du es im Gespräch selbst aufnimmst (Entscheidung 26), und nur, wenn die Einwilligung die Kategorie `gespraechsfotos` nennt (`assistent_einwilligung` ab 2026-11-4). Fotos aus der Fehlererkennung gehen nie mit. Der Server speichert das Foto nicht, im Gespräch steht nur „Foto“. Das Gespräch liegt als `ChatMessage` im Fall. Kein Dashboard liest es, die Fallakte zeigt nur die Zahl der Nachrichten, die beim Anbieter ankommen konnten (`ChatMessage.forwarded`, fehlt das Feld, zählt die Nachricht).

**Verbindlich buchen (ganz Nr. 31, ganz Nr. 33):** Eine Terminanfrage ist unverbindlich, solange nicht feststeht, was der Haushalt zahlt: während der Versicherer prüft und bei der Vor-Ort-Diagnose, bis der Betrieb den Preis nennt (`Booking.price`, Ereignis `preis_genannt`). Danach wartet der Termin auf „Zahlungspflichtig buchen“ (`CaseFacts.bindingDue`). Der Tap setzt `Booking.binding` und schreibt `zahlungspflichtig_gebucht` mit Betrag, Betrieb, Zeitfenster und dem Stempel des gezeigten Texts (`textVersion`, `textHash` aus `lib/legalTexts.ts`, Schlüssel `verbindliche_buchung`). Steht der Preis schon beim Buchen fest (Selbstzahler, Buchung nach der Freigabe), entsteht beides mit der Buchung. „Nicht buchen“ storniert die Anfrage und schreibt `nicht_gebucht`. Ohne `binding` bestätigt der Betrieb keinen Termin, für den der Haushalt zahlt. Bei 0 € Selbstbeteiligung gibt es keinen zweiten Schritt. Mit dem Kundendienst des Händlers und ohne Versicherung steht vor der Wahl kein Zahler fest (`CaseFacts.regulator` ist der Händler, `CaseFacts.payer` bleibt offen). Wählt der Haushalt „Reparatur selbst zahlen“ mit dem Preis auf dem Button, zahlt er: Der Preis steht beim Buchen fest, der verbindliche Schritt entsteht mit der Buchung. Eine Freigabe durch Händler oder Hersteller gibt es noch nicht (`docs/ANNAHMEN.md`, Übertragung).

**Nachbesserung (ganz Nr. 32):** Nach „Problem besteht weiter“ prüft der Store, ob die Gewährleistung für die Reparatur noch läuft (`model/policies/warranty.ts`, `Booking.completedAt` plus `demoConfig.warranty.repairMonths`). Dann geht der Fall auf `nachbesserung`, die Runde der Reparatur endet, und die neue trägt `Case.rework`. Der Termin zur Nachbesserung (`Booking.reworkOf`) geht mit der Weitergabe aus der Reparatur an denselben Betrieb, ohne neue Bestätigung, ohne Schadenfall, Freigabe oder Betrag. Ist die Weitergabe widerrufen, bestätigt der Haushalt sie erst erneut. Das gilt auch, wenn der Kundendienst des Händlers repariert hat. Gemeint ist die Gewährleistung auf die Reparatur, nicht die des Händlers auf den Kauf.

**Abbrechen (ganz Nr. 34):** Der Abbruch storniert jeden laufenden Termin der Runde und schreibt `termin_abgesagt`. An den Betrieb geht nur die Absage, mit der Weitergabe, mit der er den Termin bekam. Eine neue Bestätigung entsteht nicht. Ist der Fall an den Händler gesendet, sieht er den Abbruch im Zeitstrahl seiner Akte, über dieselbe Weitergabe.

Der Händler sieht einen Einzelfall erst, wenn du ihn im Gespräch an ihn sendest (Entscheidung 28). Dann bekommt er die Fallakte: Name und Kontakt, Gerät mit Typenschild, Kaufdatum und Beleg, Problem, Fotos mit Zeitstempel, Ergebnis, Anleitung bis zum Abbruch, Befund, Kosten, Termin und Zeitstrahl. Was die Akte umfasst, steht in `model/policies/consentScopes.ts` unter `weitergabe_haendler`. Ohne Bestätigung sieht er nur Zahlen zu Geräten und Verträgen, die über ihn laufen (`Device.soldBy`, `Contract.soldBy`). Seine Antworten (Fall angenommen, Rückfrage, Entscheidung, Betrieb, Status) kommen als `CaseEvent` mit `actor.kind = 'haendler'` zurück in die App. Das Gespräch mit dem Reparatur-Assistenten liest er nicht.

## 3. Felder je Dashboard

### Haushalt, Person, Vertrag

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `Person.displayName` | ✓ | – | E | Name nur beim Empfänger des Falls |
| `Person.role` | ✓ | – | – | Versicherungsnehmerin meldet den Schaden (Entscheidung 2) |
| `Household.address` | – | – | – | Nur der Betrieb, über `Booking.address` |
| `Contract.contractNumber` | ✓ | – | – | Zuordnung des Schadenfalls |
| `Contract.provider` | ✓ | ✓ | – | Mandant im Versicherer-Portal |
| `Contract.soldBy` | ✓ | ✓ | – | Händler, über den der Schutz verkauft wurde |
| `Contract.kind`, `productName` | ✓ | ✓ | – | |
| `Contract.validFrom`, `validUntil` | ✓ | ✓ | – | Laufzeit |
| `Contract.deductible` | ✓ | – | – | Selbstbeteiligung, in der App sichtbar vor jeder Buchung |
| `Contract.linkedVia`, `linkedAt` | ✓ | ✓ | – | Händler: Anteil der Verknüpfungen per Händler-Code |
| `Contract.coveredDeviceIds` | ✓ | – | – | |

### Gerät

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `Device.manufacturerId`, `category`, `model` | ✓ | ✓ | (✓) | Fehlerbilder pro Modell |
| `Device.materialNumber` | ✓ | – | (✓) | vom Typenschild (B-56) |
| `Device.serialNumber` | ✓ | – | E | personenbeziehbar, darum nur mit Einwilligung |
| `Device.purchaseDate` | ✓ | ✓ | (✓) | Reihenfolge der Kostenträger, Gewährleistung (B-41) |
| `Device.identifiedBy` | – | – | (✓) | Qualität der Geräte-Erkennung |
| `Device.contractId` | ✓ | – | – | |

### Fall und Schadenfall

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `Case.id` | ✓ | – | E | sichtbar in App und Portal, z. B. „GS-24817“ |
| `Case.status` | ✓ | (✓) | (✓) | eine Quelle für App und Portal |
| `Case.entry` | – | – | (✓) | Foto, Meldung, Symptom, Freitext, Pflege |
| `Case.problemLabel` | ✓ | – | (✓) | |
| `Case.resolution` | ✓ | (✓) | (✓) | Wie Fälle enden: selbst gelöst, im Call, repariert, Ersatzgerät |
| `Case.cancelReason` | – | – | (✓) | Abbruchgründe |
| `Case.createdAt`, `closedAt` | ✓ | (✓) | (✓) | Dauer bis zur Lösung |
| `Case.rounds` | ✓ | (✓) | (✓) | Frühere Runden vor „Problem besteht weiter“: Kostenvoranschlag, Schadenfall, Termine und Befunde. Sie bleiben im Fall, zählen für die Regeln der neuen Runde aber nicht mehr (`model/policies/rounds.ts`). `CaseRound.rework` markiert eine Runde, die eine Nachbesserung war (Nr. 32) |
| `Case.rework` | ✓ | – | (✓) | Die laufende Runde ist eine Nachbesserung in der Gewährleistung (Nr. 32): Reparaturtermin, Betrieb, Abschluss, Ende der Frist, Zeitpunkt von „Problem besteht weiter“. Ohne Schadenfall und ohne Betrag. Der Versicherer sieht nur, dass keine neue Meldung kam. Kennzahl für Hersteller: Nachbesserungen je Fehlerbild |
| `Case.status` = `nachbesserung` | ✓ | (✓) | (✓) | Der Betrieb bessert nach (Nr. 32). Danach `erledigt`, eine neue Runde (`eskaliert`) oder `abgebrochen` |
| `Claim.reportedAt`, `reportedBy` | ✓ | – | – | Erklärung der Versicherungsnehmerin (VVG § 30) |
| `Claim.confirmationId` | ✓ | – | – | Nachweis der Bestätigung (Consent) |
| `Claim.decision.result`, `at` | ✓ | – | – | |
| `Claim.decision.actor` | ✓ | – | – | `mensch` oder `regel` (Art. 22 DSGVO) |
| `Claim.decision.approvedAmount` | ✓ | – | – | |

### Ereignisse

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `CaseEvent.type`, `at` | ✓ | – | (✓) | Zeitstrahl, Fallakte, Kennzahlen |
| `CaseEvent.actor` | ✓ | – | – | Haushalt, Fachkraft, Betrieb, Versicherer, System |
| `CaseEvent.payload` | ✓ | – | (✓) | z. B. Schritt, Notiz, Szenario, Betrag |

Ereignisse, die ein Dashboard besonders braucht:

- **V:** `schaden_gemeldet`, `freigabe_entschieden`, `angebot_erstellt`, `termin_*`, `zahlungspflichtig_gebucht` (Selbstbeteiligung nach der Freigabe), `reparatur_abgeschlossen`, `weitergabe_bestaetigt`, `einwilligung_widerrufen`
- **Betrieb (später):** `termin_angefragt`, `preis_genannt`, `zahlungspflichtig_gebucht`, `nicht_gebucht`. Erst nach `zahlungspflichtig_gebucht` gilt ein Termin, für den der Haushalt zahlt. `termin_abgesagt` (Nr. 34): Absage beim Abbrechen, mit `ordered` (der Betrieb hatte den Auftrag) und `costsOpen` (er klärt mit dem Haushalt, ob Kosten entstanden sind). `nachbesserung_verlangt` (Nr. 32): Reparaturtermin, Betrieb und Ende der Gewährleistung. `termin_angefragt` und `reparatur_abgeschlossen` tragen bei der Nachbesserung `rework: true`. `problem_besteht_weiter` nennt in `warranty`, warum keine Nachbesserung kam (`abgelaufen`, `nachbesserung_gescheitert`, `keine_reparatur`), mit `demoLongAgo` aus der Demo-Steuerung.
- **He:** `ergebnis_erkannt`, `anleitung_gestartet`, `schritt_erledigt`, `schritt_geht_nicht`, `anleitung_beendet`, `befund_erstellt` (alles aggregiert)
- **Hä:** keine Einzelereignisse, nur Zahlen pro Vertrag

### Foto und Ergebnis

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `Photo.takenAt`, `purpose`, `deviceId`, `caseId` | ✓ | – | E | Nachweis: in der App aufgenommen (B-16) |
| `Photo.source` | ✓ | – | – | `in_app_camera`, `betrieb` oder `demo`; kein Galerie-Import |
| `Photo.uri` | ✓ | – | E | |
| `Photo.sha256` | ✓ | – | – | später: Integritätsnachweis mit Backend |
| `Diagnosis.mode`, `errorPattern`, `component` | ✓ | – | (✓) | Fehlerbilder pro Modell |
| `Diagnosis.displayMessage` | ✓ | – | (✓) | Häufigkeit der Display-Meldungen |
| `Diagnosis.confidence` | ✓ | – | (✓) | in der App nur als Wort |
| `Diagnosis.confidenceScore` | – | – | (✓) | nur intern und für die Qualität der Erkennung |
| `Diagnosis.source` | ✓ | – | (✓) | Fehlererkennung, Nutzerangabe, Fachkraft, Betrieb |
| `Diagnosis.discardedAt` | ✓ | – | (✓) | „Passt nicht“ oder ein anderes Problem im selben Fall: Das Ergebnis gilt nicht mehr und geht nicht mehr als Ergebnis an Assistent, Fachkraft oder Versicherer |

### Anleitung

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `GuideRun.guideId` | ✓ | – | (✓) | |
| `GuideRun.completedSteps` | ✓ | – | (✓) | Protokoll, auch 0 Schritte (B-22) |
| `GuideRun.abortedAtStep` | ✓ | – | (✓) | **Häufigster Abbruch** im Hersteller-Portal |
| `GuideRun.abortNote` | ✓ | – | E | Freitext, darum nur mit Einwilligung |
| `GuideRun.outcome` | ✓ | – | (✓) | **Selbst gelöst** je Anleitung. Fehlt er bei `endedAt`, endete die Anleitung für ein anderes Problem (`anleitung_beendet` mit `replaced`, Schritt 23) |
| `Guide.sourceDocument` | – | – | ✓ | genutzte Reparaturinformation |

### Einwilligung

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `Consent.purpose`, `recipient` | ✓ | – | ✓ | jeder Empfänger sieht nur seine eigenen |
| `Consent.legalBasis` | ✓ | – | ✓ | `vertrag` (lit. b) oder `einwilligung` (lit. a) |
| `Consent.dataCategories` | ✓ | – | ✓ | Datenumfang als Schlüssel aus `model/policies/consentScopes.ts` (`geraet`, `fotos`, …), so wie in der Vorschau gezeigt. Stände vor Schritt 26 enthalten Bezeichnungen |
| `Consent.textVersion` | ✓ | – | ✓ | Version des Hinweistexts aus `lib/legalTexts.ts` |
| `Consent.textHash` | ✓ | – | ✓ | SHA-256 des gezeigten Texts mit den echten Namen. Fehlt bei Ständen vor Schritt 26 |
| `Consent.grantedAt`, `revokedAt` | ✓ | – | ✓ | Widerruf beendet die Weitergabe |

### Kosten, Termin, Videocall

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `Quote.repair` (Teil, Arbeit, Summe) | ✓ | – | (✓) | Ersatzteilbedarf |
| `Quote.replacement.total` | ✓ | – | – | |
| `Quote.saving` | ✓ | (✓) | – | berechnet, nie eingetragen; „dieser Fall“ (B-48) |
| `Quote.payer`, `deductible` | ✓ | – | – | |
| `Quote.isExample` | ✓ | ✓ | ✓ | Kennzeichnung „Beispielwerte“ |
| `Booking.kind` | ✓ | – | (✓) | `reparatur`, `vor_ort_diagnose`; Pumpe nie an den Haushalt |
| `Booking.provider` (inkl. `authorized`) | ✓ | – | ✓ | Reparaturnachweise: autorisierter oder freier Betrieb |
| `Booking.slotLabel`, `status` | ✓ | – | – | |
| `Booking.subjectToApproval` | ✓ | – | – | Termin vorbehaltlich Freigabe (Entscheidung 5), bis dahin unverbindlich (Nr. 31) |
| `Booking.price` | – | – | – | Preis, den der Betrieb vor der Vor-Ort-Diagnose nennt (Nr. 33). Beispielwert aus `config/demo.config.ts` |
| `Booking.binding` | ✓ | – | – | Zeit und Betrag von „Zahlungspflichtig buchen“ (Nr. 31, Nr. 33). Fehlt bei einer unverbindlichen Anfrage und wo der Haushalt nichts zahlt. Der Versicherer sieht es nur für Termine seines Schadenfalls |
| `Booking.address` | – | – | – | nur der Betrieb |
| `Booking.completionPhotoId` | ✓ | – | E | Abschlussfoto |
| `Booking.completedAt` | ✓ | – | (✓) | Wann der Betrieb fertig war. Beginn der Gewährleistung für die Reparatur (Nr. 32, Annahme). Fehlt bei Terminen von vor Nr. 32 |
| `Booking.reworkOf` | ✓ | – | (✓) | Dieser Termin ist die Nachbesserung zu diesem Reparaturtermin, beim selben Betrieb, ohne Freigabe, Preis und `binding` (Nr. 32) |
| `Booking.rating` | (✓) | – | (✓) | Zufriedenheit mit Betrieben |
| `VideoSession.startedAt`, `endedAt`, `outcome` | ✓ | – | (✓) | Anteil „im Call gelöst“, Wartezeiten, „keine Fachkraft frei“ |
| `VideoSession.recording` | ✓ | – | – | immer `false` |
| `VideoSession.screenshotsConsentId` | ✓ | – | – | |

## 4. Kennzahlen aus den Demo-Portalen

| Kennzahl | Portal | Berechnung |
|---|---|---|
| Wie Fälle enden | V | `Case.resolution` der geschlossenen Fälle, letzte 30 Tage |
| Schadenaufwand je Fall | V | Mittel von `Claim.decision.approvedAmount`; Vergleich `Quote.replacement.total` |
| Ersparnis dieses Falls | V | `Quote.saving` |
| Häufigste Fehlerbilder | V, He | `Diagnosis.errorPattern` nach Modell |
| Anleitung gestartet / selbst gelöst | He | `GuideRun` je `guideId`, `outcome = 'laeuft_wieder' | 'fertig'` |
| Häufigster Abbruch | He | Modus von `GuideRun.abortedAtStep` je Anleitung |
| Ersatzteilbedarf | He | `Quote.repair.partName` aus Befunden, Prognose |
| Reparaturnachweise | He | `Booking` mit `status = 'erledigt'`, Gerät, Fehlerbild, Teil, Betrieb, Ergebnis |
| Verknüpfungen per Händler-Code | Hä | `Contract.linkedVia = 'haendler_code'` je `soldBy` |

## 5. Offen für das Backend

- Signatur oder Hash-Kette für Fotos (`Photo.sha256`)
- Mehrere Personen im Haushalt mit Rolle „mitversichert“ (Entscheidung 2: im Prototyp nicht)
- Löschfristen je Datenkategorie, auch für `ChatMessage`
- Das Gespräch des Falls ist eine Ansicht auf `CaseEvent` und `ChatMessage`, kein eigener Speicher. Neu ist das Ereignis `rueckfrage_gestellt` (Rückfrage der Fehlererkennung mit Foto und Modus).
- Auftragsverarbeitungsvertrag mit dem Anbieter des Reparatur-Assistenten, Serverstandort, Rate-Limit und Anmeldung für die Route `/api/chat`
- Mandantentrennung für Versicherer und Händler im Backend. Die Demo-Schnittstelle dafür steht in `server/` und `portal/`, siehe `docs/BACKEND.md`.
