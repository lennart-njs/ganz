# Zukunftsplan: ganz vom Prototyp zur Plattform

Stand: 03.11.2026 · freigegeben im Chat („setze den plan um“) · Version 2 nach Prüfung auf Vollständigkeit, Technik und Recht

Grundlage: Code-Review vom 03.11.2026, `docs/AUFTRAG.md`, `docs/DATA_MODEL.md`, `docs/BUILD_PLAN.md`, `docs/ENTSCHEIDUNGEN.md`

Dieser Plan beschreibt, wie die App und alles drumherum zukunftsfähig werden: Code, Tests, Builds, Server, Dashboards, Recht, Betrieb und Arbeitsweise. Er ändert keine feste Regel aus `CLAUDE.md`. Wo er eine Regel berührt, steht das in Abschnitt 5 oder als Entscheidung in Abschnitt 6.

**Kennzeichnungen:**

- **(RA)** heißt: eine Rechtsfrage für Anwalt oder Datenschutzbeauftragte (DSB), bevor sie umgesetzt wird.
- **Nr. 15** bis **Nr. 30** sind neue Entscheidungen. Sie stehen mit diesen Nummern in `docs/ENTSCHEIDUNGEN.md`. Nr. 1 bis 14 sind die bestehenden.
- **R-01** bis **R-18** sind die bestätigten Befunde der Code-Review (Anhang B).

---

## 0. Kurzfassung

Zuerst beseitigst du die Fehlerklassen an der Wurzel:

- eine Regelquelle für „was ist jetzt erlaubt“,
- ein Weg zum Öffnen eines Falls,
- Befehle ohne Abstürze,
- Ereignisse mit Schlüsseln statt Texten.

Gleichzeitig wird jede Weitergabe belegbar, und die Rechtsfragen gehen schon in Woche 1 raus, weil sie die längste Vorlaufzeit haben. Danach wird `model/` ein reiner Kern, den später der Server unverändert nutzt, und der Pitch läuft ohne Laptop. Server-Autorität, Mandanten und Portale kommen erst mit einem Kunden, Schritt für Schritt hinter der bestehenden Naht `services/`.

| Phase | Zeitraum (KW) | Ziel | Aufwand (grob) | Start |
|---|---|---|---|---|
| 0 Sicherheitsnetz | Woche 1 (KW 45) | Jeder Commit voll geprüft, App startet immer, jeder Befund ist ein Test, Rechtsfragen gestellt | 4–5 PT Technik, 1 PT Produkt | sofort |
| 1 Fehlerklassen an der Wurzel | Woche 2–5 (KW 46–49) | Eine Regelquelle, keine Abstürze, R-01 bis R-18 behoben | 10–12 PT Technik, 2 PT Produkt | nach 0 |
| 2 Pitch ohne Laptop | Woche 4–6 (KW 48–50) | Eigener Build, Assistent gehostet | 5–7 PT Technik | mit Apple-Konto |
| 3 Reiner Kern, Ereignisse v2, Consent-Ledger | Woche 6–15 (KW 50 – KW 6/2027), mit 2 Wochen Puffer über Weihnachten | Fachlogik ohne React und Texte, serverfähig | 25–30 PT Technik, 3 PT Produkt | nach 1 |
| 4 Reif für externe Testerinnen | Woche 12–17 (KW 3–8/2027) | Datenflüsse, Pflichthinweise, DSFA, Store-Vorgaben und Assistent belegt | 8–10 PT Technik, 3 PT Produkt, 5–8 PT Recht | parallel zum Ende von 3 |
| 5 Pilot-Backend | ab etwa März 2027, 10–12 Wochen | Server wird Stufe für Stufe zur Autorität | freier Entwickler 2–3 Tage pro Woche, Pen-Test, 5 PT Recht | **nur mit LOI** |
| 6 Pilot, Dashboard, Inhalte | ab etwa Juni 2027, 10–14 Wochen | Ein Versicherer arbeitet echte Fälle ab | Nachtest, ca. 10 PT Recht | **nur mit Pilotvertrag** |

PT = Personentage einer steuernden und prüfenden Person. Die Laufzeit der Claude-Code-Sitzungen ist enthalten. Die Rechnung geht von etwa 3 PT pro Woche für die Technik aus, weil Vertrieb und Pitch weiterlaufen. Der Engpass ist die Review-Zeit, nicht das Schreiben von Code.

**Gates:**

- **Pitch-Gate (jede Woche):** `main` ist pitchfähig. Ein Pitch-Tag wird nur nach grünem Check gesetzt und nie, solange ein Befund offen ist, der eine feste Regel bricht (R-07, R-12, R-13, R-16, R-17).
- **Gate externe Tests (Ende Phase 4):** Erst danach nutzt jemand außerhalb des Teams die App. Dafür müssen vorliegen:
  - eine DSFA für Assistent, Fotos und Versicherungsdaten,
  - eine förmlich benannte DSB,
  - AVV und Transfermechanismus für jeden genutzten Dienst,
  - die Entscheidung Nr. 28 zum Assistenten für Externe.
- **LOI-Gate (Start Phase 5):** keine Server-Autorität über den Chat hinaus und keine Dashboards ohne Absichtserklärung eines Versicherers.
- **Gate echte Daten (nach Strangler-Stufe 3 in Phase 5):** Pen-Test ohne offene hohe Befunde, AVV, VVT, DSFA-Update und eine Wiederherstellungsübung liegen vor. Erst danach landen echte Personendaten auf dem Server.
- **Pilot-Gate (vor dem ersten echten Fall):**
  - ein unterschriebener Pilotvertrag, ein LOI reicht nicht,
  - mit der Vereinbarung zur Rolle nach DSGVO (Nr. 22),
  - mit den Klauseln nach Art. 30 DORA (RA).
  - Das gilt schon für den Concierge-Piloten.

---

## 1. Grundsätze

1. **Der Pitch-Stand ist geschützt.** `main` ist jede Woche pitchfähig. Vor wichtigen Terminen gilt ein Merge-Freeze von 48 Stunden.
2. **Regeln als Code, nicht als Text.** Jede Geschäftsregel gibt es genau einmal in `model/`. Lint und Tests setzen sie durch.
3. **Ereignisse tragen Schlüssel, IDs und Cent.** Nie Texte, Anzeigenamen oder Personenbezug im Klartext.
4. **Jede Weitergabe ist belegbar:** wer, wann, was, auf welcher Grundlage, mit welcher Textversion.
5. **Die strengere Variante bauen.** Die Antwort des Anwalts kann dann nur lockern. Rechtsfragen früh stellen.
6. **Keine Plattform auf Vorrat.** Server-Autorität und Portale erst mit einem Kunden. Schwere Nachweise wie Object Lock oder ISO 27001 erst, wenn ein Kunde sie verlangt.
7. **Kleine, umkehrbare Schritte.** Ein Commit pro Schritt, das Strangler-Muster mit Schaltern, kein großer Umbau auf einmal.
8. **Review-Zeit ist der Engpass.** Nur so viel Code, wie ihr am selben Tag prüfen könnt. In den Hotspot-Dateien arbeitet immer nur eine Sitzung.

---

## 2. Annahmen

Jede Annahme lässt sich ändern. Wenn eine nicht stimmt, verschieben sich Aufwand und Reihenfolge.

- **Team:** zwei Gründer mit zwei Rollen.
  - **Technik** steuert und prüft die Claude-Code-Sitzungen, Domäne und Datenschutz.
  - **Produkt** verantwortet Recht, Vertrieb und Abnahme.
  - Wer welche Rolle hat, legst du fest.
  - Ab Phase 5 eventuell ein freier Entwickler mit 2–3 Tagen pro Woche.
  - Externe Rechtsberatung und DSB mit etwa 2 PT im Monat.
- **Pitch:** läuft jede Woche auf einem iPhone.
- **Daten:**
  - Bis zum Gate externe Tests gibt es nur Demo-Daten und Chats des Teams.
  - Auch Chats des Teams gehen heute an die Anthropic-API und sind Personendaten. Sie sind nicht anonym.
  - Was externe Testerinnen eingeben, sind echte Personendaten.
  - Echte Fälle kommen erst nach dem Gate echte Daten auf den Server.
- **Erster Kunde:** ein Versicherer mit Geräteschutz. Ein LOI kommt frühestens im ersten Halbjahr 2027.
- **Werkzeuge:**
  - Das Repo bleibt privat auf GitHub, GitHub Actions ist verfügbar.
  - Paketmanager bleibt npm.
  - Expo bleibt, kein nativer Neubau.
- **Ablauf:** Die neuen Schritte stehen in `docs/BUILD_PLAN.md` Abschnitt 8. Schritt 15 zieht dorthin (Phase 6). `CLAUDE.md` muss deshalb „Abschnitt 5 und 8“ nennen. Diese Änderung machst du selbst (Abschnitt 5).
- **Laufende Kosten bis Phase 4 bleiben klein:**
  - Apple Developer Program als Organisation,
  - EAS-Tarif,
  - ein kleiner EU-Host,
  - Budget für den Assistenten,
  - Minuten für nächtliche iOS-Tests.
  - Phase 2 misst die genauen Zahlen. Ein Budget für Phase 5 und 6 folgt mit dem LOI.

---

## 3. Zielbild

### 3.1 Aufbau

Bis Ende Phase 4 bleibt das Repo einstufig, `model/` ist dann schon der reine Kern. Das Monorepo kommt erst mit Phase 5.

```
ganz/                    npm workspaces ab Phase 5
  apps/app               Expo-App: app/ nur Screens, components/, theme/, i18n/de.ts,
                         store/ als dünner Adapter, services/ als Naht (local | remote je Service)
  apps/server            Phase 2: die bestehende Chat-Route über den http- oder express-Adapter
                         von expo-server. Ab Phase 5: Hono + Drizzle + Postgres mit
                         /v1/commands, /v1/sync, /v1/photos, /v1/assistant, /health
  apps/dashboards        erst mit Pilotvertrag. Next.js, Tokens aus design-system/
  packages/domain        heute model/: types, caseMachine, events (diskriminierte Union,
                         schemaVersion, Upcaster), decide/evolve, policies/ (availableActions,
                         openCase, bookingRules, payer), projections/ (caseFacts, conversation,
                         fallakte, insurerView, manufacturerAggregates), ports (Clock, IdGen, Hasher).
                         Kein Import aus react, expo, i18n, config, store
  packages/compliance    Registry: Zweck, Rechtsgrundlage (a, b, c oder f), Datenkategorien,
                         Empfänger, Löschfrist, Auftragsverarbeiter mit Ort und Transfermechanismus,
                         Schlüssel der Hinweistexte mit textVersion und textHash.
                         Die Texte selbst bleiben in i18n/de.ts
  packages/contracts     zod-Schemas für Befehle, Ereignisse und API. OpenAPI erst mit Partner-API
  packages/content       Gerätekategorien und Anleitungen als Daten: Quelle, Lizenz, Version, verbatimHash
  packages/tenant        TenantConfig (Co-Branding, minAppVersion, Versionen der Rechtstexte).
                         Der Demo-Mandant bleibt bis Phase 6 in config/demo.config.ts
```

### 3.2 Datenfluss

```
UI → useCommand(cmd, idempotencyKey) → decide → Event[] → lokales Log + Outbox → evolve → Projektionen → UI
```

Ab Phase 5 ruft der Server dasselbe `decide` auf und liefert kanonische Ereignisse mit `seq` und `recordedAt`. Screens fragen nur `availableActions()` und `nextReplies()` und rendern das Ergebnis. Kein Screen vergleicht mehr selbst `status`.

### 3.3 Ereignisse, Einwilligungen, Zugriff

- **Ereignis-Umschlag:**
  - Felder: `id`, `caseId`, `type`, `schemaVersion`.
  - `actor` als `{kind, id}` statt Anzeigename.
  - `occurredAt` (Gerät), dazu `recordedAt` und `seq` (Server).
  - `policyVersion` bzw. `tenantConfigVersion` bei Entscheidungen.
  - Im Payload stehen nur Schlüssel, IDs und Cent. Personenbezug steht nur als Verweis auf löschbare Datensätze.
- **Hash-Kette:**
  - Sie entsteht nur auf dem Server, zusammen mit `seq`. Das Gerät lässt `prevHash` und `hash` leer.
  - Das Design soll Hash-Kette und Löschung vereinbar machen (RA). Die Ereignisse bleiben aber Personendaten, solange ganz sie einem Haushalt zuordnen kann.
  - Deshalb gibt es je Fall auch einen Löschweg für den Ereignisstrom, etwa einen Tombstone. Für jede Frist steht fest, welche Ausnahme nach Art. 17 Abs. 3 DSGVO gilt.
- **Consent-Ledger:** Nur anhängen, nie ändern. Der Status ist nur eine Projektion.
  - Lit. b kennt `bestaetigt` und `zurueckgezogen`, lit. a kennt `erteilt` und `widerrufen`.
  - Jeder Eintrag trägt Empfänger, Kategorien, `textVersion` und `textHash`.
- **Zugriff:**
  - Der Fall gehört dem Haushalt, es gibt keine `tenantId` am Fall.
  - Empfänger lesen nur über `case_access`. Das wird aus dem Ledger abgeleitet: Empfänger, Fall, Zweck, Kategorien, Ende.
  - Jeder B2B-Lesezugriff landet im `audit_log` und ist in der Fallakte sichtbar.
  - **Technisch:**
    - Views mit `security_invoker = true`.
    - Die App-Rolle ist nicht Eigentümer und hat kein `BYPASSRLS`.
    - `FORCE ROW LEVEL SECURITY` auf allen Tabellen mit Personenbezug.
    - Die Identität wird je Transaktion gesetzt (`set_config(…, true)`).
    - Kategorien trennt je eine eigene Projektion, nicht RLS.

### 3.4 Reparatur-Assistent

- Er läuft nur über den Server.
- Der Systemkontext entsteht nur aus Katalogschlüsseln. Freitext geht ausschließlich als Nutzer-Nachricht.
- **Provider-Adapter:** Die Modell-ID kommt aus der Konfiguration, ein Eval-Satz läuft in CI.
  - Für Demo und Team die Anthropic-API. `inference_geo` kennt dort nur `global` und `us`. Bei `global` ist der Ort der Verarbeitung nicht auf die USA begrenzt.
  - Dokumentieren allein ist kein Transfermechanismus. Gebraucht werden SCC mit Transfer-Folgenabschätzung, oder das DPF, wenn der Empfänger zertifiziert ist und die Verarbeitung nur in den USA läuft. Wahlweise `inference_geo: "us"` (RA).
  - Für echte Daten Vertex AI (Region eu) oder Amazon Bedrock (EU-Region). Dort gibt es den server-seitigen Parameter `fallbacks` nicht. Die Route nutzt dann die client-seitige Refusal-Middleware des SDK.
  - Für externe Testerinnen gilt Nr. 28.

### 3.5 Fotos, Konfiguration, Regeln

- **Fotos:**
  - `components/app/CameraCapture.tsx` ruft `takePictureAsync` ohne die Option `exif` auf, sie steht also auf dem Standardwert `false`. Dass die App das Foto damit ohne EXIF und GPS speichert, ist gegen die Expo-Doku zu prüfen (Stand 03.11.2026). `skipProcessing` bleibt verboten. Einen Test dafür gibt es noch nicht.
  - Die Kamera legt das Foto im Cache ab. Das System darf es dort löschen. Deshalb wird es sofort ins Dokumentenverzeichnis kopiert und erst dann gespeichert.
  - Danach werden die Rohbytes gehasht, mit `Crypto.digest(SHA256, bytes)`, nicht ein Base64-Text.
  - Der Server rechnet den Hash beim Upload nach.
  - Gerätezeit und Serverempfangszeit werden getrennt gespeichert.
- **Konfiguration:**
  - `TenantConfig` kommt über `useTenant()`, nie per Direktimport.
  - Die Varianten sind gleich den EAS-Profilen: `development`, `pitch`, `production`. Jede hat eine eigene Bundle-ID und einen eigenen Update-Kanal.
  - Ins Bundle kommt die Variante als `EXPO_PUBLIC_APP_VARIANT`.
  - Demo-Module werden nur in statischen Zweigen im Kompositions-Root geladen. Alternativ ersetzt Metro per `resolveRequest` die Datei `config/demo.config.ts` im Production-Build durch einen Stub.
  - Ab dem Pilot liefert der Server die Konfiguration signiert und versioniert.
- **Regeln:** Geschäftsregeln stehen nur in `packages/domain`, Rechtsregeln nur in `packages/compliance`.

---

## 4. Phasen

### Phase 0: Sicherheitsnetz · Woche 1

**Ziel:** Jeder Commit wird vollständig geprüft. Die App startet immer, auch mit kaputtem Speicher. Jeder bestätigte Befund steht als Test in der Suite und in `docs/BEFUNDE.md`. Die Rechtsfragen sind gestellt.

**Prüfungen**
- **Lint über das ganze Repo:** `lint` wird `eslint .` statt `expo lint`. `expo lint` prüft nur `app/`, `components/` und `src/`.
  - Beim Start des Plans meldete der volle Lauf 3 Fehler und 10 Warnungen. Zuerst die Fehler beheben, Start mit `--max-warnings 10`. (Stand nach Schritt 28: 0 Fehler, 0 Warnungen.)
  - Die Warnungen folgen bis Ende Phase 1, dann gilt `--max-warnings 0`.
- **Neue Prüfungen als eigene lokale Regeln** über ein Plugin-Objekt in `eslint.config.js`. In der Flat-Config ersetzt ein späterer Block mit derselben Regel die Optionen, statt sie zu ergänzen. Ein Fixture-Test zeigt, dass alte und neue Regeln gleichzeitig greifen.
- **Textregel:** Sie erfasst auch Ternäre, Template-Literale und Arrays in JSX-Attributen und -Kindern.
- **Selektor-Regel:** Die Regel gegen `useAppStore()` ohne Selektor kommt erst in Phase 3b, dann gleich als Fehler. Heute gibt es 14 Treffer. Sie würden das Warnungsbudget sprengen.
- **Node 24:** `.nvmrc` mit Node 24 und `engines` in `package.json`. Das README nannte beim Start des Plans „Node 20 oder neuer“, Node 20 hat keinen Support mehr. (Seit Schritt 16 nennt es Node 24.)
- **Script `check:fast`:** tsc, eslint auf geänderten Dateien, Unit-Tests. Für den Stop-Hook der Sitzungen.

**Tests**
- **Jest-Projekte:**
  - `unit` startet nur mit `model/`, mit dem Preset `jest-expo/node`. `lib/` und `services/` kommen dazu, sobald sie in Phase 3 frei von react-native, Expo und Store sind.
  - `ui` wiederholt `setupFiles`, `moduleNameMapper`, `transformIgnorePatterns` und `testPathIgnorePatterns`. Projekte erben das nicht.
- **Fake Timers:** Die 3 wackeligen Integrationstests laufen damit. Die Ursache sind echte Timer, unter anderem der 1-Sekunden-Simulationstimer. Ein höherer Timeout ist keine Lösung. (Schritt 17 hat gemessen: Die Hauptursache war das Laden der Module im ersten `renderRouter` einer Datei. Behoben mit Fake Timers und `test/app.ts`, siehe `docs/ANNAHMEN.md` Schritt 17.)
- **`__tests__/regressions/`:** je ein Test pro Befund R-01 bis R-18, mit Datei und Zeile.
  - Jeder prüft das konkrete Symptom und ist als `test.failing` markiert.
  - Das Umstellen auf `test` gehört in denselben Commit wie die Behebung.
- **`docs/BEFUNDE.md`:** Die Befunde stehen dort sofort, mit der B-Nummer, die wieder offen ist.
  - R-01 ist B-04.
  - R-02 ist B-17.
  - R-07 ist B-18.
  - R-12 ist B-40.
  - R-14 ist B-53.
  - R-16 ist B-19 und B-23.

**CI und Geheimnisse**
- **`.github/workflows/check.yml`:** Node 24, `npm ci`, `npm run check`, `guides:check`, gitleaks und osv-scanner als Binärdateien (nicht als Actions), concurrency je Branch. Sie wirkt erst mit Nr. 15.
- **`scripts/commit-if-green.sh`:** nutzt dieselben Befehle.
- **Schlüssel des Assistenten:**
  - Mit deinem OK verweigert `.claude/settings.json` das Lesen von `.env` per Read und Bash. `.env.example` bleibt lesbar.
  - Das ist eine Erschwernis, kein Schutz. `expo start` lädt `.env` selbst.

**Speicher und Start**
- **Migration:** `persist` hat schon `version: 1`. Dazu kommt `migrate`, für v1 die Identität. Bei unbekannter Version wirft es.
- **Form prüfen:** `migrate` und `merge` prüfen die Form mit einem Schema. Bei Abweichung werfen sie. Beim Start des Plans ging gültiges JSON mit falscher Form durch und stürzte erst beim Rendern ab. (Seit Schritt 19 behoben.)
- **Rohwert sichern:** in einem eigenen `StateStorage`-Wrapper in `getItem`, noch vor `JSON.parse`.
- **Fehlerpfad:** `onRehydrateStorage` meldet Fehler. In zustand 5 bleibt `hasHydrated` sonst `false`, und die App hängt für immer auf dem Splash-Screen.
- **`store/useHydrated.ts`** liefert `'laedt' | 'ok' | 'fehler'`.
- **RecoveryScreen:** `app/_layout.tsx` zeigt ihn bei `'fehler'`, mit „Erneut versuchen“ und „Zurücksetzen“. Nach „Zurücksetzen“ folgt `useAppStore.persist.rehydrate()`.
- **Test-Regel:** `STORE_VERSION` steigt nie ohne Migration. Ohne `migrate` würde zustand alle gespeicherten Fälle verwerfen.

**Pitch-Rhythmus**
- **`docs/PITCH_CHECK.md`:** Golden Path, Dark Mode, 200 % Schrift, VoiceOver-Stichprobe, Anleitung ohne Netz, Assistent mit und ohne Schlüssel.
- **`scripts/pitch-tag.sh`:** setzt nach grünem Check den Tag `pitch-JJJJ-Wxx`. Es bricht ab, solange ein regelbrechender Befund offen ist.
- **Demo-Startstand:** ein synthetischer Stand, per Tap in der Demo-Steuerung ladbar.

**Recht und Arbeitsweise**
- **`docs/recht/RECHTSFRAGEN.md`:** alle Fragen aus Abschnitt 10, mit Frist je Frage. Ein Termin mit Anwalt und DSB in Woche 2.
- **`docs/REVIEW_CHECKLISTE.md`:** Checkliste für Regeln, Consent-Flows und Texte.
  - In den Hotspots `store/appStore.ts`, `i18n/de.ts` und `app/fall/[id]/index.tsx` arbeitet nur eine Sitzung.
  - Höchstens so viele Commits am Tag, wie ihr am selben Tag prüfen könnt.
- **Apple Developer Program als Organisation beantragen**, zuerst die D-U-N-S-Nummer. Apps in regulierten Bereichen wie Versicherung reicht eine juristische Person ein (Apple 5.1.1(ix), Wortlaut prüfen).

**Abnahme**
- `npx eslint .` meldet 0 Fehler, und `npm run lint` prüft dasselbe.
- `npm run check` ist dreimal in Folge mit `--maxWorkers=2` grün.
- Tests mit kaputtem JSON, falscher Form, Version 99 und leerem Speicher zeigen nie einen Hänger.
- `__tests__/regressions/` enthält 18 Tests, und `BEFUNDE.md` listet R-01 bis R-18 als offen.
- `check.yml` liegt im Repo.
- `RECHTSFRAGEN.md` hat für jede Frage eine Frist.

### Phase 1: Fehlerklassen an der Wurzel · Woche 2–5

**Ziel:** Keine Absturz- und keine Regelbruch-Klasse mehr. Jede Regel hat genau eine Quelle, Screens fragen nur noch nach. Jede Weitergabe zeigt genau das, was gespeichert wird.

**Reihenfolge:** Zuerst die Befunde, die feste Regeln brechen: R-07, R-12, R-13, R-16, R-17. Danach die übrigen.

**Eine Regelquelle**
- **`model/policies/caseFacts.ts`:** eine kleine, reine Struktur je Fall. Sie enthält Status, Schadenfall, Zahler, aktive Buchungen je Art, letzten Call, aktive Consents, laufende Anleitung und Befund.
- **`model/policies/actions.ts`:** `availableActions(facts)` und `can(facts, key)`, mit einem Tabellentest je Status.
- **Umstellen:** je ein Commit pro Datei: `CloseCaseSheet.tsx`, `kosten.tsx`, `termin.tsx`, `ergebnis.tsx`, `lib/statusView.ts`, `app/fall/[id]/index.tsx` (zunächst nur die Abfragen).
- **Lint-Regel:** kein `.status ===` in `app/` und `components/`.

**Ein Weg, einen Fall zu öffnen**
- **`model/policies/openCase.ts`:** `findOpenCase`, `isEmptyCase` und `hasProgress`, je genau einmal. Beim Start des Plans gab es zwei Definitionen für „leer“ und „Fortschritt“. (Seit Schritt 23 je eine.)
- **`openCaseFor(deviceId, entry)`:** Die Store-Aktion setzt Entscheidung Nr. 13 an einer Stelle um und liefert `'neu' | 'ersetzt' | 'frage_weitermachen'`.
  - Sie ersetzt die Kopien in `app/fall/neu.tsx`, in den Pflege-Zeilen von `app/geraet/[id].tsx`, bei „Passt nicht“ und bei „Details → Anleitung starten“.
  - Ein laufender Fall, der nicht abgebrochen werden kann, bekommt nur „Weitermachen“.
- **`startGuide`** setzt eine offene Anleitung fort, statt neu zu beginnen (B-05).

**Befehle ohne Absturz**
- **`Result<T, Refusal>`:** `runCommand` und die Store-Aktionen geben es zurück. Erst wird der Übergang geprüft, dann folgen Consent, Ereignisse und Status in einem `set`.
- **`hooks/useCommand.ts`:** Sperre gegen Doppeltaps. Bei einer Ablehnung kommt ein ruhiger Toast, nie der Fehlertext der Domäne.
- **Fuzz-Test mit fast-check:** 1.000 zufällige Folgen aus `availableActions` über den echten Store.
- **Unbekannte Fallnummer:** Termin zeigt einen Hinweis statt abzustürzen (R-18).

**Fachliche Fehler**
- **Zahler aus `caseFacts`:** „Du zahlst …“ erscheint nur, wenn der Haushalt zahlt.
  - Während der Prüfung durch den Versicherer gibt es keinen Betrag als Zusage.
  - Vor einer Selbstzahler-Buchung bleibt der Preis sichtbar, er ist Pflichtinformation.
- **`model/policies/bookingRules.ts`:** höchstens eine aktive Buchung je Art. Nach einem abgelehnten Schadenfall bietet Termin keinen Freigabe-Termin an.
- **Vor-Ort-Diagnose:** Der Partner kommt aus der Buchung.
- **Chat-Grenze:** Die Grenze von 40 Nachrichten gilt wieder in `useAssistant` und in der Route. Danach verweist das Gespräch auf die Fachkraft.

**Datenschutz und Belegbarkeit**
- **`model/policies/consentScopes.ts`:** Zweck → Rechtsgrundlage, Empfängerart, Datenkategorien. Die Vorschau „Das geht an …“ und der gespeicherte Consent nutzen dasselbe Array.
- **Chat-Einwilligung:** wird ohne `caseId` gespeichert. Die Fallakte zeigt die Weitergabe an den Assistenten nur in Fällen, in denen Nachrichten gingen.
- **Mitteilungen:** werden als Consent gespeichert (`mitteilungen`, lit. a). Die Texte auf dem Sperrbildschirm sind neutral, ohne Gerät, Betrag, Betrieb, Entscheidung und Fallnummer.
- **Rückruf:** erst nach einem Bestätigungs-Sheet mit Empfänger und Daten.
- **Zwischenstand für den Widerruf bei lit. b:** Er gilt unabhängig von Nr. 16. Die Simulation prüft vor jedem Schritt den aktiven Consent und hält bei Widerruf an.
- **Versionierte Texte:** Jeder Hinweis- und Einwilligungstext bekommt `textVersion` und `textHash`. Ein Test schlägt fehl, wenn sich ein Text ohne neue Version ändert.
- **Hinweis am Eingabefeld:** Eigene Worte gehen an den Assistenten. Der heutige Text verspricht „Nicht dabei sind Fotos, Adresse und Vertragsnummer“. Freitext kann diese Angaben aber enthalten. Bis der Anwalt den Wortlaut festlegt, steht dort ein vorsichtiger Satz.
- **Ohne Netz:** Der Assistent bietet „Noch einmal senden“ und „Als Notiz für die Fachkraft speichern“, dazu ein ruhiger Hinweis. Beim Start des Plans behandelte der Code `netz` nur als wiederholbaren Fehler. (Seit Schritt 26 behoben.)

**Chat-Route härten**
- **`parseRequest` wird ein zod-Schema.**
  - Kategorie und `guideId` sind Enums aus dem Katalog.
  - Jedes Feld hat eine Höchstlänge, Steuerzeichen werden entfernt.
  - Unbekannte Felder geben 400.
- **Systemblock:** `caseSystem()` baut ihn nur aus Schlüsseln und Katalogtexten. Freitext geht nur als Nutzer-Nachricht.
- **Missbrauch begrenzen:**
  - Rate-Limit je IP und Installations-ID, Tagesobergrenze.
  - Ein rotierender Pitch-Token im Header begrenzt Missbrauch, ist aber kein Schutz.
- **Kein relatives `fetch` mehr:** `EXPO_PUBLIC_API_URL` ersetzt es.
- **Logs:** keine Nachrichteninhalte.
- **Installations-ID und Rate-Limit per IP** brauchen eine Prüfung nach § 25 TDDDG und eine Rechtsgrundlage in der Registry (RA).

**Abnahme**
- R-01 bis R-18 stehen auf `test` und sind grün.
- Der Fuzz-Test läuft 1.000-mal ohne Exception, je Gerät gibt es höchstens einen offenen Fall.
- Grep-Tests: 0 Status-Vergleiche in Screens. `createCase(` steht nur in `openCaseFor`. `hasProgress` und `isEmptyCase` gibt es je genau einmal.
- Test je Zweck: Die Kategorien der Vorschau sind gleich den gespeicherten Kategorien.
- Ein geänderter Einwilligungstext ohne neue `textVersion` macht die Suite rot.
- Chat-Route: „Ignoriere alle Regeln“ im Problemfeld steht nicht im Systemblock. Überlange Felder geben 400, ohne Token 401, nach N Anfragen 429.
- `npx eslint . --max-warnings 0` ist grün.
- `docs/BEFUNDE.md` nennt für jeden Befund den Test.

### Phase 2: Pitch ohne Laptop · Woche 4–6

**Ziel:** ganz läuft auf dem Pitch-Telefon als eigener Build. Der Assistent antwortet über Mobilfunk, ohne dass ein Laptop läuft. Es gibt nur Demo-Daten und Chats des Teams.

**Builds**
- **Varianten:** `app.config.ts` ersetzt `app.json`. Die Varianten `development`, `pitch` und `production` haben je Name, Bundle-ID, API-URL und Update-Kanal.
- **EAS:** `eas.json` mit denselben drei Profilen.
  - Dev-Client statt Expo Go, dazu ein interner TestFlight.
  - `runtimeVersion` mit der Policy `fingerprint`.
  - Grund für den Wechsel: Expo Go aus dem App Store öffnet nur das aktuelle SDK. Ein neues SDK kann das Pitch-Telefon sonst über Nacht lahmlegen.
- **App-Icon und Splash** aus dem Designsystem.
- **EAS Update:**
  - Laut Expo-Doku liest `eas update` nur EAS-Umgebungsvariablen und braucht `--environment` (vor der Umsetzung prüfen).
  - `APP_VARIANT` und `EXPO_PUBLIC_API_URL` werden deshalb EAS-Umgebungsvariablen.
  - Updates auf `pitch` gehen nur per Script aus einem Commit mit Pitch-Tag raus.
  - Im Pitch-Build lädt die App Updates nur per Tap in der Demo-Steuerung. Nach jedem Update wird der Fingerprint geprüft.
  - Rechtstexte ändern sich nur mit neuer `textVersion`.
- **Versionen:** Semver in `package.json`, kurze Notizen in `docs/RELEASES.md`.

**Assistent gehostet**
- **Host:** Die bestehende Route läuft per `expo export` über den `http`- oder `express`-Adapter von `expo-server` auf einem kleinen EU-Host mit Node 24. Der Adapter ist in `expo-server@58` vorhanden.
- **Betrieb:** `/health`, Logs ohne Inhalte, ein Budget-Alarm beim Anbieter, dazu Rate-Limit, Tagesgrenze und Pitch-Token aus Phase 1.
- **Transfer klären:** Für die Anthropic-API gibt es einen Transfermechanismus (siehe 3.4). Zugang hat nur das Team.
- **`docs/KOSTEN.md`:** Token und Kosten je Fall, gemessen an 10 Demo-Fällen, dazu die monatlichen Fixkosten. Grundlage: claude-opus-5-5 kostet 4 USD je Million Input-Token und 20 USD je Million Output-Token, laut Anthropic-Doku im Okt. 2026.

**End-to-End**
- **Maestro-Flows:** `e2e/golden-path.yaml`, `e2e/abbruch.yaml`, `e2e/dark-200.yaml`.
- **Nächtlicher iOS-Lauf:** Wo er läuft, legst du fest: macOS-Runner bei GitHub, EAS Workflows oder ein eigener Mac. Die Minuten stehen in `KOSTEN.md`.
- **Dark Mode und 200 %:** Vor `dark-200.yaml` setzt ein Shell-Schritt Schriftgröße und Dark Mode per `xcrun simctl ui`.
- **Android-Smoke:** der Golden Path einmal pro Woche im Emulator.
- **Pflicht vor jedem Pitch-Tag:** der Golden-Path-Lauf.

**Pitch-Betrieb**
- Ein zweites Pitch-Gerät mit demselben Build.
- Offline-Probe: Ohne Netz bietet der Assistent „Als Notiz speichern“ (Phase 1).

**Abnahme**
- Der Pitch-Build läuft auf beiden Pitch-Geräten.
- Der Assistent antwortet bei ausgeschaltetem Laptop, das Datum steht in `PITCH_CHECK.md`.
- Maestro ist 5 Nächte in Folge auf iOS grün.
- Die gehostete Route antwortet nach dem Limit mit 429.
- `KOSTEN.md` nennt die gemessenen Kosten je Fall.

### Phase 3: Reiner Kern, Ereignisse v2, Consent-Ledger · Woche 6–15

**Ziel:** Die ganze Fachlogik läuft ohne React, Texte und Konfiguration. Das Ereignisschema v2 ist so geschnitten, dass Versicherer, Hersteller und Löschung später passen. Das Gespräch wird nur noch gerendert.

**Eingangsbedingungen für das Einfrieren von v2:**

- mindestens 2 Versicherer-Gespräche in `docs/ANFORDERUNGEN_VERSICHERER.md`,
- eine Arbeitshypothese zur Rolle nach DSGVO (Nr. 22).

**3a: Ereignisschema v2**
- **Typisierte Ereignisse:** `model/events.ts` mit Payloads je Ereignistyp als diskriminierte Union, `schemaVersion` 2. `payload: Record<string, unknown>` entfällt.
- **`actor` wird `{kind, id}`.** Heute speichert der Store Anzeigenamen aus der Konfiguration.
- **Zwei Zeitstempel:** `occurredAt` (Gerät) und `recordedAt` mit `seq` (Server, bis Phase 5 leer). Entscheidungsereignisse tragen `policyVersion` und `tenantConfigVersion`.
- **Grundlage der Reparatur und Zahler** sind zwei getrennte Felder:
  - Grundlage: Versicherung, Gewährleistung, Reparaturpflicht des Herstellers nach § 479b BGB oder freiwillig.
  - Zahler: Versicherer, Händler, Hersteller oder Haushalt.
  - Die Herstellerpflicht ist eine Pflicht zur Reparatur, oft gegen ein angemessenes Entgelt. Sie macht den Hersteller nicht automatisch zum Zahler.
  - Dazu kommen angebotene Reparatur mit Preis, Dauer, Ablehnungsgrund, Ersatzteil und die Verlängerung der Gewährleistung bei Reparatur.
  - Gebaut wird nur der Versicherer-Weg, der Rest ist nur typisiert. Die Feldliste prüft der Anwalt (RA).
- **Kein Klartext-Personenbezug im Payload:** Freitext (Problem, Notiz, Chat) liegt als löschbarer Datensatz, das Ereignis trägt nur den Verweis.
- **Stabile IDs in der Konfiguration:** Zeitfenster und Partner bekommen IDs. `Case.problemLabel` wird `problemKey` plus optionalem `freeText`.
- **Migration:** `store/migrations/v2.ts` übersetzt bekannte Texte per Lookup in IDs, Unbekanntes bleibt `legacyText`. Vorher wird der Rohwert gesichert.
- **Fixtures:** synthetisch oder geschrubbt. Ein CI-Check blockt Freitext und Bilder in Fixtures.
- **Importgrenze:** `no-restricted-imports` für `model/**`, auch für relative Pfade. Verboten sind react, react-native, expo-\*, `@/i18n`, `@/config`, `@/store`, `@/services`, `@/components`.
- **`docs/DATA_MODEL.md`** wird im selben Commit wie das Schema v2 aktualisiert.
- **Consent-Ledger:**
  - Ein Ereignis je Einwilligung oder Bestätigung, nur anhängen.
  - Die Wirkung eines Widerrufs folgt Nr. 16.
  - Die Kenntnisnahme des Datenschutzhinweises ist ein eigenes Ereignis, keine Einwilligung.
  - Die Fallakte bekommt den Abschnitt „Wer hat was bekommen“, direkt aus dem Ledger.

**3b: decide und evolve, Gespräch zerlegen**
- **Befehle als Ereignisse:** Die Store-Aktionen werden gruppenweise `dispatch(command) → decide → Event[] → evolve`. Gruppen: Anleitung, Call, Schadenfall, Buchung, Einwilligung, Chat. Ein Commit je Gruppe.
- **`rebuild(events)` deepEqual:** nur für die Aggregate, die später zum Server wandern: Consent, Schadenfall, Buchung, Fallnummer.
- **Ereignisse je Fall:** Sie liegen in `eventsByCase` statt in einem flachen Array.
- **Das Gespräch zerlegen:**
  - `model/projections/conversation.ts` mit `conversationSteps(facts)` und `nextReplies(facts)` ersetzt die 400 Zeilen if/else in `app/fall/[id]/index.tsx`. Dazu Tabellentests je Status.
  - Unter `components/app/thread/` gibt es eine Komponente je Kartentyp. `index.tsx` hat am Ende höchstens 300 Zeilen.
- **Services:** `diagnosis.answer` und `video.finding` werden async und im Handler aufgerufen. Das Ergebnis wird ein Ereignis. Kein Service-Aufruf mehr beim Rendern.
- **Simulation:** Sie zieht nach `services/mock/insurerSimulator.ts` und `partnerSimulator.ts`, hinter `InsurerPort` und `PartnerPort`. Contract-Tests in `services/__contract__/`.
- **Selektoren:** mit `useShallow` für die 14 Komponenten mit Voll-Abo. Die Regel gegen `useAppStore()` ohne Selektor kommt jetzt, gleich als Fehler.
- **`DeviceCard`:** bekommt `React.memo` und stabile Callbacks.
- **Schreibvorgänge** erst bündeln, wenn eine Messung es verlangt. Consent- und Claim-Ereignisse werden immer sofort geschrieben, beim Wechsel in den Hintergrund ebenfalls.

**3b: Mandant, Kategorien, Fotos**
- **Mandant:** `config/tenant.ts` mit `TenantConfig` und `useTenant()`. `demo.config.ts` wird nur im Kompositions-Root gelesen, eine Lint-Regel schützt das. `linkContract` hängt Verträge an, statt sie zu ersetzen.
- **Kategorien:** `content/categories.ts` hat einen Deskriptor je Gerätekategorie. `DeviceScan`, `lib/appliance.ts`, `hasGuides` und `lib/chat/prompt.ts` lesen daraus. `de.maintenance` wird nach Kategorie getrennt.
- **Formate:** `format.ts` nimmt Locale und Währung aus der `TenantConfig`.
- **Fotos:** sofort ins Dokumentenverzeichnis kopieren, dann die Rohbytes hashen (3.5). Ein Test verbietet `skipProcessing`.

**Projektionen für den Vertrieb**
- **`model/projections/insurerView.ts`:** nur Fälle mit aktivem Consent für genau diesen Empfänger, die Freigabe mit `actor` mensch oder regel.
- **`manufacturerAggregates.ts`:** Aggregate brauchen einen eigenen Zweck mit Rechtsgrundlage und Prüfung nach Art. 6 Abs. 4 DSGVO (RA).
  - 10 Fälle je Zelle sind ein Startwert, kein Nachweis für Anonymität.
  - Kombinationen von Merkmalen und Abfragen über die Zeit werden geprüft.
  - Fachkräfte und Betriebe zählen auch als Betroffene.
- **Einzelfall an Hersteller** nach Nr. 29.
- Daraus entsteht eine statische Demo-Seite oder Folien für Versicherer-Gespräche, außerhalb der App und ohne Link aus der App.

**Versicherer-Anforderungen (Produkt, ab Woche 4)**
- Strukturierte Gespräche mit 2–3 Versicherern.
- Themen: Hosting, Meldeformat (REST, BiPRO, SFTP), Rolle nach DSGVO, Felder aus `DATA_MODEL.md` §3, verlangte Nachweise, wann eine Schadenmeldung als zugegangen gilt.

**Abnahme**
- Die Importgrenze für `model/**` hat 0 Verstöße.
- Kein String in den Ereignissen der Fixtures kommt in `de.ts` oder in Anzeigenamen der Konfiguration vor.
- Die Migration v1 → v2 ist mit Fixtures grün, der Rohwert ist gesichert.
- Der deepEqual-Test für Consent, Schadenfall, Buchung und Fallnummer ist grün.
- Consent-Einträge werden nur angehängt (Test).
- `index.tsx` hat höchstens 300 Zeilen.
- Render-Zähltest: Ein Schreibvorgang an einem fremden Fall rendert `DeviceCard` 0-mal neu.
- Checklisten-Test „neue Gerätekategorie“: ein Content-Eintrag und ein Textblock in `de.ts`, keine weitere Datei.
- Ein gespeichertes Foto liegt im Dokumentenverzeichnis, und sein Hash passt.

### Phase 4: Reif für externe Testerinnen · Woche 12–17

**Ziel:** Bevor die erste Person außerhalb des Teams die App nutzt, sind Datenflüsse, Pflichthinweise, DSFA, Store-Vorgaben und das Verhalten des Assistenten belegt.

**Welcher Build an Externe geht:**

- Bis es echte Services gibt (Phase 5), testen Externe den **Pitch-Build mit Demo-Mandant**.
- Er ist als Testversion gekennzeichnet, und die Demo-Steuerung ist sichtbar statt versteckt.
- Vertrag, Fehlererkennung, Typenschild, Videocall, Freigabe und Betrieb sind dort Simulationen. Das steht in den Notes for Review und in der Einladung an die Testerinnen.
- Das Production-Profil ohne Demo kommt erst mit echten Services.

**Compliance-Registry und Pflichtdokumente**
- **`compliance/`:** Zwecke, Rechtsgrundlagen (lit. a, b, c oder f, RA), Datenkategorien, Empfänger, Fristen, Auftragsverarbeiter mit Ort und Transfermechanismus. `consentScopes.ts` zieht dorthin. Für jeden Zweck nach lit. f gibt es eine kurze Interessenabwägung.
- **`npm run compliance:generate`** erzeugt `docs/recht/VVT.md` und Entwürfe für die Datenschutzangaben im App Store. Die CI prüft, ob Code und Dokument auseinanderlaufen.
- **AVV-Register:** Anbieter des Assistenten, Host, Expo/EAS, GitHub, Apple TestFlight und Monitoring. Je Eintrag Rechtsgrundlage und Transfermechanismus. „Vertretbar“ ist keine Begründung.
- **DSFA nach Art. 35 DSGVO:** Für den Assistenten ist sie wahrscheinlich Pflicht. Die DSK-Muss-Liste nennt KI zur Steuerung der Interaktion mit Betroffenen (RA).
  - Sie umfasst auch Fotos aus der Wohnung, Versicherungsdaten und den Videocall.
  - Zufallsfunde nach Art. 9 in Fotos und Freitext werden geprüft.
  - Die DSFA liegt vor der ersten externen Testerin vor.
- **DSB:** förmlich benennen und der Aufsicht melden (Art. 37 Abs. 7 DSGVO, § 38 BDSG, RA).
- **Löschkonzept v1** nach Nr. 25.
- **Datenschutzhinweis nach Art. 13** im Onboarding, versioniert. Mindestalter für Einwilligungen nach lit. a im Einwilligungs-Sheet und in den Nutzungsbedingungen (RA).
- **Geräte-Zugriffe nach § 25 TDDDG:** Installations-ID, Push-Token, Speicherstand und Crash-Reporting werden je einzeln geprüft (RA).

**Assistent belastbar**
- **Für Externe nach Nr. 28:**
  - Variante A: Der Assistent ist für die externe Gruppe aus, eigene Worte werden eine Notiz.
  - Variante B: Der Provider-Adapter mit EU-Inferenz kommt schon jetzt, mit AVV und DSFA.
- **Eval-Satz in CI** mit mindestens 30 Fällen. Er prüft:
  - keine Kostenzusage,
  - er nennt sich Computerprogramm,
  - er schlägt nur Anleitungen aus dem Katalog vor,
  - er lenkt bei fremden Themen zurück,
  - eine Injektion im Problemfeld bleibt ohne Wirkung.
  - Der Satz läuft vor jedem Wechsel von Modell, Anbieter oder Prompt, mit festem Budget je Lauf.
- **Pflichthinweis nach Art. 50 Abs. 1 KI-VO:**
  - Er gilt seit dem 02.08.2026.
  - Den Wortlaut legt der Anwalt fest (Nr. 19).
  - Er steht sichtbar im Einwilligungs-Sheet und in der ersten Nachricht, barrierefrei.
- **Maschinenlesbare Kennzeichnung nach Art. 50 Abs. 2:** Sie betrifft jede Antwort des Assistenten, auch in Fallakte und Export (RA).

**Store und Build**
- **Notes for Review:** beschreiben jede Funktion, auch die Demo-Steuerung. Versteckte Funktionen regelt heute Apple 2.5.19, laut Prüfung, Wortlaut prüfen.
- **`ios.privacyManifests`** mit den Required-Reason-APIs.
- **Checkliste `docs/recht/STORE.md`:**
  - Einwilligung mit Nennung des Drittanbieters, bevor Daten an das Sprachmodell gehen (5.1.2(i)).
  - Kontolöschung in der App, sobald es Konten gibt (5.1.1(v)).
  - Einwilligung und sichtbarer Hinweis für Screenshots im Videocall (2.5.14).
  - Ein Demo-Konto für das Review.
  - Die Altersfreigabe.
- **Schutz auf dem Gerät:**
  - **iOS:** AsyncStorage ist laut Prüfung schon vom Backup ausgenommen. Ein Test hält das fest, und der neue Fotoordner wird ebenfalls ausgenommen. File Protection ist ein eigener Punkt für das gesperrte Gerät.
  - **Android:** `android.allowBackup` steht in Expo standardmäßig auf `true`. Es kommt auf `false`, oder es gibt Backup-Regeln.
  - Fallansichten werden im App-Switcher verborgen.
- **Crash-Reporting** nach Nr. 20: Opt-in, standardmäßig aus.

**Barrierefreiheit und Website**
- **`docs/a11y/Pruefprotokoll.md`:**
  - Golden Path mit VoiceOver (kleines und großes iPhone) und TalkBack (ein Android-Gerät).
  - Dazu 200 % Schrift und Dark Mode.
  - Wird je Release wiederholt.
  - Geprüft wird gegen BFSGV und EN 301 549, falls das BFSG greift (RA).
- **Test erweitern:** `__tests__/a11y.test.tsx` prüft heute nur das gesetzte `minHeight`. Er misst künftig auch Breite und `hitSlop` und schließt geöffnete Sheets ein.
- **Website:** Datenschutzerklärung, Impressum und Support-URL, abgestimmt mit den Hinweistexten der App aus derselben Registry.
- **Support:** ein Ablauf für Fragen von Testerinnen, mit Zuständigkeit und Antwortzeit.

**Abnahme (= Gate externe Tests)**
- Die DSFA liegt vor, die DSB ist benannt.
- Das VVT wird aus der Registry erzeugt, der Drift-Check ist grün.
- Das AVV-Register hat keinen offenen Eintrag, jeder Transfer hat einen Mechanismus.
- Nr. 28 ist entschieden und umgesetzt.
- Der Eval-Satz ist in CI grün.
- Der Art.-50-Hinweis erscheint vor der ersten Nachricht (Test).
- Das Prüfprotokoll für VoiceOver und TalkBack hat keine Blocker.
- Datenschutzerklärung und Support-URL sind online.
- Erst dann öffnet die externe TestFlight-Gruppe.

### Phase 5: Pilot-Backend nach dem Strangler-Muster · ab etwa März 2027 · nur mit LOI

**Ziel:** Der Server wird Stufe für Stufe zur Autorität und nutzt denselben Kern wie die App. Der Pitch läuft über einen Schalter weiter lokal.

**Monorepo und Team**
- npm workspaces, Umzug per `git mv` in einem eigenen Commit, der nur Pfade ändert.
- Die Domänen-Tests laufen in App- und Server-CI.
- `docs/adr/` hält jede Architektur-Entscheidung fest.
- **Onboarding für den freien Entwickler:**
  - Er verpflichtet sich auf Vertraulichkeit.
  - Zugriff zuerst nur auf Staging.
  - Schlüssel bekommt er nur über einen Secret-Manager.

**Server-Kern**
- **Stack:** Hono, Drizzle und Postgres in der EU, Node 24.
- **Tabellen:** `events` (nur anhängen, `seq`, `prev_hash`, `hash`), `consent_events`, `idempotency`, `case_projection`, `case_access`, `audit_log`. Personenbezug liegt in eigenen löschbaren Tabellen.
- **`POST /v1/commands`** mit `idempotencyKey` und `expectedVersion`. In einer Transaktion: laden → `decide` → anhängen → projizieren → Outbox.
- **Outbox:**
  - Sie liefert mindestens einmal aus. Jeder Versand hat eine feste Nachrichten-ID, so erkennt der Empfänger Doppelte.
  - `case_access` wird im selben Schritt wie der Versand geprüft, mit Zeilensperre.
- **Versionen:** Upcaster je `schemaVersion` in `packages/domain`. `TenantConfig.minAppVersion` legt die älteste erlaubte App fest. Die API unterstützt die aktuelle und die vorige App-Version.

**Stufen der Autorität**
- **Schalter je Service** in `TenantConfig.features` (`local | remote`), mit denselben Contract-Tests für beide Varianten.
- **Reihenfolge, je Stufe ein Release:**
  1. Spiegel ohne Autorität (nur Demo-Daten).
  2. Fallnummer vom Server.
  3. Einwilligungsregister.
  - → **Gate echte Daten** (siehe Abschnitt 0) und **Pilot-Gate**. Danach ist ein Concierge-Pilot möglich (Nr. 23): Es gibt eine interne Ops-Ansicht, ganz bearbeitet Schadenfall und Termin von Hand. Der Versicherer bekommt die Fallakte nach Bestätigung über einen gesicherten Weg.
  4. Schadenfall und Freigabe über `InsurerPort`. Die Simulation verlässt die App.
  5. Angebot und Preise aus der Mandantenkonfiguration des Servers.
  6. Termin über `PartnerPort`.

**Hilfe durch Menschen**
- **Videocall:** Anbieter mit EU-Standort, AVV, ohne Aufnahme, Screenshots nur mit Einwilligung (Nr. 30).
- **Ansicht für die Fachkraft:** Protokoll, Fotos und Befund (REVIEW 4.1).
- **Fachkräfte:** wer sie sind und wie sie eingebunden werden, regelt ein Vertrag mit den Betrieben.
- **Betriebe:** Sie nehmen Aufträge an, zuerst per Ops-Ansicht, dann über `PartnerPort`.
- **Intelligente Fehlererkennung im Pilot:** Regelwerk oder echte Erkennung (Nr. 30).
- **Support für Haushalte:** Zuständigkeit, Antwortzeit, Weg in der App.

**Schadenmeldung als Erklärung (RA)**
- **„Gemeldet“ erst mit Eingang:** Die App zeigt „gemeldet“ erst, wenn der Versicherer den Eingang bestätigt. Bis dahin steht dort „wird übermittelt“.
- **Bei Verzögerung** sagt die App das und nennt einen anderen Weg.
- **Zugang der Meldung:** Ob die Meldung über ganz schon als Anzeige nach § 30 VVG zugegangen ist, hängt davon ab, ob ganz Empfangsbote des Versicherers ist. Das regelt der Vertrag.

**Anmeldung und Assistent**
- **Konto je Haushalt** per E-Mail-Code, Passkeys später.
  - Tokens liegen in `expo-secure-store`, die Kontolöschung geht in der App.
  - Das Konto ist pseudonym, nicht „anonym“.
- **Versicherungsnehmerin nachweisen:** wie bei mehreren Personen im Haushalt (Nr. 24).
- **`/v1/assistant`:**
  - nur angemeldet, mit Rate-Limit je Konto und Fall.
  - Den Kontext liest der Server aus der Datenbank, die App schickt nur Text.
  - Für echte Daten läuft die Inferenz über Vertex eu oder Bedrock EU.

**Fotos, Zugriff, Offline**
- **Upload:** in EU-Object-Storage mit kurzlebigen Upload-URLs. Der Hash steckt in der URL (`x-amz-checksum-sha256`), oder der Server liest das Objekt danach und rechnet nach.
- **Zeit:** Gerätezeit und Serverempfangszeit werden getrennt ausgewiesen.
- **BOLA-Suite mit der echten App-Rolle:** Konto A liest keinen Fall von Konto B, kein Empfänger liest ohne aktives `case_access`.
- **Offline (B-55):**
  - Befehle warten in der Outbox, der Fall zeigt „Wird gesendet, sobald du online bist“.
  - Konflikte mit `expectedVersion` haben einen Test.

**Datenlebenszyklus**
- **Löschjob** nach den Fristen der Registry, auch für Chat-Nachrichten und den Ereignisstrom (Tombstone).
- **Envelope-Verschlüsselung** für Personenbezug.
- **Ehrliche Löschzusage:** Sie nennt die Frist einschließlich Backups.
- **Rechte der Betroffenen:**
  - Export nach Art. 15 und 20 als JSON.
  - Löschung nach Art. 17 mit Mitteilung an die Empfänger nach Art. 19.
  - Wer bei mehreren Verantwortlichen antwortet, regelt die Vereinbarung nach Nr. 22.

**Betrieb**
- Staging und Prod sind getrennt, Migrationen laufen über drizzle-kit, Backups täglich.
- Eine Wiederherstellung wird geübt.
- **`docs/BETRIEB.md`** mit dem Ablauf bei Störfällen, mit Meldewegen je Rolle:
  - an den Versicherer innerhalb der Frist aus dem Vertrag,
  - nach Art. 33 DSGVO.

**Abnahme**
- Dieselbe Domänen-Suite ist in App- und Server-CI grün.
- Die Contract-Tests sind für Mock und HTTP grün.
- Doppelt gesendete Befehle erzeugen 0 doppelte Ereignisse. Eine veraltete `expectedVersion` wird abgelehnt.
- BOLA und RLS: Ein fremdes Konto und ein Empfänger ohne `case_access` sehen 0 Zeilen, für jeden Endpunkt.
- Ein Test beendet die Weitergabe parallel zum Versand. Danach gibt es 0 Zustellungen.
- Der Upcaster-Test mit eingefrorenen v2-Folgen ist grün. Die App in Version n−1 besteht die Contract-Tests.
- Mit dem Schalter `local` laufen im Pitch-Build alle Flows ohne Netz, außer dem Assistenten.
- Gate echte Daten und Pilot-Gate sind vor dem ersten echten Fall abgezeichnet.

### Phase 6: Pilot, Dashboard, Inhalte · ab etwa Juni 2027 · nur mit Pilotvertrag

**Ziel:** Ein Versicherer arbeitet echte Fälle ab. Ein zweiter Mandant kommt ohne Code-Änderung dazu. Inhalte sind lizenziert und ohne App-Release erweiterbar.

**Anbindung des Versicherers**
- **Ausgehend:** ein signiertes Paket aus Fallakte, Ereignissen und Foto-Hashes über die Outbox, nur nach aktiver Bestätigung. Das Schlüsselmanagement wird festgelegt: wer signiert, wie rotiert wird, wie der Versicherer prüft.
- **Eingehend:** die Entscheidung mit Pflichtfeld `actor` (mensch oder regel).
  - Nach EuGH C-634/21 zählt, ob der Versicherer der Ausgabe von ganz tatsächlich maßgeblich folgt. Ein Satz im Vertrag reicht dafür nicht.
  - Deshalb gilt: Ablehnungen trifft immer ein Mensch, der den Fall wirklich prüft. Regeln dürfen nur zustimmen (§ 37 BDSG, RA).
  - Hinweise nach Art. 13 Abs. 2 lit. f und Auskunft nach Art. 15 Abs. 1 lit. h folgen daraus.
- **Partner-API `/partner/v1`:** nur, wenn der Pilot eine Systemanbindung statt eines Portals will.
  - Zugang über OAuth2 Client Credentials.
  - Webhooks nach Standard Webhooks, mit fester `webhook-id`.
  - Die OpenAPI-Beschreibung entsteht aus zod, oasdiff prüft Änderungen in CI.

**Versicherer-Dashboard**
- **`apps/dashboards`** (Next.js) liest nur Views über `case_access`. Das Personal meldet sich mit SSO oder MFA an.
- **Hersteller** sehen Aggregate nach 3b und Einzelfälle nur nach Nr. 29. **Händler** sehen nur Zahlen zu verknüpften Verträgen.
- **Jeder Portalzugriff** erscheint in der Fallakte des Haushalts.
- **Rolle beim Portalbetrieb:** nach Nr. 22. Jeder Unterauftragnehmer braucht dann die Genehmigung des Versicherers.
- Die App verlinkt nicht auf das Portal.

**Mandanten zur Laufzeit**
- **Co-Branding:** Der Server liefert die `TenantConfig` nach der Vertragsverknüpfung, signiert und versioniert.
  - Farben nur als Token-Namen.
  - Kein eigener Rechtstext je Mandant.
- **Mehrere Verträge und Kostenträger** je Haushalt.
- **Schalter je Unterauftragnehmer und Mandant:** zum Beispiel den Assistenten für die Versicherten eines Versicherers abschalten.

**Inhalte**
- **`packages/content/guides/<hersteller>/<modell>/`** mit Quelle, Lizenz, Version und `verbatimHash`. Ohne gültige Lizenz liefert der Server nichts aus.
- **`guides:check` bleibt:** Die wörtliche Prüfung gilt dann gegen die lizenzierte Quelle.
- **Auslieferung über den Server:** mit Version, offline zwischengespeichert. Die Anleitung speichert ihre `guideVersion`.

**Vertrag, Vertrauen, Store**
- **Trust-Paket in `docs/trust/`:**
  - Sicherheitsbeschreibung, TOM und Unterauftragnehmer.
  - Zusammenfassung des Pen-Tests, Wiederherstellung, Incident-Prozess.
  - Transparenz zum Assistenten.
  - DORA-Anhang mit LEI und Exit-Export (RA).
- **Store-Release** für die Plattformen, die der Pilot braucht. Die Datenschutzangaben kommen aus der Registry.
- **BFSG:** Informationen nach § 14 BFSG mit Anlage 3, falls das Gesetz greift (RA).
- **Schritt 15 aus dem Bauplan:**
  - Fallakte als PDF auf dem Server, aus derselben Projektion.
  - Pflege-Erinnerung per Push, nur mit Consent `mitteilungen`.
  - Kaufbeleg-Foto.
  - Hinweis „Zuerst der Händler“ (B-41).
- **Formular für Reparaturinformationen:** Das Europäische Formular stellt der Reparaturbetrieb aus, nicht ganz (RA).
- **Schwere Nachweise nur auf Verlangen:** qualifizierte Zeitstempel, Object Lock, App Attest und ISO 27001 nur, wenn ein Versicherer sie ausdrücklich verlangt.

**Abnahme**
- Ein Pilotfall läuft mit echten Menschen: Schadenfall, Freigabe durch einen Menschen, Termin, Abschluss.
- Zwei Mandanten laufen im selben Build, der Unterschied betrifft 0 Zeilen Code.
- Ohne aktives `case_access` zeigt das Dashboard keinen Personenbezug. Jeder Portalzugriff steht in der Fallakte (Test).
- Eine Anleitung ohne Lizenz wird nicht ausgeliefert. Eine Anleitung eines zweiten Herstellers kommt ohne Store-Build.
- Die Store-Freigabe liegt vor.

---

## 5. Was sich für die Arbeitsweise und die Regeln ändert

**Ablauf**
- Die Schritte stehen in `docs/BUILD_PLAN.md` Abschnitt 8. Schritt 15 zieht dorthin (Phase 6), Abschnitt 5 verweist darauf.
- In Abschnitt 6 von `BUILD_PLAN.md` steht bei allem, was später kommt, die Phase.

**Änderungen an `CLAUDE.md`** machst du selbst. Sie kommen erst, wenn der Code sie erfüllt:
- „Schritte aus BUILD_PLAN Abschnitt 5 und 8 der Reihe nach.“ Gilt ab sofort.
- „`npm run check` prüft alles“, nach Phase 0.
- „Keine Status-Vergleiche in Screens“, nach Phase 1.
- „Keine Texte und Anzeigenamen in Ereignissen“, nach Phase 3a.
- „Nie KI oder AI“ bekommt eine Ausnahme nur für den Pflichtsatz nach Art. 50, falls der Anwalt den Gesetzesbegriff verlangt (Nr. 19).

**Was die Regeln berührt, ohne sie zu ändern**
- Die Compliance-Registry speichert nur Schlüssel auf `i18n/de.ts`. Die Texte bleiben dort.
- Der Demo-Mandant bleibt in `config/demo.config.ts`, bis der Server in Phase 6 Mandanten liefert.
- Anleitungen vom Server bleiben wörtlich, `guides:check` prüft weiter.
- Die Quelle der Tokens für App und Dashboards bleibt das Designsystem. Eine Umkehr wäre deine Entscheidung.

**Sitzungen**
- Mit deinem OK bekommt `model/` eine eigene `CLAUDE.md` mit den Regeln des Kerns.
- Skills `neues-ereignis` und `neue-geraetekategorie` als Checklisten.
- In `store/appStore.ts`, `i18n/de.ts` und `app/fall/[id]/index.tsx` arbeitet nur eine Sitzung gleichzeitig.
- Menschliches Review ist Pflicht für `model/policies/`, Consent-Flows, Hinweistexte, `config/` und die Registry.

**Abhängigkeiten**
- Upgrades von Expo SDK, React Native und TypeScript kommen als eigener Schritt zwischen den Phasen. Expo höchstens eine SDK-Version hinter dem aktuellen Stand.
- Einmal im Monat `npm outdated` und osv-scanner. Das Ergebnis steht in `docs/RELEASES.md`.

---

## 6. Entscheidungen für dich

| Nr. | Frage | Empfehlung | Bis wann |
|---|---|---|---|
| 15 | Arbeiten die Sitzungen künftig mit Branch und PR? | Ja: Branch und PR je Schritt, CI muss grün sein, Merge nur durch einen von euch beiden. Erst dann wirken CI und Pflichtprüfungen. | Ende Woche 1 |
| 16 | Was bewirkt ein Widerruf bei lit. b? | Zwei getrennte Aktionen: „Anfrage zurückziehen“ storniert die noch nicht erbrachte Leistung und stoppt weitere Weitergaben. „Weitergabe beenden“ stoppt nur Künftiges. Lit. b ist keine Einwilligung, deshalb heißt es nicht „Widerruf“. Ob sich ein gemeldeter Schadenfall zurücknehmen lässt, klärt der Anwalt (RA). Bis dahin gilt der Zwischenstand aus Phase 1. | vor Phase 3a |
| 17 | Wann wechselt der Pitch auf einen eigenen Build? | Woche 4, mit dem Apple Developer Program als Organisation. Den Antrag stellst du in Woche 1. | Antrag Woche 1 |
| 18 | Wo laufen der Assistent und später die Kerndaten? | Phase 2: kleiner EU-Host plus Anthropic-API, nur Team, mit Transfermechanismus. Für echte Daten: Vertex AI eu oder Bedrock EU, je nach Verfügbarkeit des Modells. Den Anbieter der Kerndaten (z. B. STACKIT, Hetzner oder AWS Frankfurt) wählst du nach den Versicherer-Gesprächen. Der Code bleibt bei Standard-Postgres, S3-API und OpenTelemetry. | Chat-Host vor Woche 4, Rest vor Phase 5 |
| 19 | Wie lautet der Pflichthinweis nach Art. 50 KI-VO neben der Regel „nie KI oder AI“? | Ein Satz im Wortlaut des Anwalts, sichtbar vor der ersten Nachricht. Name und Marketing ändern sich nicht. Verlangt der Anwalt den Gesetzesbegriff, kommt er nur in diesen Pflichtsatz, mit einer Ausnahme in `CLAUDE.md`. | vor dem Gate in Phase 4 |
| 20 | Kommt Crash-Reporting in die App? | Ja, mit EU-Datenregion als Opt-in, standardmäßig aus, ohne Replay und ohne Text in Breadcrumbs (§ 25 TDDDG, RA). Analytics bleibt aus. | vor Phase 4 |
| 21 | Wie tief geht das Whitelabel? | Co-Branding: ganz bleibt Marke und Palette, der Versicherer erscheint mit Name und Logo. Ein Build reicht. Eigene Apps nur auf Kundenwunsch (Apple 4.2.6 beachten). | vor Phase 3b |
| 22 | Welche Rolle hat ganz nach DSGVO gegenüber Versicherer und Betrieb? | Drei Möglichkeiten: getrennte Verantwortliche, gemeinsame Verantwortung nach Art. 26 oder Auftragsverarbeitung nach Art. 28. Co-Branding, Einladungslink und eine gemeinsame Fallakte sprechen für Art. 26. Dann kommt das Wesentliche der Vereinbarung in den Datenschutzhinweis. Arbeitshypothese vor Phase 3a, Bestätigung durch den Anwalt vor Phase 5 (RA). | Hypothese vor 3a |
| 23 | Wie startet der erste Pilot? | Concierge-Pilot nach Strangler-Stufe 3, erst nach Gate echte Daten und mit unterschriebenem Pilotvertrag. Der Vertrag enthält die Klauseln nach Art. 30 DORA und die Vereinbarung nach Nr. 22. Ob die Bearbeitung von Schadenfällen von Hand eine Ausgliederung nach § 32 VAG ist, klärt der Anwalt (RA). | mit dem Pilotvertrag |
| 24 | Wie melden sich Haushalte an, und wie viele Personen gibt es je Haushalt? | E-Mail-Code, danach Passkeys, kein Social Login. Eine Person ist Versicherungsnehmerin, nachgewiesen über einen Einladungslink des Versicherers. Weitere Personen erst, wenn der Pilot sie braucht (Nr. 2, `DATA_MODEL.md` §5). | vor Phase 5 |
| 25 | Welche Löschfristen gelten? | Vorschlag: Chat 90 Tage nach Abschluss. Fotos, Ereignisse und Consent-Nachweise 3 Jahre nach Jahresende des Abschlusses. Rechnungsdaten 8 bzw. 10 Jahre. Server-Logs 30 Tage. Je Mandant nur kürzer (RA). | Entwurf Ende Phase 4 |
| 26 | Wie gehst du mit Lizenz und Haftung der Anleitungen um? | Für Pitch und Tests nur Demo. Gespräche über eine Lizenz laufen parallel. Ohne Lizenz keine Anleitungen im Production-Build, nur ein Hinweis auf die Gebrauchsanweisung. Eigene Texte bleiben ausgeschlossen. Haftung und Versicherung klärt der Anwalt vor dem Pilot (RA). | vor dem Gate in Phase 4 |
| 27 | Gibt es im Pilot Selbstzahler-Buchungen? | Nein. Danach ist der Fachbetrieb Vertragspartner, mit Pflichtinformationen, Button-Lösung und Widerrufsbelehrung in seinem Namen. Die eigenen Pflichten von ganz als Vermittler prüft der Anwalt (RA). | vor Phase 6 |
| 28 | Was passiert mit dem Assistenten für externe Testerinnen? | Variante A, also aus für die externe Gruppe, eigene Worte werden eine Notiz. Variante B mit EU-Inferenz nur, wenn der Assistent Teil des Tests sein muss. | vor dem Gate in Phase 4 |
| 29 | Gibt es den Einzelfall mit Einwilligung für Hersteller weiter? | Ja, wie in `DATA_MODEL.md` vorgesehen: Das Hersteller-Portal zeigt Fälle mit aktivem `hersteller_einzelfall` über `case_access`, alles andere nur als Aggregat. Wenn nein: Der Schalter im Profil fällt weg. | vor Phase 6 |
| 30 | Welche Fehlererkennung und welcher Videoanbieter im Pilot? | Fehlererkennung: im Pilot das Regelwerk mit Rückfrage, eine echte Erkennung erst mit Daten aus dem Pilot. Videoanbieter: EU-Standort, AVV, ohne Aufnahme, Auswahl nach Angebot. | vor Phase 5 |

---

## 7. Risiken

| Risiko | Gegenmittel |
|---|---|
| Ein Umbau bricht den Pitch kurz vor einem Termin | Pitch-Tag nach grünem Check, 48 Stunden Merge-Freeze, ab Phase 2 Maestro vor jedem Tag, zweites Gerät. Neue Pfade nur hinter Schaltern. |
| Die Review-Zeit reicht neben Vertrieb und Pitch nicht | Etwa 3 PT pro Woche für die Technik eingeplant, Puffer über Weihnachten. Obergrenze für Commits je Tag, Review-Checkliste, eine Sitzung je Hotspot. |
| Die Migration v1 → v2 verliert den Demo-Stand | Rohwert vor `migrate` sichern, Form prüfen, synthetische Fixtures, RecoveryScreen, Demo-Startstand per Tap. |
| Sitzungen verwässern Modulgrenzen oder ändern Rechtstexte nebenbei | Importgrenze für `model/`, textHash-Test, Drift-Check zwischen Registry und VVT, Pflicht-Review. |
| Antworten von Anwalt und DSB kommen zu spät | `RECHTSFRAGEN.md` ab Woche 1 mit Fristen, feste Termine im Monat, immer die strengere Variante bauen. |
| Chats gehen ohne Transfermechanismus in ein Drittland | Mechanismus vor Phase 2. Für Externe Nr. 28, für echte Daten der EU-Provider mit Eval-Satz. |
| Missbrauch der Chat-Route kostet Geld | zod, Kontext nur aus Schlüsseln, Rate-Limit, Tagesgrenze, Budget-Alarm, ab Phase 5 Anmeldung. |
| Das Schema v2 friert ein, bevor Kunden ihre Anforderungen nennen | Versicherer-Gespräche als Eingangsbedingung für 3a, Upcaster je Version. |
| Plattform auf Vorrat | Phase 5 und 6 nur mit LOI bzw. Vertrag, Concierge-Pilot zuerst. |
| Append-only widerspricht Löschpflichten | Kein Klartext-Personenbezug im Umschlag, Tombstones, Envelope-Verschlüsselung, ehrliche Löschzusage (RA). |
| Der Versicherer verlangt DORA-, ISO- oder Souveränitätsnachweise | Im ersten Gespräch abfragen, Trust-Paket, Pen-Test vor echten Daten, anbieterneutraler Code. |
| Ablehnung im App Store | `STORE.md`, Notes for Review mit allen Funktionen, Konto als Organisation, Datenschutzangaben aus der Registry. |
| Expo- oder RN-Upgrades brechen den Build | Dev-Client, Fingerprint-Runtime, Upgrades als eigener Schritt zwischen den Phasen. |
| Eine Anleitung oder ein Befund führt zu einem Schaden | Nur lizenzierte Herstellertexte, Sicherheitshinweise vor dem Schritt, Haftung und Versicherung klärt der Anwalt vor dem Pilot. |

---

## 8. Bewusst nicht

- **Das Gespräch nicht auf einmal neu schreiben.** Erst die Regeln herausziehen, dann die Karten einzeln auslagern.
- **Keine neue State-Bibliothek** (Redux, XState) und kein TanStack Query über einem lokalen Store.
- **Kein Wechsel auf pnpm oder Turborepo.** npm workspaces reichen, und erst ab Phase 5.
- **Kein Frischstart des Stores.** Jede neue Version kommt mit Migration und Sicherung.
- **Keine Fixtures aus echten Gerätedaten im Repo.**
- **Flakes nicht über höhere Timeouts verstecken.**
- **Keine `tenantId` am Fall.** Zugriff nur über `case_access`.
- **Kein Umbau der Persistenz auf SQLite oder SQLCipher**, solange es nur Demo-Daten gibt.
- **Kein Crypto-Shredding je Fall**, kein Object Lock, kein App Attest, keine qualifizierten Zeitstempel und kein ISO 27001, bevor ein Kunde das verlangt.
- **Keine Server-Autorität über den Chat hinaus und keine Dashboards ohne LOI.** Kein Portal, bevor Ledger, `case_access` und RLS laufen.
- **Keine Microservices**, kein GraphQL, kein Kubernetes, kein Kafka, keine CRDTs.
- **Kein Analytics-SDK und kein Session-Replay.** Kennzahlen entstehen aus Ereignissen.
- **Keine zweite Sprache auf Vorrat** und kein vorsorglicher Umbau der 54 Direktimporte von `de`. Nur `model/` muss textfrei werden.
- **Die Quelle des Designsystems nicht umdrehen.**
- **Keine Fotos zum Trainieren** der Fehlererkennung ohne eigenen, widerrufbaren Zweck nach lit. a.
- **Kein Payment**, kein Galerie-Import, keine Portal-Links, kein zweiter Chat.
- **Geschäftsregeln nie nur auf dem Server bauen.**

---

## 9. Die ersten zwei Wochen

| Tag | Was |
|---|---|
| 1 | `.nvmrc` mit 24, `engines`, README nennt Node 24. |
| 1 | `lint` wird `eslint . --max-warnings 10`, die 3 Fehler werden behoben. |
| 2 | Neue Lint-Prüfungen als lokale Regeln, die Textregel erfasst Ternäre, Template-Literale und Arrays. |
| 2 | Jest-Projekte `unit` und `ui`, die 3 wackeligen Tests mit Fake Timers. |
| 3 | `.github/workflows/check.yml` und `scripts/commit-if-green.sh`. |
| 3 | `migrate`, Formprüfung, Sicherung des Rohwerts, Fehlerpfad, Tests mit kaputtem Speicher. |
| 4 | RecoveryScreen. |
| 4 | `__tests__/regressions/` mit R-01 bis R-18, `BEFUNDE.md` listet sie als offen. |
| 5 | `PITCH_CHECK.md`, `pitch-tag.sh`, synthetischer Demo-Startstand, `RECHTSFRAGEN.md`, `REVIEW_CHECKLISTE.md`. |
| 5 | Du: Termin mit Anwalt und DSB buchen, Apple Developer Program als Organisation beantragen, Nr. 15 entscheiden. |
| 6 | Regelbrüche zuerst: R-07, R-12, R-13, R-16, R-17. |
| 7 | `caseFacts.ts` und `actions.ts` mit Tabellentest je Status. |
| 8 | `openCase.ts` und `openCaseFor`, danach die vier Kopien. |
| 9 | `Result` statt Exceptions, `useCommand`, Fuzz-Test. |
| 10 | Chat-Route mit zod, Systemblock nur aus Schlüsseln, Rate-Limit. `BEFUNDE.md` nachziehen. |

---

## 10. Ungeprüft und offene Rechtsfragen

Das ist der Startbestand für `docs/recht/RECHTSFRAGEN.md`. Aussagen „laut Recherche“ stammen aus einer Web-Recherche vom 03.11.2026 mit Sekundärquellen. Sie sind vor der Umsetzung im Original zu prüfen.

**Technik, vor der Umsetzung gegen die aktuelle Doku prüfen**
- Ob claude-opus-5-5 auf Vertex AI eu oder auf Bedrock in einer EU-Region verfügbar ist, mit Structured Outputs und Prompt-Caching, und was es dort kostet.
- AVV-Bedingungen, Aufbewahrung, Ausschluss von Training, DPF-Zertifizierung und Unterauftragnehmer des Anbieters der Anthropic-API.
- Ob die Route mit `web.output: server` per `expo export` auf einem Node-Host ohne EAS stabil läuft. Die Adapter sind vorhanden, getestet ist es nicht.
- Verhalten von `eas update` mit `--environment` und EAS-Umgebungsvariablen.
- Ob zod 4 und fast-check ohne Anpassung unter Jest 30 mit jest-expo laufen.
- Sentry mit EU-Region unter Expo SDK 58 und RN 0.88.
- Welche Dienste eines EU-Hosters unter ein BSI-C5-Testat fallen.
- Kosten eines externen Pen-Tests für App und API, geschätzt 8.000 bis 15.000 Euro.

**Datenschutz (RA)**
- **Rolle nach DSGVO** gegenüber Versicherer und Betrieb (Nr. 22).
- **Widerruf bei lit. b:** Wirkung und Bestand beim Empfänger (Nr. 16).
- **Transfermechanismus für die Anthropic-API:** SCC mit Transfer-Folgenabschätzung oder DPF, `inference_geo` global oder us.
- **DSFA-Pflicht** für den Assistenten (DSK-Muss-Liste), Benennung der DSB (§ 38 BDSG).
- **Art. 22 DSGVO** bei regelbasierten Freigaben des Versicherers (EuGH C-634/21, § 37 BDSG).
- **§ 25 TDDDG** für jeden Zugriff auf das Gerät: Installations-ID, Push-Token, Speicherstand, Crash-Reporting.
- **Art. 8 DSGVO:** Mindestalter für Einwilligungen.
- **Rechtsgrundlagen neben lit. a und b:** lit. c und lit. f für Rate-Limit mit IP, `audit_log`, Server-Logs und Consent-Nachweise.
- **Hersteller-Aggregate:** Zweck, Rechtsgrundlage, Art. 6 Abs. 4, Anonymität.
- **Löschfristen** (Nr. 25), Löschung bei Hash-Kette, Ausnahmen nach Art. 17 Abs. 3.
- **Mehrere Verantwortliche:** wer Auskunft und Löschung beantwortet, Mitteilung an Empfänger nach Art. 19.

**KI-VO (RA)**
- **Art. 50 Abs. 1:** gilt laut Recherche seit dem 02.08.2026. Der Digital Omnibus (laut Recherche VO (EU) 2026/1744) hat ihn nicht verschoben. Den Wortlaut im Amtsblatt prüfen.
- **Rolle von ganz:** ob ganz Anbieter oder Betreiber ist.
- **Hinweis:** ob „Computerprogramm, kein Mensch“ genügt.
- **Art. 50 Abs. 2:** was die Kennzeichnung für jede Antwort, für Fallakte und Export verlangt.

**Versicherung und Finanzaufsicht (RA)**
- **§ 30 VVG:** Gilt die Meldung über ganz schon als Anzeige? Ist ganz Empfangsbote des Versicherers? Welche Form verlangen die AVB? Ab wann darf die App „gemeldet“ zeigen?
- **DORA:** Ist ganz IKT-Drittdienstleister mit Klauseln nach Art. 30 Abs. 2, bei kritischen oder wichtigen Funktionen auch nach Abs. 3? Wie ist das Informationsregister mit LEI zu füllen?
- **§ 32 VAG** (Ausgliederung) beim Concierge-Piloten, **§ 34d GewO** (Vermittlung).

**Verbraucher, Marktplatz, Reparatur (RA)**
- **Recht auf Reparatur:**
  - Laut Recherche gelten §§ 479a ff. BGB seit dem 23.07.2026. Fundstelle im Original prüfen.
  - Die Pflichten nach § 479b BGB, mit Entgelt und der Verlängerung der Gewährleistung.
  - Die Feldliste für Ereignisse v2.
  - Das Europäische Formular für Reparaturinformationen stellt laut Recherche freiwillig der Reparaturbetrieb aus (Art. 245 EGBGB).
  - Die Ökodesign-Frist von 15 Arbeitstagen für Ersatzteile gegen EUR-Lex prüfen (REVIEW 4.1).
- **Marktplatz:** Pflichten von ganz als Vermittler (§ 312l BGB mit Art. 246d EGBGB). Dazu die P2B-Verordnung (EU) 2019/1150, § 5b UWG zur Reihenfolge der Betriebe und, ab welcher Größe, Art. 30 bis 32 DSA.
- **Selbstzahler:** Button-Lösung nach § 312j Abs. 3 BGB und Widerrufsrecht im Namen des Fachbetriebs (Nr. 27).
- **BFSG:**
  - Gilt seit dem 28.06.2025.
  - Ob Buchungen in der App eine Dienstleistung im elektronischen Geschäftsverkehr sind.
  - Wer der Dienstleistungserbringer ist, ganz oder der Versicherer im Co-Branding.
  - Die Ausnahme für Kleinstunternehmen nach § 3 Abs. 3 hilft nur dem Anbieter selbst.
- **Produkthaftung:**
  - Ob App, Anleitungen und Fehlererkennung ein Produkt nach der Richtlinie (EU) 2024/2853 sind. Sie ist laut Recherche bis 09.12.2026 umzusetzen.
  - Wer haftet, wenn eine Anleitung oder ein Befund zu einem Schaden führt.
  - Was die Nutzungsbedingungen begrenzen dürfen.
  - Welche Versicherung ganz vor dem Pilot braucht.
- **Lizenz** der Anleitungstexte des Herstellers (Nr. 26).

**App Store (Wortlaut prüfen)**
- 5.1.2(i) Daten an Drittanbieter-Sprachmodelle, 5.1.1(v) Kontolöschung, 5.1.1(ix) regulierte Bereiche durch juristische Personen.
- 2.5.19 versteckte Funktionen (laut Prüfung, früher 2.3.1), 2.3.1(a) Notes for Review, 2.5.14 Aufnahmen und Screenshots, 4.2.6 Whitelabel-Apps.

---

## Anhang A: Wie der Plan entstand

Drei unabhängige Entwürfe aus verschiedenen Richtungen:

- **A „Stabil zuerst“:** schrittweise härten, Strangler-Muster.
- **B „Plattform und Partner“:** Backend, Mandanten, Dashboards, Integrationen.
- **C „Vertrauen und Recht zuerst“:** DSGVO, Sicherheit, Nachweise.

Drei Gutachter haben jeden Entwurf über Kreuz bewertet:

- ein CTO aus zwei B2B2C-Startups,
- ein Architekt für React Native und TypeScript-Backends,
- die Datenschutzbeauftragte eines Versicherers.

| Entwurf | Punkte (Summe aus 3 Gutachten) | Stärke | Schwäche |
|---|---|---|---|
| A Stabil zuerst | 124 | passt zum echten Team, richtige Reihenfolge | Recht zu spät, Assistent zu lange am Laptop |
| C Vertrauen zuerst | 106 | Consent-Ledger, Registry, Store-Wissen | zu schwer zu früh (SQLCipher, KMS je Fall) |
| B Plattform | 86 | sauberstes Zielbild, LOI-Gate | für ein Team gebaut, das es nicht gibt |

**Basis ist A.**

- Aus C kamen:
  - Rechtsfragen in Woche 1,
  - versionierte Hinweistexte,
  - Consent-Ledger und Registry,
  - Store-Checkliste.
- Aus B kamen:
  - früher eigener Build,
  - Provider-Adapter für EU-Inferenz,
  - `case_access` statt `tenantId`,
  - Versionsregeln für alte Apps,
  - das LOI-Gate.

Danach haben drei Prüfer die erste Fassung gegengelesen: Vollständigkeit, Technik, Recht. Version 2 behebt ihre 45 Punkte.

- **Gates neu geordnet:**
  - Gate echte Daten vor dem Concierge-Piloten.
  - Pilotvertrag statt LOI.
  - DSFA vor externen Tests.
- **Build für Externe geklärt.**
- **Lint-Budget repariert:** Die Selektor-Regel kommt erst in Phase 3b.
- **Neue Entscheidungen:** fortlaufend ab Nr. 15 nummeriert, damit sie nicht mit Nr. 1 bis 14 kollidieren.
- **Ergänzt:**
  - Hilfe durch Menschen,
  - Schadenmeldung als Erklärung,
  - Offline,
  - mehrere Personen,
  - Hersteller-Einzelfall,
  - Haftung,
  - Marktplatzpflichten,
  - Transfermechanismus.
- **Technik präzisiert:**
  - EAS Update,
  - Fotos im Cache,
  - RLS,
  - Jest-Projekte,
  - ESLint-Flat-Config,
  - Android-Backup.

## Anhang B: Bestätigte Befunde als Regressionstests

Aus der Code-Review vom 03.11.2026. Jeder Befund ist per Test oder Code-Trace bestätigt.

**Abstürze**
- **R-01** „Fall abbrechen“ in `in_reparatur`, `erledigt` oder `abgebrochen` (`components/nav/CloseCaseSheet.tsx:37`). B-04 wieder offen.
- **R-02** „Schadenfall melden“ nach der Meldung, mit verwaister Bestätigung (`app/fall/[id]/kosten.tsx:84`, `store/appStore.ts:740`). B-17 wieder offen.
- **R-03** „Neues Problem melden“, wenn der laufende Fall `in_reparatur` ist (`app/fall/neu.tsx:82`).
- **R-18** Termin mit unbekannter Fallnummer per Deep Link (`app/fall/[id]/termin.tsx:58`).

**Fehlverhalten**
- **R-04** Zwei offene Fälle über „Passt nicht“ (`app/fall/neu.tsx:84-98`). Verstößt gegen Nr. 13.
- **R-05** Zwei offene Fälle über eine Pflege-Zeile im Gerätedetail (`app/geraet/[id].tsx:131`). Verstößt gegen Nr. 13.
- **R-06** Fortschritt der Anleitung verloren über „Details → Anleitung starten“ (`app/fall/[id]/ergebnis.tsx:140`). Dazu: Stift mit anderem Symptom lässt eine Anleitung offen. B-05 wieder offen.
- **R-07** „Du zahlst 189 €“ während der Prüfung durch den Versicherer (`app/fall/[id]/kosten.tsx:141`). B-18 wieder offen, Regel „keine Kostenzusage“.
- **R-08** Zweite Buchung macht einen Selbstzahler-Fall unvollendbar (`kosten.tsx:112`, `store/appStore.ts:792`).
- **R-09** Termin ignoriert die Ablehnung des Schadenfalls (`app/fall/[id]/termin.tsx:67`, `lib/booking.ts:15`).
- **R-10** Befund nach Vor-Ort-Diagnose dem falschen Betrieb zugeschrieben (`store/appStore.ts:675`).
- **R-11** Grenze von 40 Nachrichten im Chat fehlt (`lib/chat/useAssistant.ts:49`).

**Datenschutz**
- **R-12** Widerruf einer Weitergabe nach lit. b ohne Wirkung (`store/appStore.ts:835`). B-40 wieder offen, Regel „keine Weitergabe ohne Bestätigung“.
- **R-13** Mitteilungen ohne gespeicherte Einwilligung (`lib/booking.ts:45`, `app/(tabs)/profil.tsx:84`).
- **R-14** Vorschau „Das geht an …“ zeigt mehr als die bestätigten Kategorien (`components/app/CaseFileCard.tsx:108`). B-53 wieder offen.
- **R-15** Chat-Einwilligung mit `caseId`, andere Fallakten zeigen nichts (`lib/chat/useAssistant.ts`, `app/fall/[id]/fallakte.tsx:29`).
- **R-16** Rückruf ohne Bestätigung (`store/appStore.ts:664`). B-19 und B-23 wieder offen.
- **R-17** Mitteilungstexte mit Falldetails auf dem Sperrbildschirm (`i18n/de.ts`, `notify`).

**Weitere kleine Befunde und wo sie behoben werden**

| Befund | Phase |
|---|---|
| Unvalidierte Felder in der Chat-Route | Phase 1 |
| Doppeltaps | Phase 1 |
| Hänger beim Laden des Speichers | Phase 0 |
| `tel:`-Links ohne Fehlerbehandlung | Phase 1 |
| Mitteilungs-Schalter im Web | Phase 1 |
| Vor-Ort-Diagnose ohne Preis und Zahler | Phase 1 |
| Zweig „Ersatzgerät“ ohne Rechtshinweis (heute nicht erreichbar) | Phase 3b |
