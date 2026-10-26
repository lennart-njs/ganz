# Auftrag: UX-Review und erster Code-Prototyp der ganz-App

Du arbeitest in diesem Repo als Lead für Product Design und Engineering. Es gibt zwei Phasen:

1. **Review:** Prüfe die Klick-Demo v1.0 der Haushalts-App nach Best Practices für mobile Apps, Plattformen, UX und UI. Schreib das Ergebnis als Review und als Bauplan auf.
2. **Build:** Baue nach dem Bauplan den ersten Prototyp im Code.

**Nach Phase 1 hörst du auf.** Leg `docs/REVIEW.md` und `docs/BUILD_PLAN.md` vor und warte auf meine Freigabe. Erst danach beginnst du mit Phase 2.

---

## 1. Kontext: Was ist ganz?

- ganz ist ein Startup rund um das Recht auf Reparatur. Gründer sind Lennart Schlimmgen und Alperen Celik.
- Haushalte melden einen Defekt an einem Hausgerät. ganz erkennt Gerät und Fehler, führt durch die Selbsthilfe aus der Herstelleranleitung und holt bei Bedarf Hilfe: zuerst einen Videocall mit einer Fachkraft, dann einen Fachbetrieb oder ein Original-Ersatzteil.
- **Hauptnutzer sind Haushalte.** Gezahlt wird aber von B2B-Kunden. Der Pitch richtet sich zuerst an **Versicherer** (Geräteschutz, Garantieverlängerung) und **Händler**, danach an Hersteller.
- Was der Versicherer davon hat: weniger Ersatzgeräte, mehr Reparaturen, jeder Schadenfall kommt mit Fotos, Diagnose und Kostenvergleich an, und er kann mit einem Klick freigeben.
- Was der Hersteller davon hat: Fehlerbilder pro Modell, Abbrüche in Anleitungen, Bedarf an Ersatzteilen und Nachweise für Reparaturpflichten.
- **Positionierung:** ganz ist **kein KI-Startup**. Das Wort „KI“ erscheint in der App nicht. Die Fotodiagnose heißt immer **„Intelligente Fehlererkennung“**.
- ganz tritt gegenüber Haushalten sichtbar als eigene Marke auf. Der Versicherer erscheint als Kostenträger („Gedeckt über deine Garantieverlängerung bei …“).

## 2. Scope

**Im Scope:** nur die **Haushalts-App**.

**Nicht im Scope, aber mitdenken:** Die Portale für Versicherer, Händler und Hersteller kommen später als **eigene Web-Dashboards außerhalb der App**. Die App muss die Daten dafür schon richtig erzeugen: Fall, Ereignisse, Fotos mit Zeitstempel, Einwilligungen, Kosten und Status. Leg dafür ein gemeinsames Datenmodell an, das später ein Backend und die Dashboards nutzen können. Baue in die App **keine Links zu Portalen** ein. Die Demo hat solche Links nur für den Pitch.

**Verworfen:** Der Live-Chat „ganz Fehlersuche“ (die Links „Mit ganz chatten“ und „Frag ganz zu diesem Schritt“) ist vorerst gestrichen. Nimm ihn aus dem Flow. Du darfst aber prüfen, ob ein Platzhalter für „Frage zu diesem Schritt“ sinnvoll ist, und das als Option im Review nennen.

## 3. Was du im Repo findest

- `reference/demo-v1.0/Main.dc.html`: die Haushalts-App der Klick-Demo, ein Telefon mit 390 × 844 px. Das ist die **Hauptquelle** für den Review. Der Ablauf steckt in der Klasse `Component`: Screens über `state.screen`, Rücksprünge in `backMap`, alle Anleitungsinhalte in `guides()`.
- `reference/demo-v1.0/Versicherer.dc.html`, `Hersteller.dc.html` und `Start.dc.html`: nur als Kontext dafür, welche Daten die Portale später brauchen. Nicht reviewen.
- Das Dateiformat ist ein eigenes Design-Canvas-Format: HTML mit `<sc-if>`, `<sc-for>` und `{{platzhalter}}`. Lies es als Spezifikation. Kopier es nicht als Code.
- Bilder sind in der Demo als `/_blob/<id>` verlinkt. Diese URLs funktionieren außerhalb des Canvas nicht. Die echten Markenfotos lege ich nach `assets/photos/` (siehe Abschnitt 9). Bis dahin nimmst du beschriftete Platzhalter.
- `design-system/`: unser ganz-Designsystem (siehe Abschnitt 5). Es ist verbindlich.

## 4. Feste Vorgaben (nicht ändern, nur begründet hinterfragen)

- Name „ganz“, kleingeschrieben. Die Wortmarke ist reiner Text in Schibsted Grotesk 600.
- „Intelligente Fehlererkennung“ als Name der Fotodiagnose. Kein „KI“, kein „AI“, keine Funken-Icons.
- Ansprache in der **Du-Form**, kurze und klare Sätze, ruhiger Ton. Keine Ausrufezeichen-Euphorie und keine Emojis.
- Beispielgerät: **Miele WKB 130**, Waschmaschine, M.-Nr. 10 162 440. Alle Anleitungsschritte stammen aus der echten Miele-Gebrauchsanweisung. **Ändere ihren Inhalt nicht.** Kürzen und umordnen nur, wenn du es im Review begründest.
- Fiktive Beispielwerte bleiben fiktiv und gekennzeichnet: „Kranich Versicherung“, „Hausgeräte Brandt“, „Reparaturwerk Neukölln“, „Jonas K.“, Preise wie 189 € oder 899 €. Leg sie in **eine** Konfigurationsdatei, damit wir für jeden Pitch Versicherer, Händler und Hersteller tauschen können (Whitelabel-Light).
- Echter Fakt, der bleiben soll: Original-Ersatzteile für Waschmaschinen müssen laut EU-Ökodesign innerhalb von **15 Arbeitstagen** lieferbar sein.
- Look: Airbnb-artige Klarheit. Weißer Grund, viel Luft, große Fotos mit 12 px Radius, Listen mit feinen Linien statt Kästen in Kästen, eine feste Aktionsleiste unten (links Info, rechts Aktion), runde Zurück-Buttons und eine schlichte Tab-Leiste. **Kein Farbakzent**, nur Ink- und Stone-Töne.

## 5. Designsystem

Der Ordner `design-system/` ist die Quelle der Wahrheit. Steht dort etwas anderes als hier, gilt `design-system/`. Diese Tokens stammen aus der Demo:

```
Schrift: Schibsted Grotesk 400/500/600/700, Fallback system-ui
Light:  bg #FFFFFF · page #E9E7E1 · sunken #F5F4F0 · line #E6E4DE · line-2 #D8D6CF · input #BDBBB4
        ink #16181A · body #3C3F43 · muted #5C5F63 · placeholder #8A8C8F
        inv #16181A · on-inv #F5F4F0 · on-inv-muted #D6D5D0 · danger #C8372D
Dark:   bg #16181A · page #0F1112 · sunken #202326 · line #2C2F33 · line-2 #3C3F43 · input #5C5F63
        ink #F5F4F0 · body #D6D5D0 · muted #A9A8A3 · placeholder #7E8084
        inv #F5F4F0 · on-inv #16181A · on-inv-muted #3C3F43 · danger #E5564B
Radien: Buttons 8 px · Karten/Fotos 12 px · Pillen 999 px
Komponenten aus dem System: Primary Button (Ink, 50 px hoch), Secondary Button (Outline),
        ChoiceChip, StepProgress (Segmentbalken), Listenzeile mit Chevron, Info-Box (sunken)
Typo:   H1 28/1.12, -0.03em, 500 · Titel 20–22, 600 · Body 16–17 · Meta 13–14 muted
```

Setz alles als Tokens um (Theme-Datei). Keine fest eingetragenen Hex-Werte in Komponenten. Dark Mode muss funktionieren.

## 6. Phase 1: Review

### 6.1 Vorgehen

1. Lies `Main.dc.html` vollständig und zeichne den **Ist-Flow** als Mermaid-Diagramm: alle Screens, alle Übergänge, alle Zurück-Ziele.
2. Prüf jeden Screen und jeden Übergang gegen die Kriterien in 6.2.
3. Prüf die **bekannten Befunde** in 6.3. Bestätige, widerlege oder präzisiere sie.
4. Bewerte die **Quick-Win-Kandidaten** in 6.4 und ergänze eigene.
5. Entwirf den **Soll-Flow** als Mermaid-Diagramm. Ziel: weniger Schritte bis zur ersten Hilfe, keine Sackgassen, keine doppelten Wege.

### 6.2 Kriterien

- **Nielsens 10 Heuristiken**, vor allem Sichtbarkeit des Status, Kontrolle und Freiheit (Zurück, Abbrechen, Rückgängig), Fehlervermeidung und Konsistenz.
- **Plattform-Konventionen:** Apple Human Interface Guidelines und Material Design 3. Dazu gehören Navigation, Zurück-Geste, Tab-Leiste, Sheets, Kamera-Berechtigungen, Push-Berechtigungen und Safe Areas.
- **Flow-Effizienz:** Zähl die Taps bis zur ersten Hilfe pro Einstieg (Foto, Display-Meldung, Symptom). Wo sind Schritte unnötig, wo sind Reihenfolgen zu kompliziert?
- **Zustände:** Leer, Laden, Fehler, Offline, geringe Erkennungssicherheit, abgelehnte Berechtigung und abgebrochener Fall. Was passiert, wenn die App mitten im Fall geschlossen wird?
- **Vertrauen und Recht** (ich bin Jurist, achte hier besonders genau darauf):
  - Einwilligung **vor** jeder Datenweitergabe an Versicherer, Betrieb oder Hersteller (DSGVO Art. 6, 7 und 13).
  - Kein Schadenfall wird ohne aktive Bestätigung der Nutzerin oder des Nutzers angelegt (Obliegenheiten nach VVG, Transparenz).
  - Kostentransparenz vor jeder Buchung: wer zahlt, Selbstbeteiligung, was passiert bei Ablehnung.
  - Sicherheitshinweise aus der Herstelleranleitung (Strom, Wasser, Verbrühung) bleiben gut sichtbar.
  - Fotos als Nachweis: Zeitstempel, Gerätebezug, nur in der App aufgenommen.
- **Barrierefreiheit:** WCAG 2.2 AA, Kontrast mindestens 4.5:1, Touch-Ziele mindestens 44 × 44 pt, Screenreader-Labels, Dynamic Type bis 200 %, keine Information nur über Farbe.
- **UX-Texte:** Klarheit, Konsistenz von Begriffen (z. B. „Meldung“ und „Fehler“, „Fachkraft“ und „Betrieb“) und Buttons, die ohne Kontext verständlich sind.
- **Pitch-Wirkung:** Erkennt ein Versicherer in 3 Minuten, dass bei ihm ein sauberer, prüfbarer Fall ankommt? Wo sollte die App das sichtbarer machen, ohne den Haushalt zu stören?

### 6.3 Bekannte Befunde (prüfen)

1. **Doppelte Einstiege:** Die Suchpille „Was ist kaputt?“ und die Gerätekarte führen beide auf denselben Screen „Was ist los?“. Es fehlt eine **Gerätedetailseite** mit Status, Garantie, Pflege, Anleitung und Verlauf dieses Geräts.
2. **Fotodiagnose ohne Verzweigung:** Egal ob Display, Typenschild oder Bauteil, das Ergebnis ist immer „Laugenfilter verstopft“ und die Anleitung ist immer „Wasserablauf“. Es gibt keinen Pfad für geringe Sicherheit, „passt nicht“ oder „anderes Problem“.
3. **Schadenfall ohne Zustimmung:** Der Eskalations-Screen sagt „Ein Schadenfall wurde automatisch angelegt“, bevor jemand zugestimmt hat.
4. **Anleitung verliert den Fortschritt:** Der Zurück-Button in der Anleitung springt aus der Anleitung heraus, statt einen Schritt zurück. Es gibt kein „Schritt geht nicht“ und kein Pausieren.
5. **Unklare Abfrage:** Am Ende der Anleitung stehen nur die Buttons „Nein“ und „Ja, läuft“. „Nein“ ohne Kontext ist schwach.
6. **Zwei Wege zum Betrieb:** Aus der Eskalation kann man den Videocall überspringen und direkt buchen. Dann fehlen Befund und Kostenvergleich. Prüf, ob das gewollt ist und wie die Buchung dann aussieht.
7. **Kein Status nach der Buchung:** Es fehlen Push-Mitteilung, Statusverfolgung (bestätigt, unterwegs, repariert), Abschlussfoto, Bewertung und ein „Problem besteht weiter“.
8. **Verlauf ist flüchtig:** Der Verlauf zeigt nur die aktuelle Sitzung und „Heute“. Es gibt keine Falldetailseite und keinen Export als Nachweis.
9. **Kein Onboarding:** Es fehlen Konto, Verknüpfung mit Vertrag oder Geräteschutz (z. B. per Vertragsnummer oder Code des Händlers), Kaufbeleg und Berechtigungen. Für Versicherer und Händler ist das der eigentliche Einstieg.
10. **Gerät hinzufügen:** Der Typenschild-Scan übernimmt ohne Korrekturmöglichkeit. Es gibt keine manuelle Eingabe und kein „falsches Gerät“.
11. **Kundendienst-Nummer fest eingetragen:** Die Miele-Nummer ist hart codiert. Sie muss aus den Gerätedaten kommen.
12. **Videocall:** Mikrofon und Kamera haben keine Funktion. Es gibt keine Wartezeit, keine Einwilligung zur Aufnahme und keinen Ersatzweg, wenn keine Fachkraft frei ist.
13. **Demo-Elemente:** Die Hinweis-Leiste „Demo“ und die Portal-Links im Abschluss-Screen gehören nicht in die App. Schlag einen getrennten **Demo-Modus** vor (z. B. per Konfiguration oder versteckter Geste), der für Pitches Hinweise und Beispieldaten einschaltet.
14. **Inkonsistente Zahlen:** In der App spart der Fall 710 €, im Portal liegt der Durchschnitt bei 538 € (680 € minus 142 €). Die Werte müssen aus einer Quelle kommen.
15. **Profil fehlt:** Die Tab-Leiste hat nur „Geräte“ und „Verlauf“. Es fehlen Profil, Schutz/Vertrag, Datenschutz und Einwilligungen.

### 6.4 Quick-Win-Kandidaten (bewerten nach Nutzen und Aufwand)

- Fall fortsetzen: eine Karte „Offener Fall“ auf der Startseite.
- Werkzeugliste vor dem Start einer Anleitung, nicht erst im Schritt.
- „Schritt geht nicht“ mit direktem Sprung in die Eskalation, inklusive Protokoll.
- Erkennungssicherheit sichtbar machen und bei geringer Sicherheit eine Rückfrage stellen.
- Kaufbeleg oder Garantie per Foto hinzufügen.
- Pflege-Erinnerungen als Push.
- Teilen des Diagnose-Protokolls als PDF.
- Haptisches Feedback beim Auslöser und bei „Erledigt“.
- Ergänze eigene Ideen. Aber: **keine Features, die nicht in einen Prototyp passen.**

### 6.5 Ergebnis von Phase 1

**`docs/REVIEW.md`**
- Ist-Flow als Mermaid-Diagramm.
- Befunde als Tabelle: ID, Screen, Befund, Kriterium, Schwere (P0 blockiert, P1 wichtig, P2 nice to have), Vorschlag.
- Bewertung von 6.3 und 6.4.
- Soll-Flow als Mermaid-Diagramm mit Tap-Zählung vorher und nachher.
- Offene Fragen an mich, maximal 5.

**`docs/BUILD_PLAN.md`**
- Tech-Stack mit Begründung (siehe 7.1).
- Screen-Liste des Prototyps mit Zweck, Zuständen und Komponenten.
- Datenmodell (siehe 7.3) als TypeScript-Typen.
- Komponentenliste aus dem Designsystem.
- Reihenfolge der Umsetzung in kleinen Schritten mit Akzeptanzkriterien.
- Was bewusst weggelassen wird.

Danach: **stopp und warte auf meine Freigabe.**

## 7. Phase 2: Build (erst nach Freigabe)

### 7.1 Stack (Vorschlag, im Bauplan bestätigen oder begründet ändern)

- **Expo (React Native) mit TypeScript und Expo Router.** So läuft der Prototyp im Pitch auf einem echten Handy (Expo Go) und optional im Browser.
- Wenn das Repo schon einen anderen Stack hat, nutze diesen.
- State: lokal (z. B. Zustand), mit Persistenz über AsyncStorage, damit ein offener Fall den Neustart der App übersteht.
- **Mock-Backend** hinter einem Service-Interface (`services/`), damit wir später ein echtes Backend anschließen können, ohne die Screens zu ändern.
- Kamera: `expo-camera` mit echtem Berechtigungs-Flow. Die Diagnose ist simuliert (siehe 7.4).

### 7.2 Muss im ersten Build drin sein

- Der Golden Path ohne Sackgasse: Onboarding (kurz) → Gerät → Problem melden → Intelligente Fehlererkennung → Ergebnis → Anleitung → „läuft nicht“ → Hilfe holen mit Einwilligung → Videocall (simuliert) → Entscheidung Reparatur oder Ersatzteil → Buchung → Status → Abschluss.
- Der Nebenpfad „selbst gelöst“ mit Eintrag im Verlauf.
- Alle P0- und P1-Befunde aus dem Review sind behoben.
- Demo-Modus per Konfiguration: Hinweise an/aus, Beispieldaten, Namen von Versicherer, Händler und Hersteller austauschbar.
- Dark Mode, Dynamic Type und Screenreader-Labels.
- Alle Texte zentral in einer Datei (z. B. `i18n/de.ts`), Sprache Deutsch.

### 7.3 Datenmodell (für die späteren Dashboards)

Leg mindestens diese Typen an und lass die App sie erzeugen:

- `Household`, `Device` (Hersteller, Modell, M.-Nr., Kaufdatum, Schutzvertrag), `Contract` (Versicherer, Laufzeit, Selbstbeteiligung)
- `Case` mit Status-Maschine (offen → Selbsthilfe → eskaliert → freigabe_nötig → freigegeben → in_reparatur → erledigt | abgebrochen)
- `CaseEvent` (Zeitstempel, Typ, Akteur, Nutzlast): jeder Schritt, jedes Foto, jeder Anruf und jede Freigabe
- `Photo` (Zeitstempel, Gerätebezug, Zweck), `Diagnosis` (Fehlerbild, Bauteil, Sicherheit, Quelle)
- `GuideRun` (Anleitung, erledigte Schritte, Abbruchschritt)
- `Consent` (Zweck, Empfänger, Zeitpunkt, Widerruf)
- `Quote` (Reparatur, Ersatzgerät, Ersparnis, Kostenträger) und `Booking` (Betrieb, Termin, Status)

Dokumentiere in `docs/DATA_MODEL.md`, welches Dashboard (Versicherer, Händler, Hersteller) später welche Felder liest.

### 7.4 Simulation

- Die Intelligente Fehlererkennung ist ein Mock mit Regeln: Moduswahl (Display, Typenschild, Bauteil) plus Auswahl im Demo-Modus. Er liefert ein Ergebnis mit Sicherheitswert. Mindestens ein Fall hat **geringe Sicherheit** und zeigt den Rückfragepfad.
- Die Anleitungsinhalte übernimmst du **wörtlich** aus `guides()` in `Main.dc.html` und legst sie als Daten (JSON oder TS) ab.
- Videocall, Freigabe durch den Versicherer und Status des Betriebs laufen über Timer im Mock-Service. Im Demo-Modus kann man sie per Tap auslösen.

### 7.5 Qualität

- TypeScript strict, ESLint und Prettier.
- Ein paar Tests für die Status-Maschine des Falls und für den Mock der Diagnose.
- `README.md` mit Start in 3 Befehlen und einer Anleitung für den Demo-Modus.
- Kleine, sinnvolle Commits. Kein Push und kein PR ohne meine Anweisung.

## 8. Arbeitsweise

- Wenn etwas unklar ist: triff eine vernünftige Annahme, schreib sie in den Review oder den Bauplan und mach weiter. Frag nur bei Entscheidungen, die sich schwer rückgängig machen lassen.
- Halte das Ergebnis einfach. Lieber ein sauberer Golden Path als viele halbe Features.

## 9. Vor dem Start von mir zu erledigen (Checkliste für Lennart)

- [ ] `design-system/` mit Tokens, Komponenten und README ins Repo legen.
- [ ] Markenfotos nach `assets/photos/` legen (Display, Laugenpumpe, Typenschild, Videocall-Fachkraft, Eigenbild Pumpe, Werkstatt, Abschluss, Monteurin).
- [ ] Optional: die Miele-Gebrauchsanweisung WKB 130 als PDF nach `reference/` legen.