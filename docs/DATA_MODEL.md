# Datenmodell und Dashboards

Stand: 26.10.2026 · Phase 2, Schritt 14 · Typen: `model/types.ts` · Status-Maschine: `model/caseMachine.ts`

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
| Betrieb (Screenshots) | Häkchen „Screenshots als Nachweis erlauben“ | `screenshots_im_call` | lit. a |
| Versicherer | „Schadenfall melden“ | `weitergabe_versicherer` | lit. b |
| Betrieb (Auftrag) | „Termin anfragen“ / „Zahlungspflichtig buchen“ | `weitergabe_betrieb` | lit. b |
| Hersteller (Einzelfall) | Profil: „Einzelfälle an … weitergeben“ | `hersteller_einzelfall` | lit. a |
| Anbieter des Reparatur-Assistenten (Auftragsverarbeiter) | „Einverstanden“ vor der ersten Nachricht | `chat_assistent` | lit. a |
| Hersteller (aggregiert) | immer | – | ohne Personenbezug |

Der Reparatur-Assistent bekommt je Nachricht nur Gerät, Modell, Problem, Ergebnis, Stand der Anleitung und das Gespräch, keine Fotos, keine Adresse und keine Vertragsnummer (`lib/chat/context.ts`). Das Gespräch liegt als `ChatMessage` im Fall. Kein Dashboard liest es, die Fallakte zeigt nur die Zahl der Nachrichten.

Der Händler bekommt keine Einzelfälle. Er sieht nur Zahlen zu Verträgen, die über ihn verknüpft wurden (`Contract.linkedVia = 'haendler_code'`, `Contract.soldBy`).

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

- **V:** `schaden_gemeldet`, `freigabe_entschieden`, `angebot_erstellt`, `termin_*`, `reparatur_abgeschlossen`, `weitergabe_bestaetigt`, `einwilligung_widerrufen`
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

### Anleitung

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `GuideRun.guideId` | ✓ | – | (✓) | |
| `GuideRun.completedSteps` | ✓ | – | (✓) | Protokoll, auch 0 Schritte (B-22) |
| `GuideRun.abortedAtStep` | ✓ | – | (✓) | **Häufigster Abbruch** im Hersteller-Portal |
| `GuideRun.abortNote` | ✓ | – | E | Freitext, darum nur mit Einwilligung |
| `GuideRun.outcome` | ✓ | – | (✓) | **Selbst gelöst** je Anleitung |
| `Guide.sourceDocument` | – | – | ✓ | genutzte Reparaturinformation |

### Einwilligung

| Feld | V | Hä | He | Hinweis |
|---|---|---|---|---|
| `Consent.purpose`, `recipient` | ✓ | – | ✓ | jeder Empfänger sieht nur seine eigenen |
| `Consent.legalBasis` | ✓ | – | ✓ | `vertrag` (lit. b) oder `einwilligung` (lit. a) |
| `Consent.dataCategories` | ✓ | – | ✓ | Datenumfang, so wie in der App gezeigt |
| `Consent.textVersion` | ✓ | – | ✓ | Version des Hinweistexts |
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
| `Booking.subjectToApproval` | ✓ | – | – | Termin vorbehaltlich Freigabe (Entscheidung 5) |
| `Booking.address` | – | – | – | nur der Betrieb |
| `Booking.completionPhotoId` | ✓ | – | E | Abschlussfoto |
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
- Auftragsverarbeitungsvertrag mit dem Anbieter des Reparatur-Assistenten, Serverstandort, Rate-Limit und Anmeldung für die Route `/api/chat`
- Mandantentrennung für Versicherer und Händler im Backend
