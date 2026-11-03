# Zukunftsplan: ganz vom Prototyp zur Plattform

Stand: 03.11.2026 · Entwurf zur Freigabe · Grundlage: Code-Review vom 03.11.2026, `docs/AUFTRAG.md`, `docs/DATA_MODEL.md`, `docs/BUILD_PLAN.md`, `docs/ENTSCHEIDUNGEN.md`

Dieser Plan beschreibt, wie die App und alles drumherum zukunftsfähig werden: Code, Tests, Builds, Server, Dashboards, Recht, Betrieb und Arbeitsweise. Er ändert nichts an den festen Regeln aus `CLAUDE.md`. Wo er eine Regel berührt, steht das als Entscheidung für dich in Abschnitt 6.

Mit **(RA)** markierte Punkte sind Rechtsfragen. Sie gehören zu Anwalt oder Datenschutzbeauftragter, bevor sie umgesetzt werden.

---

## 0. Kurzfassung

Zuerst beseitigst du die Fehlerklassen an der Wurzel:

- eine Regelquelle für „was ist jetzt erlaubt“,
- ein Weg zum Öffnen eines Falls,
- Befehle ohne Abstürze,
- Ereignisse mit Schlüsseln statt Texten.

Gleichzeitig wird jede Weitergabe belegbar, und die Rechtsfragen gehen schon in Woche 1 raus, weil sie die längste Vorlaufzeit haben. Danach wird `model/` ein reiner Kern, den später der Server unverändert nutzt, und der Pitch läuft ohne Laptop. Server-Autorität, Mandanten und Portale kommen erst mit einem Kunden, Schritt für Schritt hinter der bestehenden Naht `services/`. So bleibt der Pitch-Stand jede Woche grün.

| Phase | Zeitraum | Ziel | Aufwand (grob) | Start |
|---|---|---|---|---|
| 0 Sicherheitsnetz | Woche 1 | Jeder Commit voll geprüft, App startet immer, jeder Befund ist ein Test, Rechtsfragen gestellt | 4–5 PT Technik, 1 PT Produkt | sofort |
| 1 Fehlerklassen an der Wurzel | Woche 2–4 | Eine Regelquelle, keine Abstürze, alle 17 Befunde behoben | 10–12 PT Technik, 2 PT Produkt | nach 0 |
| 2 Pitch ohne Laptop | Woche 3–5 | Eigener Build, Assistent gehostet | 5–7 PT Technik | parallel zum Ende von 1 |
| 3 Reiner Kern, Ereignisse v2, Consent-Ledger | Woche 5–10 | Fachlogik ohne React und Texte, serverfähig | 25–30 PT Technik, 3 PT Produkt | nach 1 |
| 4 Reif für externe Testerinnen | Woche 8–12 | Datenflüsse, Pflichthinweise, Store-Vorgaben und Assistent belegt | 8–10 PT Technik, 3 PT Produkt, 3–5 PT Recht | parallel zu 3b |
| 5 Pilot-Backend | Monat 3–6 | Server wird Stufe für Stufe zur Autorität | 8–10 Wochen mit freiem Entwickler, Pen-Test, 5 PT Recht | **nur mit LOI** |
| 6 Pilot, Dashboard, Inhalte | Monat 6–10 | Ein Versicherer arbeitet echte Fälle ab | 10–14 Wochen, Nachtest, ca. 10 PT Recht | **nur mit Pilotvertrag** |

PT = Personentage einer steuernden und prüfenden Person. Die Laufzeit der Claude-Code-Sitzungen ist enthalten. Der Engpass ist die Review-Zeit, nicht das Schreiben von Code.

**Gates:**

- **Pitch-Gate (jede Woche):** `main` ist pitchfähig. Ein Tag wird nur nach grünem Check gesetzt.
- **Gate externe Tests (Ende Phase 4):** Erst danach nutzt jemand außerhalb des Teams die App.
- **LOI-Gate (Start Phase 5):** keine Server-Autorität über den Chat hinaus und keine Dashboards ohne Absichtserklärung eines Versicherers.
- **Gate echte Daten (in Phase 5):** Pen-Test ohne offene hohe Befunde, AVV, VVT, DSFA und eine Wiederherstellungsübung liegen vor.
- **Pilot-Gate (Start Phase 6):** Vertrag, Vereinbarung zwischen Verantwortlichen und AVV für das Portal sind unterschrieben.

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
  - Bis zum Gate am Ende von Phase 4 gibt es nur Demo-Daten und Chats des Teams.
  - Echte Haushaltsdaten kommen erst nach dem Gate in Phase 5 auf einen Server.
- **Erster Kunde:** ein Versicherer mit Geräteschutz. Ein LOI kommt frühestens im ersten Halbjahr 2027.
- **Werkzeuge:**
  - Das Repo bleibt privat auf GitHub, GitHub Actions ist verfügbar.
  - Paketmanager bleibt npm.
  - Expo bleibt, kein nativer Neubau.
- **Ablauf:** Die neuen Schritte kommen nach deiner Freigabe als Abschnitt 8 in `docs/BUILD_PLAN.md`. So gilt „Schritte der Reihe nach“ aus `CLAUDE.md` weiter. Änderungen an `CLAUDE.md` machst du selbst.
- **Laufende Kosten bis Phase 4 bleiben klein:** Apple Developer Program, EAS-Tarif, ein kleiner EU-Host und das Budget für den Assistenten. Phase 2 misst die genauen Zahlen.

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
  packages/compliance    Registry: Zweck, Rechtsgrundlage, Datenkategorien, Empfänger, Löschfrist,
                         Auftragsverarbeiter mit Ort und Transfermechanismus, Hinweistexte mit
                         textVersion und textHash. Daraus entstehen VVT und Store-Datenschutzangaben
  packages/contracts     zod-Schemas für Befehle, Ereignisse und API. OpenAPI erst mit Partner-API
  packages/content       Gerätekategorien und Anleitungen als Daten: Quelle, Lizenz, Version, verbatimHash
  packages/tenant        TenantConfig (Co-Branding, minAppVersion, Versionen der Rechtstexte),
                         Demo-Mandant „kranich“
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
  - `prevHash`/`hash` über den Umschlag.
  - Im Payload stehen nur Schlüssel, IDs und Cent. Personenbezug steht nur als Verweis auf löschbare Datensätze. So passen eine Hash-Kette und die Löschpflicht nach Art. 17 zusammen.
- **Consent-Ledger:** Nur anhängen, nie ändern. Der Status ist nur eine Projektion.
  - Lit. b kennt `bestaetigt` und `zurueckgezogen`, lit. a kennt `erteilt` und `widerrufen`.
  - Jeder Eintrag trägt Empfänger, Kategorien, `textVersion` und `textHash`.
- **Zugriff:**
  - Der Fall gehört dem Haushalt. Es gibt keine `tenantId` am Fall.
  - Empfänger lesen nur über `case_access`. Das wird aus dem Ledger abgeleitet: Empfänger, Fall, Zweck, Kategorien, Ende.
  - RLS prüft `case_access`. `tenant_id` steht nur an B2B-Zeilen.
  - Jeder B2B-Lesezugriff landet im `audit_log` und ist in der Fallakte sichtbar.

### 3.4 Reparatur-Assistent

- Er läuft nur über den Server.
- Der Systemkontext entsteht nur aus Katalogschlüsseln. Freitext geht ausschließlich als Nutzer-Nachricht.
- **Provider-Adapter:** Die Modell-ID kommt aus der Konfiguration, ein Eval-Satz läuft in CI.
  - Für die Demo die Anthropic-API. Die Inferenz läuft dort global oder in den USA, `inference_geo` kennt nur `global` und `us`. Das wird offen als Drittlandübermittlung dokumentiert.
  - Für echte Daten Vertex AI (Region eu) oder Amazon Bedrock (EU-Region). Dort gibt es den server-seitigen Parameter `fallbacks` nicht. Die Route nutzt dann die client-seitige Refusal-Middleware des SDK.

### 3.5 Fotos, Konfiguration, Regeln

- **Fotos:**
  - Auf dem Gerät werden EXIF und GPS entfernt. Danach wird genau dieser Bytestand mit sha256 gehasht.
  - Der Server rechnet den Hash nach und verkettet ihn.
  - Gerätezeit und Serverempfangszeit werden getrennt gespeichert.
- **Konfiguration:**
  - `TenantConfig` kommt über `useTenant()`, nie per Direktimport.
  - Build-Varianten laufen über `APP_VARIANT`: `development`, `preview` (mit Demo) und `production` (ohne Demo-Code).
  - Ab dem Pilot liefert der Server die Konfiguration signiert und versioniert.
- **Regeln:** Geschäftsregeln stehen nur in `packages/domain`, Rechtsregeln nur in `packages/compliance`.

---

## 4. Phasen

### Phase 0: Sicherheitsnetz · Woche 1

**Ziel:** Jeder Commit wird vollständig geprüft. Die App startet immer, auch mit kaputtem Speicher. Jeder bestätigte Befund steht als Test in der Suite. Der Pitch-Stand ist markiert, und die Rechtsfragen sind gestellt.

**Prüfungen**
- **Lint über das ganze Repo:** In `package.json` wird `lint` zu `eslint .` statt `expo lint`. `expo lint` prüft nur `app/`, `components/` und `src/`.
  - Heute meldet der volle Lauf 3 Fehler und 10 Warnungen. Zuerst die Fehler beheben, Start mit `--max-warnings 10`.
  - Die Warnungen folgen bis Ende Phase 1, dann gilt `--max-warnings 0`.
- **Textregel in `eslint.config.js`:** Sie erfasst auch Ternäre, Template-Literale und Arrays in JSX-Attributen und -Kindern.
- **Neue Lint-Warnung:** `useAppStore()` ohne Selektor. Sie wird in Phase 3b zum Fehler.
- **Node 24:** `.nvmrc` mit Node 24 und `engines` in `package.json`. Das README nennt heute „Node 20 oder neuer“, Node 20 hat keinen Support mehr.
- **Script `check:fast`:** tsc, eslint auf geänderten Dateien, Unit-Tests. Für den Stop-Hook der Sitzungen.

**Tests**
- Jest teilt sich in `projects`: `unit` (`model/`, `lib/`, `services/`, Umgebung node) und `ui` (jest-expo).
- Die 3 wackeligen Integrationstests laufen mit Fake Timers. Die Ursache sind echte Timer, unter anderem der 1-Sekunden-Simulationstimer. Ein höherer Timeout ist keine Lösung.
- **`__tests__/regressions/`:** je ein Test pro bestätigtem Befund (Anhang B), mit Datei und Zeile.
  - Jeder Test prüft das konkrete Symptom und ist als `test.failing` markiert.
  - Das Umstellen auf `test` gehört in denselben Commit wie die Behebung. Sonst sieht ein kaputter Test aus wie „rot wie erwartet“.

**CI und Geheimnisse**
- `.github/workflows/check.yml`: Node 24, `npm ci`, `npm run check`, `guides:check`, gitleaks, osv-scanner, concurrency je Branch. Sie wirkt erst ab dem ersten Push, den du freigibst (Entscheidung E1).
- `scripts/commit-if-green.sh` nutzt dieselben Schritte wie die CI.
- Mit deinem OK verweigert `.claude/settings.json` das Lesen von `.env*`. Dort liegt der Schlüssel für den Assistenten.

**Speicher und Start**
- **Migration:** `persist` bekommt `version` 1 und `migrate`. Für v1 ist das die Identität, bei unbekannter Version wirft es.
- **Fehlerpfad beim Laden:** `onRehydrateStorage` bekommt einen Fehlerpfad. Grund: In zustand 5 bleibt `hasHydrated` bei einem Ladefehler `false`, die App hängt dann für immer auf dem Splash-Screen.
- **`store/useHydrated.ts`** liefert `'laedt' | 'ok' | 'fehler'`. Nach einem Fehler wird der Rohwert gesichert, bevor `persist` ihn überschreibt.
- **`app/_layout.tsx`** zeigt bei `'fehler'` einen RecoveryScreen mit „Erneut versuchen“ und „Zurücksetzen“.
- **Test-Regel:** `STORE_VERSION` steigt nie ohne Migration. Heute würde zustand dabei alle gespeicherten Fälle verwerfen.

**Pitch-Rhythmus**
- `docs/PITCH_CHECK.md`: Golden Path, Dark Mode, 200 % Schrift, VoiceOver-Stichprobe, Anleitung ohne Netz, Assistent mit und ohne Schlüssel.
- `scripts/pitch-tag.sh` setzt nach grünem Check den Tag `pitch-2026-Wxx`.
- Ein synthetischer Demo-Startstand lässt sich per Tap in der Demo-Steuerung laden.

**Recht und Arbeitsweise**
- **`docs/recht/RECHTSFRAGEN.md`:** alle offenen Fragen aus Abschnitt 10, mit (RA) und Frist je Frage. Ein Termin mit Anwalt und DSB in Woche 2.
- **`docs/REVIEW_CHECKLISTE.md`:** Checkliste für Regeln, Consent-Flows und Texte.
  - In den Hotspots `store/appStore.ts`, `i18n/de.ts` und `app/fall/[id]/index.tsx` arbeitet nur eine Sitzung.
  - Höchstens so viele Commits am Tag, wie ihr am selben Tag prüfen könnt.

**Abnahme**
- `npx eslint .` meldet 0 Fehler, und `npm run lint` prüft dasselbe.
- `npm run check` ist dreimal in Folge mit `--maxWorkers=2` grün.
- Tests mit kaputtem JSON, Version 99 und leerem Speicher zeigen nie einen Hänger.
- `__tests__/regressions/` enthält 17 Tests.
- `check.yml` liegt im Repo, und der Tag `pitch-2026-W45` ist gesetzt.
- `RECHTSFRAGEN.md` hat für jede Frage eine Frist.

### Phase 1: Fehlerklassen an der Wurzel · Woche 2–4

**Ziel:** Keine Absturz- und keine Regelbruch-Klasse mehr. Jede Regel hat genau eine Quelle, Screens fragen nur noch nach. Jede Weitergabe zeigt genau das, was gespeichert wird.

**Eine Regelquelle**
- `model/policies/caseFacts.ts`: eine kleine, reine Struktur je Fall. Sie enthält Status, Schadenfall, Zahler, aktive Buchungen je Art, letzten Call, aktive Consents, laufende Anleitung und Befund.
- `model/policies/actions.ts`: `availableActions(facts)` und `can(facts, key)`, mit einem Tabellentest je Status.
- Danach je ein Commit pro Datei: `CloseCaseSheet.tsx`, `kosten.tsx`, `termin.tsx`, `ergebnis.tsx`, `lib/statusView.ts`, `app/fall/[id]/index.tsx` (zunächst nur die Abfragen).
- Lint-Regel: kein `.status ===` in `app/` und `components/`.

**Ein Weg, einen Fall zu öffnen**
- `model/policies/openCase.ts`: `findOpenCase`, `isEmptyCase` und `hasProgress`, je genau einmal. Heute gibt es zwei Definitionen für „leer“ und „Fortschritt“.
- Die Store-Aktion `openCaseFor(deviceId, entry)` setzt Entscheidung 13 an einer Stelle um. Sie liefert `'neu' | 'ersetzt' | 'frage_weitermachen'`.
- Sie ersetzt die Kopien in `app/fall/neu.tsx`, in den Pflege-Zeilen von `app/geraet/[id].tsx`, bei „Passt nicht“ und bei „Details → Anleitung starten“.
- `startGuide` setzt eine offene Anleitung fort, statt neu zu beginnen (B-05).

**Befehle ohne Absturz**
- **Erst prüfen, dann schreiben:** `runCommand` und die Store-Aktionen geben `Result<T, Refusal>` zurück. Erst wird der Übergang geprüft, dann folgen Consent, Ereignisse und Status in einem `set`. Das behebt `reportClaim`.
- **`hooks/useCommand.ts`:** sperrt gegen Doppeltaps und zeigt bei Ablehnung einen ruhigen Toast, nie den Fehlertext der Domäne.
- **Fuzz-Test mit fast-check:** 1.000 zufällige Folgen aus `availableActions` über den echten Store.

**Fachliche Fehler**
- **Zahler aus `caseFacts`:** „Du zahlst …“ erscheint nur, wenn der Haushalt zahlt.
  - Während der Prüfung durch den Versicherer gibt es keinen Betrag als Zusage.
  - Vor einer Selbstzahler-Buchung bleibt der Preis sichtbar, er ist Pflichtinformation.
- **`model/policies/bookingRules.ts`:** höchstens eine aktive Buchung je Art. Nach einem abgelehnten Schadenfall bietet Termin keinen Freigabe-Termin an.
- **Vor-Ort-Diagnose:** Der Partner kommt aus der Buchung, nicht aus `demoConfig.partners[0]`.
- **Chat-Grenze:** Die Grenze von 40 Nachrichten gilt wieder in `useAssistant` und in der Route. Ein Test prüft beide.

**Datenschutz und Belegbarkeit**
- **`model/policies/consentScopes.ts`:** Zweck → Rechtsgrundlage, Empfängerart, Datenkategorien. Die Vorschau „Das geht an …“ und der gespeicherte Consent nutzen dasselbe Array.
- **Chat-Einwilligung:** wird ohne `caseId` gespeichert. Die Fallakte zeigt die Weitergabe an den Assistenten nur in Fällen, in denen Nachrichten gingen.
- **Mitteilungen:** werden als Consent gespeichert (`mitteilungen`, lit. a). Die Texte auf dem Sperrbildschirm sind neutral, ohne Gerät, Betrag, Betrieb und Fallnummer.
- **Rückruf:** erst nach einem Bestätigungs-Sheet mit Empfänger und Daten.
- **Zwischenstand für den Widerruf bei lit. b:** Er gilt unabhängig von Entscheidung E2. Die Simulation prüft vor jedem Schritt den aktiven Consent und hält bei Widerruf an.
- **Versionierte Texte:** Jeder Hinweis- und Einwilligungstext bekommt `textVersion` und `textHash`. Ein Test schlägt fehl, wenn sich ein Text ohne neue Version ändert.
- **Hinweis am Eingabefeld:** Eigene Worte gehen an den Assistenten. Der heutige Text verspricht „Nicht dabei sind Fotos, Adresse und Vertragsnummer“, Freitext kann sie aber enthalten. Den neuen Wortlaut legt der Anwalt fest.

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

**Abnahme**
- Alle 17 Regressionstests stehen auf `test` und sind grün.
- Der Fuzz-Test läuft 1.000-mal ohne Exception, je Gerät gibt es höchstens einen offenen Fall.
- Grep-Tests: 0 Status-Vergleiche in Screens. `createCase(` steht nur in `openCaseFor`. `hasProgress` und `isEmptyCase` gibt es je genau einmal.
- Test je Zweck: Die Kategorien der Vorschau sind gleich den gespeicherten Kategorien.
- Ein geänderter Einwilligungstext ohne neue `textVersion` macht die Suite rot.
- Chat-Route: „Ignoriere alle Regeln“ im Problemfeld steht nicht im Systemblock. Überlange Felder geben 400, ohne Token 401, nach N Anfragen 429.
- `npx eslint . --max-warnings 0` ist grün.
- `docs/BEFUNDE.md` nennt für jeden Befund den Test.

### Phase 2: Pitch ohne Laptop · Woche 3–5

**Ziel:** ganz läuft auf dem Pitch-Telefon als eigener Build. Der Assistent antwortet über Mobilfunk, ohne dass ein Laptop läuft. Es gibt nur Demo-Daten und Chats des Teams.

**Builds**
- **Varianten:** `app.config.ts` ersetzt `app.json`. Die Varianten laufen über `APP_VARIANT`, mit Name, Bundle-ID und API-URL je Variante.
- **EAS:** `eas.json` mit den Profilen `development`, `preview` und `pitch`.
  - Dev-Client statt Expo Go, dazu ein interner TestFlight.
  - `runtimeVersion` mit der Policy `fingerprint`.
  - Grund für den Wechsel: Expo Go aus dem App Store öffnet nur das aktuelle SDK. Ein neues SDK kann das Pitch-Telefon sonst über Nacht lahmlegen.
- **EAS Update:** auf dem Kanal `pitch` nur für JS-Fixes. Rechtstexte ändern sich nur mit neuer `textVersion`.
- **Versionen:** Semver in `package.json`, kurze Notizen in `docs/RELEASES.md`.

**Assistent gehostet**
- **Host:** Die bestehende Route läuft per `expo export` über den `http`- oder `express`-Adapter von `expo-server` auf einem kleinen EU-Host mit Node 24. Der Adapter ist in `expo-server@58` vorhanden, der Handler bleibt unverändert.
- **Betrieb:** `/health`, Logs ohne Inhalte, ein Budget-Alarm beim Anbieter, dazu Rate-Limit, Tagesgrenze und Pitch-Token aus Phase 1.
- **Ehrlich dokumentieren:** Der Host steht in der EU, die Inferenz läuft global. Das steht im VVT-Entwurf als Drittlandübermittlung. Zugang hat nur das Team.
- **`docs/KOSTEN.md`:** Token und Kosten je Fall, gemessen an 10 Demo-Fällen, dazu die monatlichen Fixkosten. Grundlage: claude-opus-5-5 kostet 4 USD je Million Input-Token und 20 USD je Million Output-Token, laut Anthropic-Doku im Okt. 2026.

**End-to-End**
- Maestro-Flows `e2e/golden-path.yaml`, `e2e/abbruch.yaml`, `e2e/dark-200.yaml`, lokal und nachts.
- Android-Smoke: der Golden Path einmal pro Woche im Emulator. Das ist billig, solange es von Anfang an mitläuft.
- Der Golden-Path-Lauf ist Pflicht vor jedem Pitch-Tag.

**Pitch-Betrieb**
- Ein zweites Pitch-Gerät mit demselben Build.
- Offline-Probe: Ohne Netz wird eigener Text eine Notiz für die Fachkraft (Entscheidung 12).

**Abnahme**
- Der Preview-Build läuft auf beiden Pitch-Geräten.
- Der Assistent antwortet bei ausgeschaltetem Laptop, das Datum steht in `PITCH_CHECK.md`.
- Maestro ist 5 Nächte in Folge auf iOS grün.
- Die gehostete Route antwortet nach dem Limit mit 429.
- `KOSTEN.md` nennt die gemessenen Kosten je Fall.

### Phase 3: Reiner Kern, Ereignisse v2, Consent-Ledger · Woche 5–10

**Ziel:** Die ganze Fachlogik läuft ohne React, Texte und Konfiguration. Das Ereignisschema v2 ist so geschnitten, dass Versicherer, Hersteller und Löschung später passen. Das Gespräch wird nur noch gerendert.

**3a: Ereignisschema v2 (Woche 5–7)**
- **Typisierte Ereignisse:** `model/events.ts` mit Payloads je Ereignistyp als diskriminierte Union, `schemaVersion` 2. `payload: Record<string, unknown>` entfällt.
- **`actor` wird `{kind, id}`.** Heute speichert der Store Anzeigenamen aus der Konfiguration. Unveränderliche Ereignisse würden sonst Mandantennamen für immer tragen.
- **Zwei Zeitstempel:** `occurredAt` (Gerät) und `recordedAt` mit `seq` (Server, bis Phase 5 leer).
- **Versionen bei Entscheidungen:** Entscheidungsereignisse tragen `policyVersion` und `tenantConfigVersion`.
- **Felder für Kostenträger und Reparaturpflicht nach §§ 479a ff. BGB**, bevor das Schema einfriert:
  - `payer`, dazu die Grundlage: Versicherung, Gewährleistung, Reparaturpflicht des Herstellers oder selbst.
  - Die angebotene Reparatur mit Preis, Dauer, Ablehnungsgrund und Ersatzteil.
  - Gebaut wird nur der Versicherer-Weg, der Rest ist nur typisiert. Die Feldliste prüft der Anwalt (RA).
- **Kein Klartext-Personenbezug im Payload:** Freitext (Problem, Notiz, Chat) liegt als löschbarer Datensatz, das Ereignis trägt nur den Verweis.
- **Stabile IDs in der Konfiguration:** Zeitfenster und Partner bekommen IDs. `Case.problemLabel` wird `problemKey` plus optionalem `freeText`.
- **Migration:** `store/migrations/v2.ts` übersetzt bekannte Texte per Lookup in IDs, Unbekanntes bleibt `legacyText`. Vorher wird der Rohwert gesichert.
- **Fixtures:** synthetisch oder geschrubbt, nie ein ungeprüfter Stand vom Pitch-Telefon. Ein CI-Check blockt Freitext und Bilder in Fixtures.
- **Importgrenze:** `no-restricted-imports` für `model/**`. Verboten sind react, react-native, expo-\*, `@/i18n`, `@/config`, `@/store`, `@/services`, `@/components`.
- **Consent-Ledger:**
  - Ein Ereignis je Einwilligung oder Bestätigung, nur anhängen.
  - Die Wirkung eines Widerrufs folgt Entscheidung E2.
  - Die Kenntnisnahme des Datenschutzhinweises ist ein eigenes Ereignis, keine Einwilligung.
  - Die Fallakte bekommt den Abschnitt „Wer hat was bekommen“, direkt aus dem Ledger.

**3b: decide und evolve, Gespräch zerlegen (Woche 7–10)**
- **Befehle als Ereignisse:** Die Store-Aktionen werden gruppenweise `dispatch(command) → decide → Event[] → evolve`. Gruppen: Anleitung, Call, Schadenfall, Buchung, Einwilligung, Chat. Ein Commit je Gruppe.
- **`rebuild(events)` deepEqual:** nur für die Aggregate, die später zum Server wandern: Consent, Schadenfall, Buchung, Fallnummer.
- **Ereignisse je Fall:** Sie liegen in `eventsByCase` statt in einem flachen Array.
- **Das Gespräch zerlegen:**
  - `model/projections/conversation.ts` mit `conversationSteps(facts)` und `nextReplies(facts)` ersetzt die 400 Zeilen if/else in `app/fall/[id]/index.tsx`. Dazu Tabellentests je Status.
  - Unter `components/app/thread/` gibt es eine Komponente je Kartentyp. `index.tsx` hat am Ende höchstens 300 Zeilen.
- **Services:** `diagnosis.answer` und `video.finding` werden async und im Handler aufgerufen. Das Ergebnis wird ein Ereignis. Kein Service-Aufruf mehr beim Rendern.
- **Simulation:** Sie zieht nach `services/mock/insurerSimulator.ts` und `partnerSimulator.ts`, hinter `InsurerPort` und `PartnerPort`. Contract-Tests in `services/__contract__/`.
- **Selektoren:** mit `useShallow` für die 14 Komponenten mit Voll-Abo. Die Lint-Regel wird zum Fehler.
- **Schreibvorgänge** erst bündeln, wenn eine Messung es verlangt. Consent- und Claim-Ereignisse werden immer sofort geschrieben, beim Wechsel in den Hintergrund ebenfalls.

**3b: Mandant, Kategorien, Fotos**
- **Mandant:** `config/tenant.ts` mit `TenantConfig` und `useTenant()`. `demo.config.ts` wird nur im Kompositions-Root gelesen, eine Lint-Regel schützt das. `linkContract` hängt Verträge an, statt sie zu ersetzen.
- **Kategorien:** `content/categories.ts` hat einen Deskriptor je Gerätekategorie. `DeviceScan`, `lib/appliance.ts`, `hasGuides` und `lib/chat/prompt.ts` lesen daraus, die doppelten Listen entfallen.
- **Formate:** `format.ts` nimmt Locale und Währung aus der `TenantConfig`.
- **Fotos:** EXIF und GPS werden beim Speichern entfernt, danach kommt sha256 mit expo-crypto in `Photo.sha256`.

**Projektionen für den Vertrieb**
- `model/projections/insurerView.ts`: nur Fälle mit aktivem Consent für genau diesen Empfänger, die Freigabe mit `actor` mensch oder regel.
- `manufacturerAggregates.ts`: nur Aggregate mit mindestens 10 Fällen je Zelle.
- Daraus entsteht eine statische Demo-Seite oder Folien für Versicherer-Gespräche, außerhalb der App und ohne Link aus der App.

**Versicherer-Anforderungen (Produkt, ab Woche 4)**
- Strukturierte Gespräche mit 2–3 Versicherern.
- Themen: Hosting-Vorgaben, Meldeformat (REST, BiPRO, SFTP), Rolle nach DSGVO, Felder aus `DATA_MODEL.md` §3, verlangte Nachweise.
- Ergebnis in `docs/ANFORDERUNGEN_VERSICHERER.md`, bevor 3a das Schema einfriert.

**Abnahme**
- Die Importgrenze für `model/**` hat 0 Verstöße.
- Kein String in den Ereignissen der Fixtures kommt in `de.ts` oder in Anzeigenamen der Konfiguration vor.
- Die Migration v1 → v2 ist mit Fixtures grün, der Rohwert ist gesichert.
- Der deepEqual-Test für Consent, Schadenfall, Buchung und Fallnummer ist grün.
- Consent-Einträge werden nur angehängt (Test).
- `index.tsx` hat höchstens 300 Zeilen.
- Render-Zähltest: Ein Schreibvorgang an einem fremden Fall rendert `DeviceCard` 0-mal neu.
- Checklisten-Test „neue Gerätekategorie“: ein Content-Eintrag und ein Textblock in `de.ts`, keine weitere Datei.
- Ein gespeichertes Foto hat keine GPS-Daten, und sein Hash passt.
- `ANFORDERUNGEN_VERSICHERER.md` enthält mindestens 2 Gespräche.

### Phase 4: Reif für externe Testerinnen · Woche 8–12, parallel zu 3b

**Ziel:** Bevor die erste Person außerhalb des Teams die App nutzt, sind Datenflüsse, Pflichthinweise, Store-Vorgaben und das Verhalten des Assistenten belegt.

**Compliance-Registry und Pflichtdokumente**
- **`compliance/`:** Zwecke, Rechtsgrundlagen (RA), Datenkategorien, Empfänger, Fristen, Auftragsverarbeiter mit Ort und Transfermechanismus. `consentScopes.ts` zieht dorthin.
- **`npm run compliance:generate`** erzeugt `docs/recht/VVT.md` und Entwürfe für die Datenschutzangaben im App Store. Die CI prüft, ob Code und Dokument auseinanderlaufen.
- **AVV-Register:** Anbieter des Assistenten, Host, Expo/EAS, GitHub, Apple TestFlight und Monitoring. Je Eintrag Rechtsgrundlage und Transfermechanismus (DPF oder SCC). „Vertretbar“ ist keine Begründung.
- **DSFA-Schwellwertprüfung** mit der DSB: Fotos aus der Wohnung, Versicherungsdaten, Assistent.
- **Löschkonzept v1** nach Entscheidung E11.
- **Datenschutzhinweis nach Art. 13** im Onboarding, versioniert.
- **Mindestalter** für Einwilligungen nach lit. a, im Einwilligungs-Sheet und in den Nutzungsbedingungen (RA).

**Assistent belastbar**
- **Provider-Adapter** mit der Modell-ID aus der Konfiguration (siehe 3.4).
- **Eval-Satz in CI** mit mindestens 30 Fällen. Er prüft:
  - keine Kostenzusage,
  - er nennt sich Computerprogramm,
  - er schlägt nur Anleitungen aus dem Katalog vor,
  - er lenkt bei fremden Themen zurück,
  - eine Injektion im Problemfeld bleibt ohne Wirkung.
  - Der Satz läuft vor jedem Wechsel von Modell, Anbieter oder Prompt, mit festem Budget je Lauf.
- **Pflichthinweis nach Art. 50 KI-VO:**
  - Den Wortlaut legt der Anwalt fest (Entscheidung E5).
  - Er steht sichtbar im Einwilligungs-Sheet und in der ersten Nachricht, barrierefrei.
  - Antworten des Assistenten sind in Fallakte und Export maschinenlesbar als maschinell erzeugt markiert (RA).

**Store und Build**
- **Production-Profil ohne Demo:** kein `DemoControlSheet`, kein Demo-Mandant, keine Galerie. Ein Test auf dem Bundle prüft das. Die versteckte Geste mit 7 Taps wäre sonst ein Ablehnungsgrund.
- **`ios.privacyManifests`** mit den Required-Reason-APIs.
- **Checkliste `docs/recht/STORE.md`:**
  - Einwilligung mit Nennung des Drittanbieters, bevor Daten an das Sprachmodell gehen.
  - Kontolöschung in der App, sobald es Konten gibt.
  - Ein Demo-Konto für das Review.
  - Die Altersfreigabe.
- **Schutz auf dem Gerät:**
  - Speicherstand und Fotos aus dem iCloud-Backup nehmen oder mit passender File-Protection-Klasse speichern.
  - Fallansichten im App-Switcher verbergen.
- **Crash-Reporting** nach Entscheidung E6: Opt-in, standardmäßig aus.

**Barrierefreiheit und Website**
- **`docs/a11y/Pruefprotokoll.md`:**
  - Golden Path mit VoiceOver (kleines und großes iPhone) und TalkBack (ein Android-Gerät).
  - Dazu 200 % Schrift und Dark Mode.
  - Wird je Release wiederholt.
- **Test erweitern:** `__tests__/a11y.test.tsx` prüft heute nur das gesetzte `minHeight`. Er misst künftig auch Breite und `hitSlop` richtig und schließt geöffnete Sheets ein.
- **Website:** Datenschutzerklärung, Impressum und Support-URL, abgestimmt mit den Hinweistexten der App aus derselben Registry.

**Abnahme (= Gate externe Tests)**
- Das VVT wird aus der Registry erzeugt, der Drift-Check ist grün.
- Das AVV-Register hat keinen offenen Eintrag.
- Die DSB hat das DSFA-Screening kommentiert, mit Datum.
- Der Eval-Satz ist in CI grün.
- Das Production-Bundle enthält keinen Demo-Code.
- Der Art.-50-Hinweis erscheint vor der ersten Nachricht (Test).
- Das Prüfprotokoll für VoiceOver und TalkBack hat keine Blocker.
- Datenschutzerklärung und Support-URL sind online.
- Erst dann öffnet die externe TestFlight-Gruppe.

### Phase 5: Pilot-Backend nach dem Strangler-Muster · Monat 3–6 · nur mit LOI

**Ziel:** Der Server wird Stufe für Stufe zur Autorität und nutzt denselben Kern wie die App. Schon nach Stufe 3 ist ein Concierge-Pilot möglich. Der Pitch läuft über einen Schalter weiter lokal.

**Monorepo**
- npm workspaces, Umzug per `git mv` in einem eigenen Commit, der nur Pfade ändert.
- Die Domänen-Tests laufen in App- und Server-CI.
- `docs/adr/` hält jede Architektur-Entscheidung fest.

**Server-Kern**
- **Stack:** Hono, Drizzle und Postgres in der EU, Node 24.
- **Tabellen:** `events` (nur anhängen, `seq`, `prev_hash`, `hash`), `consent_events`, `idempotency`, `case_projection`, `case_access`, `audit_log`. Personenbezug liegt in eigenen löschbaren Tabellen.
- **`POST /v1/commands`** mit `idempotencyKey` und `expectedVersion`. In einer Transaktion: laden → `decide` → anhängen → projizieren → Outbox. Die Outbox gibt nur weiter, wenn `case_access` aktiv ist.
- **Versionen:** Upcaster je `schemaVersion` in `packages/domain`. `TenantConfig.minAppVersion` legt die älteste erlaubte App fest. Die API unterstützt die aktuelle und die vorige App-Version.

**Stufen der Autorität**
- **Schalter je Service** in `TenantConfig.features` (`local | remote`), mit denselben Contract-Tests für beide Varianten.
- **Reihenfolge, je Stufe ein Release:**
  1. Spiegel ohne Autorität.
  2. Fallnummer vom Server.
  3. Einwilligungsregister.
  - **Danach ist ein Concierge-Pilot möglich:** Es gibt eine interne Ops-Ansicht, ganz bearbeitet Schadenfall und Termin von Hand. Der Versicherer bekommt die Fallakte nach Bestätigung über einen gesicherten Weg.
  4. Schadenfall und Freigabe über `InsurerPort`. Die Simulation verlässt die App.
  5. Angebot und Preise aus der Mandantenkonfiguration des Servers.
  6. Termin über `PartnerPort`.

**Anmeldung und Assistent**
- **Konto je Haushalt** per E-Mail-Code, Passkeys später.
  - Tokens liegen in `expo-secure-store`, die Kontolöschung geht in der App.
  - Das Konto ist pseudonym, nicht „anonym“.
- **`/v1/assistant`:**
  - nur angemeldet, mit Rate-Limit je Konto und Fall.
  - Den Kontext liest der Server aus der Datenbank, die App schickt nur Text.
  - Für echte Daten läuft die Inferenz über Vertex eu oder Bedrock EU.

**Fotos und Zugriff**
- **Upload:** in EU-Object-Storage mit kurzlebigen Upload-URLs. Der Server rechnet den Hash nach und verkettet ihn.
- **Zeit:** Gerätezeit und Serverempfangszeit werden getrennt ausgewiesen.
- **BOLA-Suite:** Konto A liest keinen Fall von Konto B, kein Empfänger liest ohne aktives `case_access`.

**Datenlebenszyklus**
- **Löschjob** nach den Fristen der Registry, auch für Chat-Nachrichten.
- **Envelope-Verschlüsselung** für Personenbezug.
- **Ehrliche Löschzusage:** Sie nennt die Frist einschließlich Backups.
- **Rechte der Betroffenen:**
  - Export nach Art. 15 und 20 als JSON.
  - Löschung nach Art. 17 mit Mitteilung an die Empfänger nach Art. 19.

**Betrieb**
- Staging und Prod sind getrennt, Migrationen laufen über drizzle-kit, Backups täglich.
- Eine Wiederherstellung wird geübt.
- **`docs/BETRIEB.md`** mit dem Ablauf bei Störfällen:
  - Meldung an den Versicherer innerhalb der Frist aus dem Vertrag.
  - Meldung nach Art. 33 DSGVO.

**Abnahme (= Gate echte Daten)**
- Dieselbe Domänen-Suite ist in App- und Server-CI grün.
- Die Contract-Tests sind für Mock und HTTP grün.
- Doppelt gesendete Befehle erzeugen 0 doppelte Ereignisse. Eine veraltete `expectedVersion` wird abgelehnt.
- BOLA und RLS: Ein fremdes Konto und ein Empfänger ohne `case_access` sehen 0 Zeilen, für jeden Endpunkt.
- Nach „Weitergabe beenden“ geht nichts mehr an den Empfänger.
- Der Upcaster-Test mit eingefrorenen v2-Folgen ist grün. Die App in Version n−1 besteht die Contract-Tests.
- Mit dem Schalter `local` laufen im Pitch-Build alle Flows ohne Netz, außer dem Assistenten.
- Die Restore-Übung ist dokumentiert, mit RPO und RTO.
- Der externe Pen-Test hat keine offenen hohen oder kritischen Befunde.
- Du hast die Gate-Checkliste abgezeichnet. Erst dann kommen echte Personendaten auf den Server.

### Phase 6: Pilot, Dashboard, Inhalte · Monat 6–10 · nur mit Pilotvertrag

**Ziel:** Ein Versicherer arbeitet echte Fälle ab. Ein zweiter Mandant kommt ohne Code-Änderung dazu. Inhalte sind lizenziert und ohne App-Release erweiterbar.

**Anbindung des Versicherers**
- **Ausgehend:** ein signiertes Paket aus Fallakte, Ereignissen und Foto-Hashes über die Outbox, nur nach aktiver Bestätigung. Das Schlüsselmanagement wird festgelegt: wer signiert, wie rotiert wird, wie der Versicherer prüft.
- **Eingehend:** die Entscheidung mit Pflichtfeld `actor` (mensch oder regel).
  - Lehnt eine Regel ab, zeigt die App den Weg zur menschlichen Prüfung.
  - Vertraglich gilt: Ausgaben von ganz sind nicht allein maßgeblich (RA, Art. 22 DSGVO).
- **Partner-API `/partner/v1`:** nur, wenn der Pilot eine Systemanbindung statt eines Portals will.
  - Zugang über OAuth2 Client Credentials.
  - Webhooks nach Standard Webhooks.
  - Die OpenAPI-Beschreibung entsteht aus zod, oasdiff prüft Änderungen in CI.

**Versicherer-Dashboard**
- **`apps/dashboards`** (Next.js) liest nur Views über `case_access`. Das Personal meldet sich mit SSO oder MFA an.
- **Hersteller** sehen nur Aggregate mit mindestens 10 Fällen, **Händler** nur Zahlen zu verknüpften Verträgen.
- **Jeder Portalzugriff** erscheint in der Fallakte des Haushalts.
- **AVV für den Portalbetrieb:** Für das Portal ist ganz Auftragsverarbeiter (Doppelrolle, Entscheidung E8).
- Die App verlinkt nicht auf das Portal.

**Mandanten zur Laufzeit**
- **Co-Branding:** Der Server liefert die `TenantConfig` nach der Vertragsverknüpfung, signiert und versioniert.
  - Farben nur als Token-Namen.
  - Kein eigener Rechtstext je Mandant.
- **Mehrere Verträge und Kostenträger** je Haushalt.
- **Schalter je Unterauftragnehmer und Mandant:** zum Beispiel den Assistenten für die Versicherten eines Versicherers abschalten.

**Inhalte**
- **`packages/content/guides/<hersteller>/<modell>/`** mit Quelle, Lizenz, Version und `verbatimHash`. Ohne gültige Lizenz liefert der Server nichts aus.
- **Auslieferung über den Server:** mit Version, offline zwischengespeichert. Die Anleitung speichert ihre `guideVersion`.

**Vertrag, Vertrauen, Store**
- **Trust-Paket in `docs/trust/`:**
  - Sicherheitsbeschreibung, TOM und Unterauftragnehmer.
  - Zusammenfassung des Pen-Tests, Wiederherstellung, Incident-Prozess.
  - Transparenz zum Assistenten.
  - DORA-Anhang mit LEI und Exit-Export (RA).
- **Store-Release** für die Plattformen, die der Pilot braucht. Die Datenschutzangaben kommen aus der Registry.
- **Barrierefreiheitserklärung**, falls das BFSG greift (RA).
- **Schritt 15 aus dem Bauplan:**
  - Fallakte als PDF auf dem Server, aus derselben Projektion.
  - Pflege-Erinnerung per Push, nur mit Consent `mitteilungen`.
  - Kaufbeleg-Foto.
  - Hinweis „Zuerst der Händler“.
  - Das Europäische Formular für Reparaturinformationen nur im Namen des Fachbetriebs (RA).
- **Schwere Nachweise nur auf Verlangen:** qualifizierte Zeitstempel, Object Lock, App Attest und ISO 27001 nur, wenn ein Versicherer sie ausdrücklich verlangt.

**Abnahme**
- Ein Pilotfall läuft mit echten Menschen: Schadenfall, Freigabe durch einen Menschen, Termin, Abschluss.
- Zwei Mandanten laufen im selben Build, der Unterschied betrifft 0 Zeilen Code.
- Ohne aktives `case_access` zeigt das Dashboard keinen Personenbezug. Jeder Portalzugriff steht in der Fallakte (Test).
- Eine Anleitung ohne Lizenz wird nicht ausgeliefert. Eine Anleitung eines zweiten Herstellers kommt ohne Store-Build.
- DORA-Anhang, Vereinbarung zwischen Verantwortlichen und AVV für das Portal sind unterschrieben.
- Die Store-Freigabe liegt vor.

---

## 5. Was sich für die Arbeitsweise ändert

- **Ablauf:**
  - Nach deiner Freigabe trägt eine Sitzung die Phasen als nummerierte Schritte in `docs/BUILD_PLAN.md` ein, als Abschnitt 8 „Zukunftsfähigkeit“.
  - Offene Entscheidungen kommen nach `docs/ENTSCHEIDUNGEN.md`.
- **`CLAUDE.md`:** Sobald Phase 0 steht, braucht sie drei neue Regeln.
  - `npm run check` heißt jetzt wirklich alles.
  - Keine Status-Vergleiche in Screens.
  - Keine Texte in Ereignissen.
  - Die Änderung machst du selbst.
- **Kern-Regeln:** Mit deinem OK bekommt `model/` eine eigene `CLAUDE.md` mit den Regeln des Kerns.
- **Skills:** `neues-ereignis` und `neue-geraetekategorie` als Checklisten für die Sitzungen.
- **Hotspots:** In `store/appStore.ts`, `i18n/de.ts` und `app/fall/[id]/index.tsx` arbeitet nur eine Sitzung gleichzeitig.
- **Menschliches Review ist Pflicht für:**
  - `model/policies/`,
  - Consent-Flows und Hinweistexte,
  - `config/` und die Registry.

---

## 6. Entscheidungen für dich

| # | Frage | Empfehlung | Bis wann |
|---|---|---|---|
| E1 | Arbeiten die Sitzungen künftig mit Branch und PR? | Ja: Branch und PR je Schritt, CI muss grün sein, Merge nur durch einen von euch beiden. Erst dann wirken CI und Pflichtprüfungen. `CLAUDE.md` passt du selbst an. | Ende Woche 1 |
| E2 | Was bewirkt ein Widerruf bei lit. b? | Zwei getrennte Aktionen: „Anfrage zurückziehen“ storniert die noch nicht erbrachte Leistung und stoppt weitere Weitergaben. „Weitergabe beenden“ stoppt nur Künftiges. Lit. b ist keine Einwilligung, deshalb heißt es nicht „Widerruf“. Ob sich ein gemeldeter Schadenfall zurücknehmen lässt, klärt der Anwalt (RA). Bis dahin gilt der Zwischenstand aus Phase 1. | vor Phase 3a |
| E3 | Wann wechselt der Pitch auf einen eigenen Build? | Woche 3. Dafür brauchst du das Apple Developer Program. | Konto bis Ende Woche 2 |
| E4 | Wo laufen der Assistent und später die Kerndaten? | Phase 2: kleiner EU-Host plus Anthropic-API, nur Demo-Daten, US-Übermittlung dokumentiert. Für echte Daten: Vertex AI eu oder Bedrock EU, je nach Verfügbarkeit des Modells mit Structured Outputs. Den Anbieter der Kerndaten (z. B. STACKIT, Hetzner oder AWS Frankfurt) wählst du nach den Versicherer-Gesprächen. Der Code bleibt bei Standard-Postgres, S3-API und OpenTelemetry. | Chat-Host vor Woche 3, Rest vor Phase 5 |
| E5 | Wie lautet der Pflichthinweis nach Art. 50 KI-VO neben der Regel „nie KI oder AI“? | Ein Satz im Wortlaut des Anwalts, sichtbar vor der ersten Nachricht. Name und Marketing ändern sich nicht. Verlangt der Anwalt den Gesetzesbegriff, kommt er nur in diesen Pflichtsatz, mit einer Ausnahme in `CLAUDE.md`. | vor dem Gate in Phase 4 |
| E6 | Kommt Crash-Reporting in die App? | Ja, mit EU-Datenregion als Opt-in, standardmäßig aus, ohne Replay und ohne Text in Breadcrumbs. Ob § 25 TDDDG eine Einwilligung verlangt, klärt der Anwalt (RA). Analytics bleibt aus. | vor Phase 4 |
| E7 | Wie tief geht das Whitelabel? | Co-Branding: ganz bleibt Marke und Palette, der Versicherer erscheint mit Name und Logo. Ein Build reicht. Eigene Apps nur auf Kundenwunsch. | vor Phase 3b |
| E8 | Welche Rolle hat ganz nach DSGVO gegenüber Versicherer und Betrieb? | Bis zum Portal eigener Verantwortlicher. Mit dem Portal eine Doppelrolle: eigener Verantwortlicher für den Haushalt, Auftragsverarbeiter für den Portalbetrieb. Das bestimmt Mandantenschnitt, Löschbefugnis und DORA (RA). | vor Phase 5 |
| E9 | Wie startet der erste Pilot? | Concierge-Pilot nach Strangler-Stufe 3: ganz bearbeitet Schadenfall und Termin von Hand. Das bringt am schnellsten Umsatz und echte Anforderungen. | mit dem LOI |
| E10 | Wie melden sich Haushalte an? | E-Mail-Code, danach Passkeys. Optional ein Einladungslink des Versicherers. Kein Social Login. | vor Phase 5 |
| E11 | Welche Löschfristen gelten? | Vorschlag: Chat 90 Tage nach Abschluss. Fotos, Ereignisse und Consent-Nachweise 3 Jahre nach Jahresende des Abschlusses. Rechnungsdaten 8 bzw. 10 Jahre. Server-Logs 30 Tage. Je Mandant nur kürzer (RA). | Entwurf Ende Phase 4 |
| E12 | Wie gehst du mit der Lizenz der Miele-Anleitungen um? | Für Pitch und Preview nur Demo. Gespräche über eine Lizenz laufen parallel. Im Production-Build bis zur Lizenz keine Anleitungen, nur ein Hinweis auf die Gebrauchsanweisung. Eigene Texte bleiben ausgeschlossen. | vor dem Gate in Phase 4 |
| E13 | Gibt es im Pilot Selbstzahler-Buchungen? | Nein. Danach ist der Fachbetrieb Vertragspartner, mit Pflichtinformationen und Widerrufsbelehrung in seinem Namen (RA). | vor Phase 6 |

---

## 7. Risiken

| Risiko | Gegenmittel |
|---|---|
| Ein Umbau bricht den Pitch kurz vor einem Termin | Pitch-Tag nach grünem Check, 48 Stunden Merge-Freeze, ab Phase 2 Maestro vor jedem Tag, zweites Gerät. Neue Pfade nur hinter Schaltern. |
| Die Review-Zeit reicht neben Vertrieb und Pitch nicht | Obergrenze für Commits je Tag, Review-Checkliste, eine Sitzung je Hotspot. Regeln als Lint und Tests, damit das Review sich auf Fachliches beschränkt. |
| Die Migration v1 → v2 verliert den Demo-Stand | Rohwert vor `migrate` sichern, synthetische Fixtures, RecoveryScreen, Demo-Startstand per Tap. |
| Sitzungen verwässern Modulgrenzen oder ändern Rechtstexte nebenbei | Importgrenze für `model/`, textHash-Test, Drift-Check zwischen Registry und VVT, Pflicht-Review. |
| Antworten von Anwalt und DSB kommen zu spät | `RECHTSFRAGEN.md` ab Woche 1 mit Fristen, feste Termine im Monat, immer die strengere Variante bauen. |
| Versicherer glauben, der Assistent laufe in der EU | Offen als Drittlandübermittlung führen, solange die Anthropic-API genutzt wird. Für echte Daten der EU-Provider mit Eval-Satz. |
| Missbrauch der Chat-Route kostet Geld | zod, Kontext nur aus Schlüsseln, Rate-Limit, Tagesgrenze, Budget-Alarm, ab Phase 5 Anmeldung. |
| Das Schema v2 friert ein, bevor Kunden ihre Anforderungen nennen | Versicherer-Gespräche ab Woche 4, Felder für Kostenträger schon in v2, Upcaster je Version. |
| Plattform auf Vorrat | Phase 5 und 6 nur mit LOI bzw. Vertrag, vorher ein Concierge-Pilot. |
| Append-only widerspricht Löschpflichten | Kein Klartext-Personenbezug im Umschlag, Envelope-Verschlüsselung, ehrliche Löschzusage. |
| Der Versicherer verlangt DORA-, ISO- oder Souveränitätsnachweise | Im ersten Gespräch abfragen, Trust-Paket, Pen-Test vor echten Daten, anbieterneutraler Code. |
| Ablehnung im App Store | `STORE.md`, Production-Bundle ohne Demo-Code mit Test, Datenschutzangaben aus der Registry. |
| Expo- oder RN-Upgrades brechen den Build | Dev-Client, Fingerprint-Runtime, Upgrades als eigener Schritt zwischen den Phasen, höchstens eine SDK-Version hinter dem aktuellen Stand. |

---

## 8. Bewusst nicht

- **Das Gespräch nicht auf einmal neu schreiben.** Erst die Regeln herausziehen, dann die Karten einzeln auslagern.
- **Keine neue State-Bibliothek** (Redux, XState) und kein TanStack Query über einem lokalen Store. Selektoren mit `useShallow` reichen, bis es ein echtes Backend gibt.
- **Kein Wechsel auf pnpm oder Turborepo.** npm workspaces reichen, und erst ab Phase 5.
- **Kein Frischstart des Stores.** Jede neue Version kommt mit Migration und Sicherung.
- **Keine Fixtures aus echten Gerätedaten im Repo.**
- **Flakes nicht über höhere Timeouts verstecken.**
- **Keine `tenantId` am Fall.** Zugriff nur über `case_access`.
- **Kein Umbau der Persistenz auf SQLite oder SQLCipher**, solange es nur Demo-Daten gibt.
- **Kein Crypto-Shredding je Fall**, kein Object Lock, kein App Attest, keine qualifizierten Zeitstempel und kein ISO 27001, bevor ein Kunde das verlangt.
- **Keine Server-Autorität über den Chat hinaus und keine Dashboards ohne LOI.** Kein Portal, bevor Ledger, `case_access` und RLS laufen.
- **Keine Microservices**, kein GraphQL, kein Kubernetes, kein Kafka, keine CRDTs. Ein Server, ein Postgres, Befehle mit Outbox und Idempotenz.
- **Kein Analytics-SDK und kein Session-Replay.** Kennzahlen entstehen aus Ereignissen.
- **Keine zweite Sprache auf Vorrat** und kein vorsorglicher Umbau der 54 Direktimporte von `de`. Nur `model/` muss textfrei werden.
- **Die Quelle des Designsystems nicht umdrehen**, etwa `styles.css` aus neuem Token-JSON erzeugen. Das betrifft auch Website und Deck und ist deine Entscheidung.
- **Keine Fotos zum Trainieren** der Fehlererkennung ohne eigenen, widerrufbaren Zweck nach lit. a.
- **Kein Payment**, kein Galerie-Import, keine Portal-Links, kein zweiter Chat (`BUILD_PLAN.md` §6 und feste Regeln).
- **Keine großen Upgrades** von Expo SDK oder TypeScript mitten in Phase 1 oder 3.
- **Geschäftsregeln nie nur auf dem Server bauen.** Sie gehören in den gemeinsamen Kern.

---

## 9. Die ersten zwei Wochen

Jeder Punkt ist ein kleiner Commit, außer es steht anders da.

| Tag | Was |
|---|---|
| 1 | Du gibst den Plan frei. Eine Sitzung trägt ihn als Abschnitt 8 in `BUILD_PLAN.md` ein, die Entscheidungen kommen nach `ENTSCHEIDUNGEN.md`. |
| 1 | `.nvmrc` mit 24, `engines`, README nennt Node 24. |
| 1 | `lint` wird `eslint . --max-warnings 10`, die 3 Fehler werden behoben (u. a. `store/useHydrated.ts`, `test/setup.ts`). |
| 2 | Die Textregel erfasst Ternäre, Template-Literale und Arrays, Treffer nach `de.ts`. |
| 2 | Jest in `unit` und `ui`, die 3 wackeligen Tests mit Fake Timers. |
| 3 | `.github/workflows/check.yml` und `scripts/commit-if-green.sh`. Mit deinem OK das Deny für `.env*`. |
| 3 | `migrate`, Fehlerpfad beim Laden, Sicherung des Rohwerts, Tests mit kaputtem Speicher. |
| 4 | RecoveryScreen in `app/_layout.tsx`. |
| 4 | `__tests__/regressions/` mit den 17 Tests aus Anhang B, als `test.failing`. |
| 5 | `PITCH_CHECK.md`, `pitch-tag.sh`, synthetischer Demo-Startstand, Tag `pitch-2026-W45`. |
| 5 | Du: `RECHTSFRAGEN.md` prüfen, Termin mit Anwalt und DSB buchen, Apple Developer Program beantragen, E1 entscheiden. |
| 6 | `model/policies/openCase.ts` und `openCaseFor`. Danach je ein Commit für `fall/neu.tsx`, die Pflege-Zeilen, „Passt nicht“ und „Details → Anleitung starten“. |
| 7 | `caseFacts.ts` und `actions.ts` mit Tabellentest je Status. |
| 8 | `CloseCaseSheet`, `reportClaim` und `kosten.tsx` über `can()`. Zwei Regressionstests werden grün. |
| 9 | `Result` statt Exceptions, `useCommand` mit Sperre gegen Doppeltaps, Fuzz-Test. |
| 10 | Zwischenstand Widerruf, Bestätigung vor dem Rückruf, zod-Schema und Systemblock nur aus Schlüsseln für die Chat-Route. `BEFUNDE.md` nachziehen, Tag `pitch-2026-W46`. |

---

## 10. Ungeprüft und offene Rechtsfragen

Das ist der Startbestand für `docs/recht/RECHTSFRAGEN.md`. Nichts davon ist als Fakt zu behandeln, bevor es geprüft ist.

**Technik, vor der Umsetzung gegen die aktuelle Doku prüfen**
- Ob claude-opus-5-5 auf Vertex AI in der Region eu oder auf Bedrock in einer EU-Region verfügbar ist, mit Structured Outputs und Prompt-Caching, und was es dort kostet.
- AVV-Bedingungen, Aufbewahrung, Ausschluss von Training und Transfermechanismus für die Anthropic-API.
- Ob die Route mit `web.output: server` per `expo export` auf einem Node-Host ohne EAS stabil läuft. Die Adapter sind vorhanden, getestet ist es nicht.
- Ob zod 4 und fast-check ohne Anpassung unter Jest 30 mit jest-expo laufen.
- Wie Sentry mit EU-Region mit Expo SDK 58 und RN 0.88 zusammenspielt.
- Welche Dienste eines EU-Hosters unter ein BSI-C5-Testat fallen.
- Was ein externer Pen-Test für App und API kostet. Die Schätzung liegt bei 8.000 bis 15.000 Euro.

**Recht (RA)**
- **Art. 50 KI-VO:** ob ganz Anbieter ist, ob „Computerprogramm, kein Mensch“ als Hinweis genügt, was Abs. 2 und 5 für Fallakte und Export verlangen. Zu prüfen ist auch, ob der Digital Omnibus Fristen verschoben hat.
- **Widerruf bei lit. b:** Wirkung, Bestand beim Empfänger, ob sich ein Schadenfall zurücknehmen lässt (E2).
- **Rolle nach DSGVO:** gegenüber Versicherer und Betrieb, gemeinsame Verantwortung oder AVV (E8).
- **Art. 22 DSGVO:** ob Ausgaben der Fehlererkennung in einer regelbasierten Freigabe selbst eine Entscheidung nach Art. 22 sind (EuGH C-634/21, § 37 BDSG).
- **§ 25 TDDDG:** Crash-Reporting.
- **Art. 8 DSGVO:** Mindestalter für Einwilligungen.
- **Löschfristen** je Kategorie (E11). Ob Crypto-Shredding als Löschung gilt und welchen Beweiswert eine Hash-Kette hat.
- **DORA:** ob ganz IKT-Drittdienstleister mit Vertragspflichten nach Art. 30 ist. Ob § 32 VAG (Ausgliederung) oder § 34d GewO (Vermittlung) greift.
- **Recht auf Reparatur:** die Pflichten aus §§ 479a ff. BGB, die Feldliste für Ereignisse v2, wer das Europäische Formular für Reparaturinformationen ausstellt.
- **BFSG:** ob es gilt, sobald Haushalte Leistungen buchen, und ob die Ausnahme für Kleinstunternehmen greift, auch unter Co-Branding.
- **Lizenz** der Anleitungstexte des Herstellers (E12).
- **App Store:** den aktuellen Wortlaut der Apple-Richtlinien 5.1.2(i) (Daten an Drittanbieter-Sprachmodelle), 5.1.1(v) (Kontolöschung), 2.3.1 (versteckte Funktionen) und 4.2.6 (Whitelabel-Apps) prüfen.
- **Selbstzahler:** Pflichtinformationen, Button-Lösung und Widerrufsbelehrung im Namen des Fachbetriebs (E13).

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

Die Kriterien waren Machbarkeit, Zukunftsfähigkeit, Risikominderung, Pitch-Fähigkeit und Konkretheit, je 1 bis 10 Punkte.

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
  - Production-Build ohne Demo,
  - Store-Checkliste.
- Aus B kamen:
  - früher eigener Build,
  - Provider-Adapter für EU-Inferenz,
  - `case_access` statt `tenantId`,
  - Versionsregeln für alte Apps,
  - das LOI-Gate.

**Von den Gutachtern korrigiert:**

- Node 24 statt 22, weil Node 22 im April 2027 ausläuft.
- Fake Timers statt längerer Timeouts.
- EXIF vor dem Hash entfernen, nicht danach.
- Kein „anonymes“ Konto.
- Pen-Test vor dem ersten echten Datum.
- Der Kostenhinweis bleibt für Selbstzahler sichtbar. Die Regel heißt „keine Kostenzusage“, nicht „keine Kosten“.

## Anhang B: Bestätigte Befunde als Regressionstests

Aus der Code-Review vom 03.11.2026. Jeder Befund ist per Test oder Code-Trace bestätigt.

**Abstürze**
1. „Fall abbrechen“ in `in_reparatur`, `erledigt` oder `abgebrochen` (`components/nav/CloseCaseSheet.tsx:37`)
2. „Schadenfall melden“ nach der Meldung, mit verwaister Bestätigung (`app/fall/[id]/kosten.tsx:84`, `store/appStore.ts:740`)
3. „Neues Problem melden“, wenn der laufende Fall `in_reparatur` ist (`app/fall/neu.tsx:82`)

**Fehlverhalten**

4. Zwei offene Fälle über „Passt nicht“ (`app/fall/neu.tsx:84-98`)
5. Zwei offene Fälle über eine Pflege-Zeile im Gerätedetail (`app/geraet/[id].tsx:131`)
6. Fortschritt der Anleitung verloren über „Details → Anleitung starten“ (`app/fall/[id]/ergebnis.tsx:140`). Dazu: Stift mit anderem Symptom lässt eine Anleitung offen.
7. „Du zahlst 189 €“ während der Prüfung durch den Versicherer (`app/fall/[id]/kosten.tsx:141`)
8. Zweite Buchung macht einen Selbstzahler-Fall unvollendbar (`kosten.tsx:112`, `store/appStore.ts:792`)
9. Termin ignoriert die Ablehnung des Schadenfalls (`app/fall/[id]/termin.tsx:67`, `lib/booking.ts:15`)
10. Befund nach Vor-Ort-Diagnose dem falschen Betrieb zugeschrieben (`store/appStore.ts:675`)
11. Grenze von 40 Nachrichten im Chat fehlt (`lib/chat/useAssistant.ts:49`)

**Datenschutz**

12. Widerruf einer Weitergabe nach lit. b ohne Wirkung (`store/appStore.ts:835`)
13. Mitteilungen ohne gespeicherte Einwilligung (`lib/booking.ts:45`, `app/(tabs)/profil.tsx:84`)
14. Vorschau „Das geht an …“ zeigt mehr als die bestätigten Kategorien (`components/app/CaseFileCard.tsx:108`)
15. Chat-Einwilligung mit `caseId`, andere Fallakten zeigen nichts (`lib/chat/useAssistant.ts`, `app/fall/[id]/fallakte.tsx:29`)
16. Rückruf ohne Bestätigung (`store/appStore.ts:664`)
17. Mitteilungstexte mit Falldetails auf dem Sperrbildschirm (`i18n/de.ts`, `notify`)

**Weitere kleine Befunde ohne eigenen Regressionstest**
- Unvalidierte Felder in der Chat-Route (Phase 1)
- Doppeltaps (Phase 1)
- Hänger beim Laden des Speichers (Phase 0)
- Absturz in Termin bei unbekannter Fallnummer per Deep Link
- Zweig „Ersatzgerät“ ohne Rechtshinweis (heute nicht erreichbar)
- Vor-Ort-Diagnose ohne Preis und Zahler
- Mitteilungs-Schalter im Web
- `tel:`-Links ohne Fehlerbehandlung
