# Annahmen aus Phase 2

Annahmen, die ich beim Bauen getroffen habe. Jede lässt sich ändern.

## Schritt 1: Setup

- **Expo SDK 58** ist das aktuelle stabile SDK (npm `expo@latest` = 58.0.19, Stand 26.10.2026). Expo Go aus App Store und Play Store unterstützt nur das jeweils aktuelle SDK.
- **Ordner `app/` im Wurzelverzeichnis** wie im Bauplan, nicht `src/app/` wie in der neuen Expo-Vorlage. Der Import-Alias `@/` zeigt auf das Wurzelverzeichnis.
- **Kein eigenes App-Icon und kein Splash-Bild.** Die Vorlage bringt Expo-Logos mit, die nutze ich nicht. Expo Go braucht kein Icon.
- **Prettier formatiert keine Markdown-Dateien**, damit die Dokumente aus Phase 1 unverändert bleiben.

## Schritt 2: Theme und Basis-Komponenten

- **Screen-Grund Stone 100, Karten weiß.** Der Auftrag nennt „weißer Grund“, das Designsystem legt Karten auf `--bg-page` (Stone 100) und verbietet weiß auf weiß. Es gilt das Designsystem.
- **Dark-Zuordnung:** Seite `#16181A`, Karte `#202326`, gedämpfte Fläche `#2C2F33`, gewähltes Segment `#3C3F43`. Karten sind im Dunkeln heller als der Grund, wie auf beiden Plattformen üblich. Alle Werte stammen aus dem Auftrag, Abschnitt 5.
- **Rahmen-Token `borderControl`:** hell `#8A8C8F` (3,4 : 1 auf Weiß, 3,1 : 1 auf Stone 100), dunkel `#7E8084` (4,0 : 1 auf der Karte). Ein Test prüft alle Paare.
- **„Achtung“-Box** ist ein dunkler Block (Inverse) mit Dreieck und Wort. Das Designsystem nutzt dunkle Blöcke für Sicherheit.
- **Kamera und Fotos:** Bedienteile über Fotos haben in beiden Modi feste Farben (`onPhoto`, `photoInk`), weil das Kamerabild immer dunkel ist.
- **Dynamic Type:** Eine eigene `Text`-Komponente setzt die Typo-Rolle und begrenzt die Skalierung auf 200 %. ESLint verbietet `Text` direkt aus `react-native` in Screens. Ab 150 % stapeln FactList und ActionBar ihre Spalten.
- **Galerie** unter `/galerie`. Sie hat Schalter für 100/200 % und Hell/Dunkel (nur Vorschau). Bis Schritt 4 führt ein Button auf der Startseite dorthin, danach die Demo-Steuerung.
- **Bildschirm-spezifische Komponenten** (CameraFrame, ShutterButton, SearchPill, DeviceCard, OpenCaseCard, CostCompare, VideoStage, RoundButton) baue ich mit ihren Screens. Die Tab-Leiste kommt mit der Navigation in Schritt 4.
- **Typed Routes aus.** Die Typen entstehen erst beim `expo start`. Ohne sie läuft `tsc` auch in einem frischen Klon.
- **Lucide-Set** im README des Designsystems vermerkt.

## Schritt 3: Modell, Status-Maschine, Store, Konfiguration, Texte, Anleitungen

- **Typen** stehen unverändert aus dem Bauplan in `model/types.ts`. Die Status-Maschine liegt getrennt in `model/caseMachine.ts`, als reine Funktionen ohne Uhr.
- **Schadenmeldung:** `schaden_melden` geht nur, wenn die meldende Person selbst handelt und eine nicht widerrufene Bestätigung `weitergabe_versicherer` für diesen Fall hat. Das System kann keinen Schadenfall anlegen.
- **Bestätigung mit Fallbezug** erzeugt das Ereignis `weitergabe_bestaetigt`, ein Widerruf `einwilligung_widerrufen`.
- **Fallnummer** beginnt bei GS-24817, wie im Versicherer-Portal der Demo.
- **Aufteilung der 189 €:** Teil 119 €, Arbeit 70 €. Die Entscheidungen nennen nur die Summe. Das Datenmodell braucht beide Werte.
- **Kaufdatum und Schutzbeginn** 15.03.2023, Schutz bis 31.03.2028. Die Entscheidungen nennen nur den Monat.
- **Haushalt:** Name „Sam“, Adresse „Beispielstraße 12, 12043 Berlin“. Fiktiv, nur für Zusammenfassung und Termin.
- **Händler und Händler-Code** bleiben `[HÄNDLER]` und `[CODE]`, bis du sie einträgst.
- **Anleitungstyp:** `hygiene` ist Pflege, `dosierung` ist Hinweis, alle anderen sind Störung. Die Pflege-Zeile „Zulaufsiebe prüfen“ öffnet die Störungs-Anleitung `zulauf`. Ob sie mit „Fertig“ endet, entscheidet der Einstieg des Falls (`entry: 'pflege'`), nicht die Anleitung.
- **Schrittfotos:** In den Anleitungen stehen statt der Blob-URLs der Demo die Schlüssel `fehler` und `pumpe`.
- **Vergleich der Anleitungen** läuft als Jest-Test (`npm run guides:check`), weil `data/guides.ts` TypeScript ist. Er liest `guides()` direkt aus `reference/demo-v1.0/Main.dc.html`.
- **Texte:** Eine Lint-Regel findet Text in JSX und in Text-Props (`label`, `title`, `accessibilityLabel` usw.) außerhalb von `i18n/de.ts`. Ausnahme: `data/guides.ts` (Anleitungsdaten) und `config/demo.config.ts` (Beispielwerte). Texte für einzelne Screens kommen mit den Screens dazu.

## Schritt 4: Navigation

- **Routen** wie im Bauplan. Einzige Abweichung: Der Onboarding-Screen heißt `geraet-bestaetigen` statt `geraet`, weil `/geraet/…` schon das Gerätedetail ist.
- **Onboarding-Sperre** über `Stack.Protected` im Root-Layout. Vor dem Onboarding sind Tabs, Gerät und Fall nicht erreichbar. `(onboarding)/index` leitet `/` auf „Willkommen“ um. Ohne diese Umleitung landete ein frischer Start auf „Unmatched Route“.
- **Fall als modaler Stack** mit `presentation: 'fullScreenModal'` und ohne Wischen nach unten. Sonst ließe sich der Fall am Schließen-Sheet vorbei wegwischen. Im Fall gehen Wischgeste (iOS, ganze Breite), Android-Zurück und der Zurück-Button gleich einen Screen zurück. Auf dem ersten Screen verlassen alle drei den Fall.
- **X im Fall** öffnet das Schließen-Sheet: „Später weitermachen“ setzt `pausedAt`, „Fall abbrechen“ braucht einen Grund (B-04). Die Gründe sind ein Vorschlag.
- **Call-Screens ersetzen sich** (`replace`): Nach dem Auflegen führt Zurück nicht in den Videocall oder den Warteraum.
- **Platzhalter:** Screens ab Schritt 5 zeigen nur Titel, den geplanten Schritt und die Wege weiter. Sie nutzen bis dahin die Demo-Fallnummer GS-24817 und ein Demo-Gerät (`components/nav/demoIds.ts`).
- **Tab-Leiste:** Standard-Tab-Leiste von Expo Router, im Theme eingefärbt, mit Lucide-Icons. Die Beschriftungen wachsen wie im System nicht mit der Schrift. iOS zeigt sie bei langem Drücken groß (Large Content Viewer).
- **Galerie** liegt im Profil („Komponenten (Demo)“), bis es in Schritt 13 die Demo-Steuerung gibt. Dort gibt es auch „Onboarding neu starten (Demo)“.

## Schritt 5: Onboarding, Geräte, Gerätedetail, Gerät hinzufügen

- **Mock-Services** liegen in `services/mock/`, die App nutzt nur `services` aus `services/index.ts`. Wartezeiten sind künstlich (Vertrag 0,8 s, Typenschild 1,2 s). Tests schalten sie ab.
- **Verknüpfung:** Vertragsnummer und Händler-Code werden ohne Leerzeichen, Bindestriche und Groß/klein verglichen. Danach gehören alle Geräte des Vertragsmodells (WKB 130), die schon in der App sind, zum Vertrag.
- **Ohne Schutz** endet das Onboarding mit „Gerät hinzufügen“ oder „Später hinzufügen“. Die Startseite zeigt dann einen Leerzustand.
- **Typenschild-Scan:** Der Mock „erkennt“ das Gerät aus der Konfiguration mit erfundener M.-Nr. und Fabrik-Nr. (`demoConfig.device.typePlate`). Das Demo-Szenario „nicht erkannt“ zeigt den Fehlerfall. Der Prototyp kennt nur einen Hersteller, die Eingabe von Hand bietet darum nur diesen an.
- **Kamera:** Vor dem Systemdialog erklärt die App, wofür sie die Kamera braucht (B-15). Ist sie abgelehnt, führt ein Button in die Einstellungen. Im Browser und ohne Kamera gibt es ein Beispielfoto, im Demo-Modus auch nach einer Ablehnung.
- **Pflege** steht nur im Gerätedetail, nicht auf der Startseite (B-01). Die Zeilen öffnen bis Schritt 8 „Problem melden“.
- **Kundendienst** kommt aus `Manufacturer.serviceContact` und öffnet die Telefon-App. Das ist der einzige Weg aus der App heraus und im Soll-Flow so vorgesehen.
- **Schutz nachträglich verknüpfen** geht aus dem Gerätedetail (`/schutz-verknuepfen`).
- **Selbstbeteiligung** zeigt den Wert aus den Demo-Einstellungen, Standard 0 € aus der Konfiguration.

## Schritt 6: Problem melden, Meldungen, Symptome, „Etwas anderes“

- **Ein Fall entsteht mit der ersten Wahl** in „Problem melden“. Verlässt man den Screen ohne Inhalt (kein Foto, kein Ergebnis, keine Anleitung), verschwindet der Entwurf wieder. Eine zweite Wahl nutzt denselben Entwurf.
- **Gerät:** „Problem melden“ gilt für das Gerät, von dem man kommt, sonst für das erste Gerät. Eine Geräte-Auswahl kommt erst mit mehreren Geräten.
- **Meldung im Display** speichert ein Ergebnis mit Quelle `nutzerangabe` und startet direkt die Anleitung (3 Taps ab der Startseite).
- **Symptom** startet direkt die Anleitung (2 Taps). „Bevor du anfängst“ steht in Schritt 1 (Schritt 8).
- **„Etwas anderes“** ist ein Sheet mit Freitext. Der Text geht als Antwort auf „Was ist passiert?“ in die Fallakte, dann folgt „Hilfe holen“. Ein Foto lässt sich hier noch nicht anhängen, die Fachkraft sieht das Gerät im Videocall.
- **Kein Link nach außen:** Ein Test prüft, dass `app/`, `components/`, `i18n/` und `config/` keine Web-Adresse und keinen Chat enthalten.

## Schritt 7: Kamera, Fehlererkennung, Rückfrage, Ergebnis

- **Regel-Mock** in `services/mock/diagnosisService.ts`: Display → Wasserablauf, Sicherheit hoch. Bauteil → Laugenpumpe blockiert, mittel. Typenschild → Gerät erkannt, keine Diagnose. Szenario „unsicher“ → Rückfrage, „unscharf“ → Fehler. Beide Störungs-Ergebnisse führen zur Anleitung „Wasserablauf“, die Rückfrage kann auch „Wasserzulauf“ ergeben.
- **Rückfrage:** „Was passiert, wenn das Programm abbricht?“ mit drei Antworten. „Weiß ich nicht“ führt zu „Hilfe holen“. Die Sicherheit nach einer Rückfrage ist „mittel“.
- **Ergebnis als Typenschild:** Das Ergebnis sagt nur, welches Gerät es ist, und bietet „Display fotografieren“ oder „Problem beschreiben“ an.
- **Analyse-Schritte** sind allgemein formuliert („Meldung im Display lesen“), weil sie vor dem Ergebnis laufen. Die Demo nannte schon während der Analyse das Ergebnis.
- **Bezeichnung des Falls** ist nach dem Ergebnis der Titel der Anleitung, z. B. „Wasserablauf gestört“.
- **„Bevor du anfängst“** nennt das Werkzeug aus der Anleitung. Die Anleitung „Wasserablauf“ braucht keins. Die Demo nannte eine Dauer von 15 Minuten. Die steht nicht in der Anleitung, darum zeige ich sie nicht.
- **Kostenhinweis** im Ergebnis ohne Zusage (B-13). Ein Test prüft alle Texte in `i18n/de.ts` auf Formulierungen wie „übernimmt die Kosten“ oder „kostet dich nichts“.
- **Sicherheitswert** als Zahl (`confidenceScore`) bleibt intern. Die App zeigt nur „hoch“, „mittel“ oder „unsicher“.

## Schritt 8: Anleitung

- **Fortschritt im Store:** `GuideRun.currentStep` und `completedSteps` werden bei jedem Schritt gespeichert. Ein Neustart führt über die Karte „Offener Fall“ direkt in den gespeicherten Schritt. „Weitermachen“ löscht `pausedAt`.
- **Zurück = Schritt zurück:** Ab Schritt 2 sperrt `usePreventRemove` das Entfernen des Screens. Zurück-Button, Android-Zurück und die Wischgeste auf iOS lösen dann „Schritt zurück“ aus. In Schritt 1 verlassen sie die Anleitung. Wer den Fall über das X verlässt, kommt trotzdem hinaus.
- **Ende je nach Art (B-08):** Störung fragt „Läuft die Maschine wieder?“ mit „Läuft noch nicht“ und „Läuft wieder“. Pflege und Hinweise enden mit „Fertig“. Bei einem Pflege-Fall gilt „Fertig“ auch für die Störungs-Anleitung „Zulaufsiebe“. „Nicht selbst lösbar“ (Türentriegelung, Waterproof) bietet nur „Hilfe holen“.
- **Pflege-Fälle** enden mit `resolution: 'pflege_erledigt'` und führen zurück zur Startseite. Sie stehen in den Fällen.
- **Sicherheitsbestätigung (Q-13):** Bei Waterproof muss „Der Wasserhahn ist zu“ angehakt sein, bevor es weitergeht. Der Haken wird als Ereignis gespeichert. Weitere Schritte lassen sich in `lib/guideMeta.ts` ergänzen.
- **„Geht nicht“** öffnet ein Sheet mit optionaler Notiz für die Fachkraft (Q-15). Abbruchschritt und Notiz stehen im `GuideRun`.
- **Schrittfotos** sind beschriftete Platzhalter („Display mit Meldung“, „Laugenfilter hinter der Klappe“).
- **Haptik** bei „Erledigt“ und „Läuft wieder“ (Q-8).
- **Quelle** jeder Anleitung steht klein unter dem Schritt (B-56).

## Schritt 9: Hilfe holen, Warteraum, Videocall, Befund

- **Bestätigung vor dem Call (B-19):** „Videocall starten“ ist die aktive Bestätigung. Sie speichert eine Einwilligung `weitergabe_fachkraft` mit Rechtsgrundlage `vertrag` (lit. b), Empfänger ist der Betrieb der Fachkraft. Der Store verweigert Anfrage und Verbindung ohne gültige Bestätigung, Warteraum und Videocall leiten dann zu „Hilfe holen“ um.
- **Screenshots im Call** sind eine eigene, freiwillige Einwilligung (lit. a), Standard aus.
- **Keine Aufnahme** steht vor dem Call und im Call. `VideoSession.recording` ist im Datenmodell immer `false`.
- **Warteraum:** 3 bis 8 Sekunden, dann verbunden. Im Demo-Modus mit Hinweisen gibt es „Wartezeit überspringen“. Szenario „keine Fachkraft frei“: Rückruf mit Zeitfenster oder Vor-Ort-Diagnose.
- **Im Call** gibt es keinen Zurück-Button. Zurück, Wischen und Android-Zurück legen auf wie der rote Knopf. Mikrofon und Kamera sind Umschalter mit Zustand für den Screenreader. Bild und Ton sind Platzhalter.
- **Protokoll:** Die Fallakte zeigt die echten erledigten Schritte und den Abbruchschritt, ohne Anleitung „Anleitung nicht gestartet“ (B-22).
- **Befund:** Die Fachkraft empfiehlt im Mock immer „Reparatur durch einen Fachbetrieb“. Die Nutzerin bestätigt oder wählt „Im Call gelöst“ oder „Ersatzgerät nötig“. Bei Reparatur und Ersatzgerät entsteht ein Kostenvoranschlag mit den Preisen aus der Konfiguration. „Ersatzteil an dich“ gibt es nicht (Entscheidung 3).
- **Kostenhinweis** in „Hilfe holen“ ohne Zusage (B-18). Ein Schadenfall entsteht hier nicht (B-17).

## Schritt 10: Kosten und Schadenmeldung, Betrieb und Termin

- **Schadenmeldung:** Der Tap auf „Schadenfall melden“ speichert die Bestätigung `weitergabe_versicherer` (lit. b, Empfänger Versicherer) und wechselt auf `freigabe_noetig`. Vorher stehen Kostenträger, Selbstbeteiligung und „Wenn Kranich ablehnt“ auf dem Screen.
- **Vorschau „Das geht an Kranich“** ist eingeklappt (B-53, Q-9). Sie zeigt die Fallakte mit Vertrag, Fotos mit Uhrzeit, Ergebnis, Schritten mit Abbruchschritt, Befund und Kosten.
- **Ersparnis** wird berechnet und als „in diesem Fall“ beschriftet (B-48). „Beispielwerte“ steht darunter, solange die Demo-Hinweise an sind.
- **Termin vorbehaltlich Freigabe** (Entscheidung 5): Man kann den Termin direkt nach der Meldung anfragen. Der Screen sagt das.
- **Button-Lösung:** Zahlt die Nutzerin etwas (Selbstbeteiligung über 0 € oder Reparatur selbst), heißt der Button „Zahlungspflichtig buchen“. Die Selbstbeteiligung kommt aus den Demo-Einstellungen, Standard 0 €.
- **Ohne Schutz** gibt es keinen Schadenfall. „Weiter zum Termin“ führt zur zahlungspflichtigen Buchung, der Fall wechselt dabei auf `in_reparatur`.
- **Abgelehnt:** Der Kosten-Screen bietet „Reparatur selbst zahlen“, „Kostenvoranschlag behalten“ und „Fall schließen“.
- **Ersatzgerät:** Nach der Meldung geht es direkt zum Status. Kranich meldet sich zum Ersatzgerät. Einen eigenen Ablauf dafür gibt es im Prototyp nicht.
- **Laugenpumpe:** Der Betrieb bestellt und baut ein (Entscheidung 3). Der Store lehnt einen Versand der Pumpe an den Haushalt ab. Der Ökodesign-Text sagt, dass die 15 Arbeitstage für den Betrieb gelten (Review 4.1).
- **Vor-Ort-Diagnose** aus „Hilfe holen“ bucht einen Termin ohne Kostenvoranschlag. Den Voranschlag macht der Betrieb vor Ort (Schritt 11).
- **Weitergabe an den Betrieb** wird mit „Termin anfragen“ bestätigt und als Einwilligung `weitergabe_betrieb` gespeichert.

## Schritt 11: Fall-Status, Mitteilungen, Abschluss

- **Simulation:** Ein Timer im Root-Layout prüft jede Sekunde, ob ein Schritt fällig ist. Freigabe 10 s nach der Meldung, danach je 5 s: Termin bestätigt, Betrieb unterwegs, repariert (`demoConfig.timers`). Fällige Schritte aus der Zeit vor einem Neustart laufen sofort. Im Demo-Modus mit Hinweisen gibt es „Nächster Schritt (Demo)“.
- **Freigabe** entscheidet im Mock ein Mensch (`actor: 'mensch'`, Art. 22 DSGVO). Das Demo-Szenario „ablehnen“ zeigt den Ablehnungsweg.
- **Ein Termin vorbehaltlich Freigabe** wird erst nach der Freigabe bestätigt. Bei Selbstzahlung sofort.
- **Repariert** heißt: Der Betrieb meldet „fertig“ mit Abschlussfoto (Platzhalter). Der Fall bleibt `in_reparatur`, bis die Nutzerin „Läuft wieder“ oder „Problem besteht weiter“ wählt.
- **Vor-Ort-Diagnose:** Nach dem Besuch legt der Mock einen Befund vom Betrieb mit Kostenvoranschlag an. Der Status führt dann zu „Kosten ansehen“.
- **Mitteilungen:** Der Systemdialog kommt erst nach „Termin anfragen“ (Review 4.1). Die Antwort steht im Store (`notifications`). Nur bei „erlaubt“ gibt es lokale Mitteilungen bei jedem Wechsel. In Expo Go auf Android sind Mitteilungen aus, weil Expo Go sie dort nicht mehr vollständig unterstützt. Auf dem iPhone funktionieren lokale Mitteilungen.
- **Bewertung** gilt dem Betrieb und erscheint nach „Läuft wieder“.
- **„Problem besteht weiter“** öffnet einen erledigten oder reparierten Fall wieder (`eskaliert`) und führt zu „Hilfe holen“.
- **„Fertig“** im Abschluss führt zum Tab „Fälle“.

## Schritt 12: Fälle, Fallakte, Profil

- **Fälle:** offene oben, abgeschlossene darunter, jeweils nach letzter Änderung. Ein offener Fall führt dorthin, wo er steht, ein abgeschlossener in die Fallakte.
- **Fallakte:** Kurzfassung (Gerät, Problem, Ergebnis, Schritte, Fotos, Befund, Kosten), Weitergaben mit Empfänger und Datum, dazu der ganze Verlauf aus `CaseEvent` mit lesbaren Zeilen (`lib/caseEvents.ts`). Teilen als PDF folgt mit Schritt 15.
- **Widerruf im Profil:** Jede Weitergabe und Einwilligung steht mit Empfänger, Grundlage („Für deine Anfrage“ oder „Einwilligung“) und Datum dort. „Widerrufen“ ist ein Tap (Art. 7 Abs. 3 DSGVO). Gehört die Einwilligung zu einem Fall, kommt der Widerruf als Ereignis in die Fallakte. Die Einwilligung „Einzelfälle an den Hersteller“ gehört zu keinem Fall, ihr Widerruf steht an der Einwilligung selbst.
- **Mitteilungen** lassen sich im Profil an- und ausschalten. Hat das System sie abgelehnt, öffnet der Schalter die Einstellungen.
- **Demo-Bereich** (Galerie, Onboarding neu starten) steht bis Schritt 13 sichtbar im Profil.

## Schritt 13: Demo-Modus und Whitelabel

- **Demo-Modus** an oder aus über `demoConfig.demo.enabled`. Alles Weitere steuert die Demo-Steuerung: 7-mal innerhalb von 3 Sekunden auf die Versionsnummer im Profil tippen.
- **Demo-Steuerung:** Szenarien für Fehlererkennung, Typenschild, Videocall und Freigabe, Selbstbeteiligung 0 € oder 50 €, Hinweise an/aus, „Offene Fälle einen Schritt weiter“, Komponenten-Galerie und „Alles zurücksetzen“. Die Selbstbeteiligung gilt auch für den gespeicherten Vertrag.
- **Hinweise** sind schließbare Tipps auf den wichtigen Screens, Texte angelehnt an die Demo-Leiste. „Hinweise an“ holt geschlossene Tipps zurück.
- **Hinweise aus = keine Demo-Spur:** keine Tipps, kein „Wartezeit überspringen“, kein „Nächster Schritt (Demo)“, keine Kennzeichnung „Beispielwerte“ und kein Beispielfoto nach abgelehnter Kamera. Ein Test prüft Startseite, Kosten, Termin, Status und Profil.
- **Whitelabel:** Alle Namen kommen aus `config/demo.config.ts`. Ein Test prüft, dass `i18n/de.ts` keinen dieser Namen enthält, und rendert die Screens mit einem anderen Versicherer. Die Beispiele in der Galerie sind darum neutral.
- **Platzhalter aus Schritt 4** sind entfernt. Alle Screens haben jetzt Inhalt.

## Schritt 14: Barrierefreiheit und Qualität

- **Audit-Test** (`__tests__/a11y.test.tsx`) rendert alle 25 Screens mit einem Fall auf dem Golden Path. Er prüft jedes Bedienteil auf Rolle, Label und mindestens 44 pt, jedes Eingabefeld auf ein Label und dass kein Text gekürzt wird. Bei 200 % Schrift prüft er, dass jeder Text mitwächst und keine Spalte mit fester Breite bleibt.
- **Ausnahmen:** Die Tab-Leiste kommt von React Navigation. Sie ist 70 pt hoch, ihre Beschriftung wächst wie im System nicht mit. Die Sterne der Bewertung sind ein Zeichen in einem 48-pt-Feld mit eigenem Label.
- **Kopfzeile:** Lange Titel brechen um, statt abgeschnitten zu werden.
- **Fehler gefunden und behoben:** Das Ergebnis brach ab, wenn nach dem Befund der Fachkraft jemand zum Ergebnis zurückkam. Es zeigt jetzt das letzte Ergebnis der Fehlererkennung.
- **VoiceOver und TalkBack** prüft der Test über die Rollen und Labels, die die Plattform vorliest. Ein Durchgang mit eingeschaltetem Screenreader auf einem echten Gerät steht noch aus.
- **Dokumente:** `docs/DATA_MODEL.md` (welches Dashboard welche Felder liest), `docs/BEFUNDE.md` (Abgleich aller P0- und P1-Befunde).

## Review nach Schritt 14 (Rückmeldung vom Gerätetest)

### Layout und Tastatur

- **Aktionsleiste:** Info links und Aktion rechts nur noch ab 428 pt Breite und mit genau einer Aktion. Auf kleineren iPhones steht die Info als eine Zeile über den Aktionen, zwei Aktionen teilen sich die Breite. Vorher brach „Schritt 1 von 7“ in drei Zeilen.
- **Fotos auf kleinen Screens:** Unter 760 pt Höhe (iPhone SE, mini) sind große Fotos mindestens 2 : 1, damit Titel und Schritttext ohne Scrollen sichtbar sind.
- **Tastatur:** `react-native-keyboard-controller` (in Expo Go enthalten). Der Inhalt scrollt das aktive Feld über die Tastatur, die Leiste unten wandert mit. Bottom Sheets weichen auf dem iPhone mit `KeyboardAvoidingView` aus, auf Android passt das System das Fenster an.

### Texte je Hausgerät

- **Gerätetyp bestimmt die Texte:** `de.appliance` hat je Gerätetyp (Waschmaschine, Geschirrspüler, Trockner, Kühlschrank) eigene Sätze für „Läuft … wieder?“, Typenschild-Ort, Symptome, Befund der Fachkraft, Teil, Videocall-Satz, Status („gut erreichbar“), Mitteilungen und Abschlussfoto. `lib/appliance.ts` liefert die Texte zum Gerät eines Falls.
- **Anleitungen nur für die Waschmaschine:** Die Anleitungen stammen wörtlich aus der Demo und damit aus der Gebrauchsanweisung einer Waschmaschine. Für andere Geräte erfinden wir keine. Dort zeigt „Problem melden“ eigene Symptome, ein Tap führt zu „Hilfe holen“. Die Fehlererkennung sagt ehrlich „Dafür gibt es noch keine Anleitung“ und bietet Hilfe an. Pflege-Anleitungen und „Display zeigt eine Meldung“ gibt es nur bei der Waschmaschine.
- **Beispielbefund je Gerät:** Geschirrspüler Laugenpumpe, Trockner Kondensatpumpe, Kühlschrank Temperaturfühler. Preise bleiben die Beispielwerte aus `demo.config.ts`. Das Teil im Kostenvoranschlag kommt aus dem Gerätetyp, nicht mehr aus der Konfiguration.
- **Teile nie an den Haushalt:** Die Sperre für den Versand gilt für jedes Teil aus einem Beispielbefund.

### Reparatur-Assistent (Chat mit Claude)

- **Aufbau:** Die App ruft `/api/chat` auf, eine Expo-Router-API-Route (`app/api/chat+api.ts`) auf dem Dev-Server. Nur dort liegt `ANTHROPIC_API_KEY` (aus `.env`, ohne `EXPO_PUBLIC_`). Dafür steht `web.output` in `app.json` auf `server`. Ein Test prüft, dass Systemprompt und SDK nicht im App-Bundle landen.
- **Modell und Einstellungen:** `claude-opus-5-5`, Aufwand `low` (kurze Chat-Antworten), Thinking adaptiv. Lehnt ein Sicherheitsfilter ab, versucht die API es mit dem empfohlenen Ersatzmodell (`fallbacks: "default"`). Wenn das zu teuer oder zu langsam ist, lässt sich das Modell in der Route tauschen.
- **Antwortformat:** Strukturierte Ausgabe mit `reply`, `suggestion` (keine, anleitung, hilfe) und `guideId`. Die App zeigt den Vorschlag als Button „Anleitung starten: …“ oder „Hilfe holen“. Anleitungen schlägt der Server nur für die Waschmaschine und nur aus dem Katalog vor, auch wenn das Modell etwas anderes liefert.
- **Systemprompt:** Du-Form, kurz, kein Ausrufezeichen, keine Emojis, keine Links, keine Kostenzusage, Sicherheit zuerst, nennt sich nicht „KI“. Alle Anleitungen stehen wörtlich im festen Teil, der gecacht wird. Der Fall steht in einem zweiten Block dahinter.
- **Datenschutz:** Vor der ersten Nachricht eine Einwilligung (`chat_assistent`, lit. a), Empfänger aus `demo.config.ts`. Mitgeschickt werden Gerät, Modell, Problem, Ergebnis, Stand der Anleitung und das Gespräch. Keine Fotos, keine Adresse, keine Vertragsnummer. Ablehnen führt zur Fachkraft.
- **Einstiege:** „Problem melden“ (Reparatur-Assistent fragen), jeder Schritt der Anleitung („Frag den Assistenten zu diesem Schritt“ mit Entwurf), „Hilfe holen“ unter „Andere Wege“, Ergebnis ohne Anleitung.
- **Ohne Schlüssel oder Netz:** ehrliche Meldung, „Hilfe holen“ bleibt immer möglich. Kein vorgetäuschter Chat.
- **Grenzen:** höchstens 40 Nachrichten je Gespräch und 1200 Zeichen je Nachricht. Danach verweist der Assistent auf die Fachkraft.
- **Für den Pitch ohne WLAN-Rechner** braucht es später einen eigenen Server (z. B. EAS Hosting) mit Anmeldung und Rate-Limit. Heute läuft die Route nur, solange `npx expo start` läuft.

### Darstellung (27.10.2026)

- **Hell oder dunkel:** Im Profil unter „Darstellung“: Wie System, Hell, Dunkel. Standard ist „Wie System“. Die Wahl wird gespeichert und bleibt auch nach „Alles zurücksetzen“. `Appearance.setColorScheme` sorgt dafür, dass auch Tastatur und Systemdialoge folgen.

### Gesprächsstil (27.10.2026)

- **Bausteine** in `components/app/Conversation.tsx`: Nachricht von ganz (großer Text ohne Blase, Absender „ganz“ darüber), Antwort des Haushalts (Tintenblase rechts, Stift zum Ändern), Antwort-Buttons als Liste am unteren Rand. Lange Listen scrollen in sich, höchstens halbe Bildschirmhöhe.
- **Problem melden:** Bei mehreren Geräten fragt ganz zuerst nach dem Gerät, sonst sagt es, um welches Gerät es geht. Dann „Was ist los?“ mit Foto, Meldung im Display, Symptomen, „Etwas anderes“ und dem Reparatur-Assistenten. Ein Symptom startet sofort die Anleitung: Es bleibt bei zwei Taps bis zum ersten Schritt (Review 5.1). Erst wenn das Gespräch den Screen verlässt, entsteht ein Fall.
- **Etwas anderes:** Die eigene Beschreibung steht als Antwort im Gespräch. Danach „Hilfe holen“ oder „Reparatur-Assistent fragen“. Der Assistent bekommt die Beschreibung als Entwurf und schickt sie erst nach deiner Einwilligung.
- **Reparatur-Assistent im Gesprächsstil:** Antworten des Assistenten stehen als großer Text mit Absender „Reparatur-Assistent“, deine Fragen als Tintenblasen. Einwilligung, Vorschläge („Anleitung starten: …“, „Hilfe holen“) und Auswege bei Fehlern („Noch einmal senden“) stehen als Antwort-Buttons über dem Eingabefeld. Nachrichten im Chat haben keinen Stift: Eine geänderte Frage würde das Gespräch mit dem Assistenten verfälschen.
- **Schadenmeldung als Gespräch** (`app/fall/[id]/schaden.tsx`): zweiter Weg neben dem Formular, erreichbar über „Lieber Schritt für Schritt im Gespräch“ im Screen Kosten. Gleiche Regeln wie im Formular: Kostenvergleich, Vorschau „Das geht an …“, Rechtsgrundlage, Schadenfall erst durch den Tap auf „Schadenfall melden“, „Zahlungspflichtig buchen“, wenn etwas zu zahlen ist. Die gemeldete Schadenfall-Antwort hat keinen Stift, weil eine Meldung nicht zurückgenommen wird. Betrieb und Zeitfenster lassen sich mit dem Stift ändern. Ablehnung, Ersatzgerät und schon gebuchte Termine zeigt weiter das Formular.

## Ein Gespräch pro Fall (27.10.2026)

### Gefunden beim Durchklicken und behoben

- Zeitstrahl im Status: Ausstehendes stand zwischen Erledigtem. Nach einer Ablehnung standen noch Termin-Schritte als nächste Schritte da.
- Fallakte: „Reparatur abgeschlossen“ stand doppelt.
- „Was ist kaputt?“ fragte bei mehreren Geräten nicht nach dem Gerät, sondern nahm immer das erste.
- Onboarding ohne Schutz: Kopfzeile „Gerät bestätigen“ über „Füg dein erstes Gerät hinzu“.
- Wer eine Anleitung startete, zurückging und ein anderes Problem wählte, hatte zwei offene Fälle am selben Gerät.
- Nach der Einwilligung musste man die Frage an den Assistenten noch einmal absenden.
- Der Befund ließ dich wählen, was die Fachkraft entscheidet.
- Der Weg zur Schadenmeldung als Gespräch war hinter einem Link versteckt, Formular und Gespräch liefen nebeneinander her.
- Ein Fall in der Selbsthilfe ließ sich nicht umbenennen, wenn man ein anderes Problem wählte.

### Aufbau

- **`app/fall/[id]/index.tsx`** ist das Gespräch des Falls. Es entsteht vollständig aus dem gespeicherten Fall (Ereignisse, Ergebnisse, Anleitungen, Calls, Kostenvoranschlag, Termine, Chat). Darum übersteht es jeden Neustart und zeigt in App und Fallakte denselben Stand.
- **Was jetzt dran ist** steht unten als Antwort-Buttons, darunter immer das Eingabefeld für den Reparatur-Assistenten (außer im abgeschlossenen Fall). Ein Vorschlag des Assistenten steht über den anderen Antworten.
- **Vollbild-Schritte:** Kamera und Analyse, Anleitung, Warteraum und Videocall. Danach geht es zurück ins Gespräch. Ist keine Fachkraft frei, bietet das Gespräch Rückruf oder Vor-Ort-Diagnose an.
- **Formulare als Details:** Ergebnis, Kosten, Termin, Status und Fallakte bleiben als Ansichten. Sie funktionieren weiter für sich und führen zurück ins Gespräch.
- **Entfallen:** eigene Screens für Hilfe holen, Befund, Abschluss, Rückfrage, Meldungen, Reparatur-Assistent und Schaden-Gespräch. Alles davon steht jetzt im Gespräch.
- **Rückfrage** der Fehlererkennung ist ein Ereignis (`rueckfrage_gestellt`), die Antwort steht im Gespräch.
- **Befund:** Die Empfehlung der Fachkraft kommt aus `services.video.finding()`. „Passt, weiter“ speichert sie. „Stimmt nicht“ speichert deinen Widerspruch und bietet Hilfe neu an.
- **Stift:** an der ersten Antwort, solange der Fall noch keinen Fortschritt hat. Er führt zurück zu „Problem melden“ mit demselben Fall. An der Schadenmeldung nie.
- **Ein Fall ohne Inhalt** verschwindet, wenn man das Gespräch verlässt. Mit „Später weitermachen“ bleibt er.

## Demo für Fründ (02.11.2026)

### Anleitungen aus Herstellerunterlagen

- **Quelle je Schritt:** Jeder Schritt in `data/modelGuides.ts` trägt Seite und Originaltext (`src`) der Gebrauchsanweisung. Die App zeigt unter dem Schritt „Quelle: …, Seite …“.
- **Du-Form:** Die Gebrauchsanweisungen siezen, die App duzt. Den Schritttext übernehme ich in die Du-Form und ändere sonst nur das Nötigste: Sätze aus Tabellen werden zu ganzen Sätzen, Verweise wie „(siehe Kapitel …)“ entfallen, weil der verwiesene Abschnitt selbst als Schritt folgt. Kein neuer Inhalt.
- **Warnhinweise** bleiben vollständig und stehen als Achtung-Box vor dem Schritttext. Aus „rufen Sie den Miele Kundendienst“ wird „kontaktiere den Kundendienst“, weil in der Demo der Händler-Kundendienst übernimmt.
- **Auswahl der Anleitungen:** nur Störungen, die die Gebrauchsanweisung ausdrücklich dem Haushalt zuweist (Siebe, Ablaufpumpe, Zulaufsieb, Neustart). Alles, wofür die Anleitung den Kundendienst nennt (Wasserschutzsystem, Umwälzpumpe, Fehler F mit Defekt), führt zu „Hilfe holen“.
- **Symbole im Display:** Die Miele G 5833 SC zeigt Fehler über Kontrollanzeigen mit Symbolen, die im PDF-Text fehlen. Die Meldungen heißen darum „Kontrollanzeige Ablauf blinkt“ und „Kontrollanzeige Zulauf blinkt“.
- **Modellbezeichnung:** Die Miele-Anleitung trägt den Titel „G 5833 SC“, die Fundstelle bei Manualslib nennt „G 5843“. Beides findet die Suche.
- **Fotos:** Schritte zur Pumpe zeigen den Platzhalter „pumpe“, bis Markenfotos da sind.
- **Gerätekatalog** (`data/catalog.ts`): die drei Modelle und die WKB 130 der ersten Demo. Andere Waschmaschinen bekommen weiter die Anleitungen der Demo, andere Geschirrspüler keine.
- **Reparatur-Assistent:** Die App schickt die Ids der Anleitungen mit, die zum Gerät passen. Der Server lässt nur diese als Vorschlag durch.

### Werte für Fründ (bitte prüfen)

- **Preise (Beispielwerte):** unverändert 189 € für Original-Laugenpumpe, Anfahrt und Arbeit, Ersatzgerät 899 €. Die App zeigt „Teil und Arbeit“ als eine Summe. Eine Aufteilung nach Anfahrt, Arbeit und Teil kommt erst, wenn Fründ eigene Preise nennt.
- **Zeitfenster des Kundendiensts:** Mo 8–12 Uhr, Di 12–16 Uhr, Mi 8–12 Uhr, Fr 9–13 Uhr. Die Bürozeit von Herrn Fründ (Fr 9–17 Uhr) betrifft den Termin, nicht den Kundendienst.
- **Haushalt** in Bad Oeynhausen (Eidinghausen), Beispieladresse.

### Gerät anlegen und Händler-Kundendienst

- **Neuer Einstieg:** Onboarding und „Gerät hinzufügen“ beginnen mit dem Gerätekatalog (durchsuchbar), danach „Versicherung vorhanden?“. Typenschild-Scan und manuelle Eingabe bleiben als Weg für Geräte außerhalb des Katalogs. Die alten Screens „Schutz verknüpfen“ (Vertragsnummer oder Händler-Code) bleiben für Tests und Profil erreichbar, das Onboarding nutzt sie nicht mehr.
- **Police-Nr.:** Die Demo prüft sie nicht gegen einen Versicherer. Jede nicht leere Nummer wird gespeichert. Produkt beim Kranich-Vertrag wie bisher „Garantieverlängerung“, bei anderen Versicherern „Geräteversicherung“.
- **Versicherer-Liste:** erfundene Namen in `demoConfig.insurers`. Der Versicherer aus `demoConfig.insurer` steht immer oben und bleibt die Quelle für Whitelabel.
- **Händler-Liste:** Fründ (DEMO) und drei erfundene Händler. Nur Fründ hat einen eigenen Kundendienst.
- **Händler mit Kundendienst:** Ohne Versicherung und mit Händler Fründ übernimmt „Fründ Kundendienst (DEMO)“ Videocall, Befund und Termin. Fachkraft „Markus T.“ (erfunden). Der Kundendienst steht als einziger Betrieb zur Wahl, mit der Kennzeichnung „Kundendienst deines Händlers“, ohne Aussage zur Herstellerautorisierung.
- **Kosten ohne Versicherung:** wie bisher „Du zahlst“ mit „Zahlungspflichtig buchen“. Kein Schadenfall, kein Versicherer im Gespräch.
- **Händler unbekannt** oder ohne Kundendienst: Fachkraft und Betriebe aus der Konfiguration wie bisher.

### Umstellung auf mach’s (Entscheidung 15)

- **Farben** aus `tokens.json` des mach’s-Designsystems in `theme/palette.ts`. Weißer Grund, graue Flächen (`sunken`) für Karten, Gruppen und Felder. Blaumann-Blau für Primary Button, Links, Auswahl, Fortschritt und Fokus.
- **Schrift:** Systemschrift für Text, Schibsted Grotesk 700 nur für Wortmarke und große Überschriften (`display`, `h1`). Fließtext 17 pt wie in iOS.
- **Buttons** sind Kapseln. Secondary getönt (accent-soft, Text in accent, ohne Rahmen). Links in accent.
- **Achtung-Box** weiß mit Tinten-Rahmen statt dunklem Block.
- **Name** „mach’s“ in allen Texten, im App-Namen und im Reparatur-Assistenten. Repo, Slug und Ordner heißen weiter „ganz“.
- **Nachgezogen (03.11.2026, Entscheidung 22):** Wortmarke aus `machs-wortmarke-schwarz.svg` (über `react-native-svg`, Farbe aus dem Theme), App-Icon „m’“ aus `machs-app-icon-1024.png`, Slug und Scheme `machs`, Paketname `machs`, Speicherschlüssel `machs-app` (alte Daten aus der ganz-Version werden nicht übernommen). `design-system/` ist jetzt das mach’s-Designsystem mit Logos, das ganz-System liegt unter `reference/ganz-design-system/`.
- **Keine Rahmen und Linien** mehr an Suchpille, Listenzeilen, Auswahlkarten, Chips, Eingabefeldern, Aktionsleiste, Disclosure und FactList. Gefüllte graue Flächen (Radius 16) und Abstand ordnen. Rahmen bleiben nur bei der Achtung-Box, dem Fokus- und Fehlerring von Feldern und den Auswahl-Kreisen.
- **Bleibt bei „ganz“:** der Repo-Name `lennart-njs/ganz` und der Ordner. Ein Umbenennen auf GitHub ist Lennarts Entscheidung.
- **Tab-Icons** bleiben Lucide statt SF Symbols. Das Designsystem nennt SF Symbols für iOS; mit Expo Go ohne eigenes Build ist Lucide der einfachere Weg.

### Entschlacken (Entscheidung 20)

- **Anleitungsschritt:** Fortschritt, Schritttitel, Achtung (falls vorhanden), Text, Werkzeug als eine Zeile. Die Quelle steht nur im ersten Schritt („Aus der Gebrauchsanweisung Miele G 5833 SC“). Seite je Schritt und Quelle der Anleitung stehen in der Fallakte.
- **Keine Foto-Platzhalter:** `PhotoFrame` zeigt ohne Foto nichts. Gerätekarten sind graue Zeilen ohne Bild. Kommen echte Fotos, erscheinen sie wieder.
- **Hilfe holen:** ein Satz, wer was sieht und dass nichts aufgenommen wird. Datenliste, Protokoll, Screenshot-Einwilligung und Rechtsgrundlage unter „Details“. Die Bestätigung vor der Weitergabe bleibt der Tap auf „Videocall starten“.
- **Kosten:** eine große Zahl, darunter klein Ersatzgerät und Ersparnis. Doppelte Sätze („Befund aufgenommen“, „kein Schutz verknüpft“) entfallen.
- **Gespräch:** mach’s spricht ohne Absenderzeile, nur der Reparatur-Assistent trägt einen Namen. Nachrichten in 20 pt statt 22 pt.
- **Demo:** Hinweise, Demo-Knöpfe und „Beispielwerte“ sind standardmäßig aus (Entscheidung 21). Freigabe und Termin laufen per Timer weiter. Profil → 7-mal auf die Versionsnummer → „Hinweise“ schaltet sie an.

### Einklappbare Abschnitte (Entscheidung 23)

- **Baustein** `components/ds/Section.tsx`: Titel, eine Zeile Zusammenfassung, Pfeil. Der Kopf ist ein Button mit `expanded`-Zustand für VoiceOver und TalkBack. Der Zustand wird nicht gespeichert, jede Seite öffnet eingeklappt.
- **Gerätedetail:** Status, Schutz, Pflege, Anleitungen, Fälle, Kundendienst, Gerät. „Anleitungen“ listet jetzt die Probleme aus der Gebrauchsanweisung statt eines zweiten „Problem melden“. Die Aktionsleiste zeigt nur noch „Problem melden“. Bei Geräten mit Händler-Kundendienst entfällt die Hotline des Herstellers auch hier.
- **Profil:** Du, Schutz, Weitergaben und Einwilligungen, Freiwillig, Darstellung, Datenschutz.
- **Fälle:** „Offen“ und „Abgeschlossen“ mit Anzahl. **Fallakte:** Überblick, Weitergaben, Verlauf.
- **Nicht eingeklappt:** Startseite (Suchpille und Geräte), Gespräch eines Falls, Anleitung. Das sind keine Übersichten, sondern Arbeitsflächen.
## Anleitung im Gespräch (02.11.2026, Entscheidung 25)

- **Jeder Schritt ist eine Nachricht** von ganz mit Karte (Fortschritt, Bild, Warnhinweis vor dem Text, Werkzeug, Quelle). Ältere Schritte bleiben im Verlauf, kleiner und ohne Bild.
- **Antworten unten:** „Erledigt“ und „Geht nicht“, im letzten Schritt einer Störung „Läuft wieder“ und „Läuft noch nicht“, bei Pflege „Fertig“, bei „nicht selbst lösbar“ nur „Hilfe holen“.
- **Sicherheitsbestätigung** (Waterproof: „Der Wasserhahn ist zu“) ist selbst eine Antwort. Erst danach erscheinen die anderen. Ersetzt das Häkchen mit gesperrtem Button.
- **Schritt zurück** über den Stift an der letzten Antwort „Erledigt“ (B-05). Im Gespräch verlässt Zurück den Fall wie bei jedem anderen Schritt.
- **„Geht nicht“** öffnet wie bisher ein Sheet mit der Notiz für die Fachkraft.
- **Großansicht:** Die bisherige Vollbild-Anleitung bleibt unter „Details“ am aktuellen Schritt. Dort gilt weiter: Zurück geht einen Schritt zurück.
- **Erinnerung:** Steht nach dem Schritt schon ein Gespräch mit dem Assistenten, sagt ganz unten noch einmal, bei welchem Schritt du bist.

## Foto an den Reparatur-Assistenten (02.11.2026, Entscheidung 26)

- **Kamera im Eingabefeld** des Gesprächs. Sie öffnet `fall/[id]/foto-frage` (nur Aufnahme in der App, kein Galerie-Import). Danach hängt das Foto am Eingabefeld, bis du sendest oder es entfernst. Ohne eigenen Text geht „Mache ich das so richtig?“ mit.
- **Verkleinert auf 1.280 px** (längste Kante, JPEG, Qualität 0,7) mit `expo-image-manipulator`. Das base64-Bild liegt nur im Arbeitsspeicher, bis die Antwort da ist. Es kommt nicht in den gespeicherten Zustand. Der Server reicht es an Claude weiter und speichert es nicht.
- **Nur das Foto der letzten Nachricht** geht mit. Ältere Nachrichten mit Foto stehen mit „[Foto]“ im Verlauf. Der Server lehnt Fotos an älteren Nachrichten, andere Formate als JPEG und PNG und mehr als 5 Mio. base64-Zeichen ab.
- **Kontext:** Der aktuelle Schritt geht wörtlich mit (Titel, Text, Warnhinweis, Werkzeug), damit der Assistent das Foto daran messen kann.
- **Einschätzung:** Die Antwort hat ein Feld `assessment` (passt, passt nicht, unklar). Die App zeigt es klein unter der Antwort. Es ersetzt keine Bestätigung: „Erledigt“ tippst du selbst.
- **Einwilligung:** Neue Fassung `2026-11-1` nennt Fotos. Wer vorher eingewilligt hat, wird beim ersten Foto noch einmal gefragt. Ohne Foto reicht die alte Einwilligung.
- **Beispielfoto im Browser:** Ohne echtes Bild geht nur der Text mit. Die Blase zeigt „Beispielfoto“.
- **Foto in der Fallakte:** Das Foto hat den Zweck `frage`. Es zählt zu den Fotos des Falls, steht im Gespräch aber an der Nachricht und nicht als eigene Zeile.

## Erst Händler, dann Versicherung (02.11.2026, Entscheidung 31)

- **Reihenfolge beim Anlegen eines Geräts:** Gerät wählen oder Typenschild → „Wo hast du es gekauft?“ (Händlerliste, durchsuchbar, oder „Weiß ich nicht mehr“) → „Zusätzlich eine Versicherung?“ → bei Ja Versicherer und Police-Nr. Gilt im Onboarding und beim späteren Hinzufügen (`components/app/DeviceSetup.tsx`).
- **Händler bleibt am Gerät,** auch mit Versicherung (`Device.soldBy`). Den Kundendienst des Händlers (Fründ) gibt es weiter nur ohne Versicherung, wie in Entscheidung 16. Mit Versicherung prüft der Versicherer die Kosten.
- **Fall an den Händler** ist in beiden Fällen möglich, sobald Hilfe nötig ist.

## Katalog der Anleitungen (02.11.2026, Entscheidung 24)

- **Ein Eintrag je Gebrauchsanweisung** (`GuideCatalogEntry` in `model/types.ts`): Hersteller, Gerätetyp, Modelle, Materialnummern, Quelle, Freigabe (`entwurf`, `freigegeben`, `zurueckgezogen`) und die Anleitungen. Schritte tragen Seite und Originaltext (`src`), wie die Anleitungen aus Entscheidung 18.
- **Treffer** zuerst über die Materialnummer vom Typenschild, sonst über Hersteller, Gerätetyp und Modell (ohne Leerzeichen, Punkte, Bindestriche). Die Demo-Anleitungen gelten deshalb nur noch für die WKB 130, nicht mehr für jede Waschmaschine. Ein anderes Modell ohne Eintrag geht direkt zu Hilfe holen.
- **Demo-Eintrag** `miele-wkb130` ist eingebaut und kommt aus `data/guides.ts`. `npm run guides:check` prüft ihn weiter wörtlich gegen die Demo.
- **Server:** `server/guides/catalog/*.json` sind die freigegebenen Einträge, `server/guides/drafts/` die Entwürfe. `GET /api/guides?hersteller=…&kategorie=…&modell=…&material=…` gibt nur Freigegebenes zurück.
- **App:** Für Geräte ohne Anleitung fragt die App einmal pro Start beim Server nach und speichert den Eintrag (läuft dann auch offline). Ids importierter Anleitungen haben die Form `<eintrag>/<anleitung>`, damit sie über den Katalog eindeutig sind.
- **Reparatur-Assistent:** bekommt nur noch den Katalog des Geräts im Fall, als eigenen gecachten Block. Er kann nur Anleitungen dieses Geräts vorschlagen. Ohne Eintrag: „keine geprüfte Anleitung“, Vorschlag ist dann Hilfe.
- **Import:** `npm run guides:import -- <pdf> --id … --hersteller … --kategorie … --modell …` schickt das PDF an Claude (strukturierte Ausgabe, Aufwand hoch) und schreibt einen Entwurf. Danach prüft `pdftotext`, ob jeder Text wörtlich im PDF steht, und listet Abweichungen.
- **Freigabe:** `npm run guides:approve -- <id> --von "Name, Firma"` verschiebt den Entwurf in den Katalog. Mit Abweichungen nur mit `--trotzdem`. Später gehört das in ein Hersteller-Portal mit Anmeldung.
- **Noch offen:** Bilder zu den Schritten (Seitenausschnitte aus dem PDF), Sicherheitsbestätigungen wie „Der Wasserhahn ist zu“ für importierte Anleitungen (heute nur für die Demo in `lib/guideMeta.ts`), Lizenz und Updates je Herstellerversion.

## Fall an den Händler (02.11.2026, Entscheidungen 28 und 29)

- **Wann das Angebot kommt:** Sobald Hilfe nötig ist (Hilfe geholt, Anleitung ging nicht, Kostenvoranschlag, Freigabe offen oder abgelehnt) und das Gerät einen bekannten Händler hat. Ein Tap zeigt zuerst, was der Händler sieht, erst „Ja, senden“ gibt weiter. Grundlage ist die angefragte Leistung (lit. b), wie beim Versicherer.
- **Abgleich:** Die App sendet die Akte nach jeder Änderung am Fall neu und holt alle 15 Sekunden (und beim Zurückkehren in die App) die Antworten des Händlers. Ohne Netz versucht sie es beim nächsten Mal.
- **Texte zu Entscheidungen** sagen keine Kosten zu („Wir kümmern uns um die Reparatur“). Was es kostet, steht in der Notiz des Händlers.
- **Händler-Ereignisse** stehen im Gespräch mit dem Namen des Händlers als Absender und in der Fallakte im Zeitstrahl.
- Details: `docs/BACKEND.md`.

## Nach dem Test auf dem Handy (02.11.2026)

- **Gerät wählen:** Unter „Wähl dein Gerät.“ nur das Suchfeld. Vorschläge erscheinen erst beim Tippen und passen zur Eingabe (Hersteller, Modell, Gerätetyp). „Anderes Gerät eintragen“ steht dann unter den Treffern, „Typenschild fotografieren“ bleibt unten.
- **Offener Fall auf der Startseite** im mach’s-Look: helle Akzentfläche, Statuszeile mit Punkt, blauer Button „Weitermachen“ (statt schwarzer Block).
- **Plus unten rechts** statt der Zeile „Gerät hinzufügen“. Es öffnet ein kleines Menü: „Gerät hinzufügen“ und „Was ist kaputt?“.
- **Eingabefeld im Gespräch:** Senden ist ein Pfeil im Feld (wie in Messengern), kein eigener Button. Kamera links daneben. Der Platzhalter ist kurz, damit er ganz lesbar bleibt: „Frag den Assistenten“, während einer Anleitung „Frag zu Schritt 3“. Der Link „Frag den Assistenten zu diesem Schritt“ unter dem Schritt entfällt. Gleiches Feld in „Problem melden“.

## Händlerportal (02.11.2026, Entscheidung 30)

- **Look von machs.io** (`css/site.css`, Stand 02.11.2026): weißer Grund, Flächen in Kreide und Blaumann-Hellblau, schwebende dunkle Kapsel als Navigation, Pill-Buttons, Karten mit großem Radius. Farben hell und dunkel in `theme/machs.ts`, Wortmarke und Schrift von machs.io in `portal/public/`.
- **Keine Erklärtexte.** Bezeichnungen, Status-Chips und Aktionen müssen reichen. Gesiezt.
- **Seiten:** Anmelden, Fälle (Filter Alle, Neu, In Bearbeitung, Abgeschlossen), Fallakte mit Aktionen rechts (Fall annehmen, Rückfrage mit Antworten zum Antippen, Entscheidung, Betrieb und Zeitfenster, Stand).
- **Gewährleistung** als Chip: zwei Jahre ab Kaufdatum, nur zur Orientierung.
- **Sitzung:** httpOnly-Cookie, `Secure`, sobald das Portal über HTTPS läuft. Das Portal spricht nur über die API mit dem Backend.
- **Expo bündelt jede API-Route einzeln.** Darum liegt das Sitzungs-Geheimnis der Demo im Datenordner (`.data/portal-secret`, in echt `PORTAL_SESSION_SECRET`), und der Dateispeicher liest bei jedem Zugriff frisch.

## Animationen (02.11.2026)

Durchgesehen: alle Stellen, an denen sich in der App etwas bewegt. Grundsatz aus dem Designsystem: ruhig und kurz, keine Federn, keine Skalierung beim Drücken. Werte in `theme/tokens.ts` → `motion` (Einblenden 200 ms, Aufsteigen 260 ms, Aufklappen 220 ms).

- **Sheets** („Geht nicht“ u. a.): Vorher glitt der ganze Bildschirm samt Abdunklung von unten herein. Jetzt blendet die Abdunklung ein und nur das Blatt steigt auf.
- **Plus-Menü:** Offen liegt an der Stelle des Plus ein X über der Abdunklung, das Menü steigt darüber auf. Vorher blieb das Plus unter der Abdunklung liegen.
- **Einklappbare Abschnitte und „Details“:** klappen sanft auf und zu, der Pfeil dreht sich mit. Vorher sprang beides.
- **Hinweis** (z. B. „Bitte bestätige zuerst …“): blendet ruhig ein. Er verschwindet weiter ohne Übergang, das steuert der Bildschirm, der ihn zeigt.
- **„Bewegung reduzieren“** (iOS und Android) gilt jetzt überall: Bildschirmwechsel, Sheets, Menü, Abschnitte und das automatische Scrollen im Gespräch laufen dann ohne Animation. Vorher wurde die Einstellung nirgends beachtet.
- **Unverändert, weil passend:** Bildschirmwechsel des Systems, Farbwechsel beim Drücken, Ladekreise, Fortschritt der Fehlererkennung (eine Zeile alle 650 ms, wird angesagt), Haptik bei „Erledigt“ und beim Auslöser.

## Erklärtexte raus (02.11.2026)

Lennart: „Überall Erklärtexte entfernen. App und Webseite müssen selbsterklärend sein.“

- **Regel:** Sätze, die erklären, wie die Oberfläche funktioniert oder was als Nächstes passiert, sind raus. Es bleiben Fakten (Preise, Zeiten, Namen), Sicherheitshinweise, Fehlermeldungen und alles rechtlich Nötige (wer welche Daten sieht, Rechtsgrundlage, „Kosten prüft …“, Folgen einer Ablehnung).
- **Entfernt** u. a.: Willkommenstext, „Prüf die Angaben …“, „Das lässt sich meist selbst lösen …“, „Wähl unten, was passt.“, „Am schnellsten geht es im Videocall …“, Unterzeilen im Plus-Menü und bei „Versicherung vorhanden?“, Leerzustände in Geräte und Fälle, „Hier siehst du, wer welche Daten bekommen hat …“, der Hinweis zum Ökodesign-Recht im Gespräch (bleibt in „Details“ zum Termin) und „Im Prototyp gibt es einen Hersteller.“
- **Gekürzt** auf das Nötige: Kamera-Hilfe („Typenschild ganz in den Rahmen.“), Fehlermeldungen beim Foto, Abschlussmeldungen, Kamera-Erlaubnis.
- **Bleibt bewusst:** Einwilligungs- und Weitergabetexte (DSGVO), „Kosten prüft …“ (keine Kostenzusage), „Computerprogramm, kein Mensch“ beim Assistenten (Entscheidung 6), Folgen einer Ablehnung in „Details“ zu den Kosten.
- **B-37:** Der Leerzustand der Fälle verspricht nichts mehr zur Weitergabe, er hat jetzt nur noch die Überschrift.

## Portal komplett: Backend (03.11.2026, Entscheidungen 32 bis 37)

- **Team von Fründ** (alles erfunden außer dem Namen Fründ): Thomas B. (Leitung), Sandra K. und Lea W. (Sachbearbeitung), Markus T. und Jonas R. (Technik), Anna H. (nur lesen, inaktiv). Angemeldet ist Sandra K. Werte in `config/portal.demo.ts`.
- **Standorte, Telefonnummern, Servicezeiten** sind Platzhalter (Straßen „Beispielstraße“, Nummern mit 000). Städte echt (Entscheidung 21).
- **Gewährleistung** 24 Monate ab Kaufdatum, **Kulanz** bis 6 Monate danach und bis 150 €. **Fristen** erste Reaktion 4 Stunden, Antwort 24 Stunden. Alles einstellbar.
- **Ersparnis in der Auswertung:** vermiedener Einsatz 129 €, vermiedene Rücksendung 85 € (Annahme, einstellbar). „Selbst gelöst“ und „im Videocall gelöst“ zählen als vermiedener Einsatz.
- **Anonyme Zahlen:** Für die Auswertung zählt das Backend auch Fälle an Geräten von Fründ, die nicht gesendet wurden, ohne Namen, Adressen und Fallnummern. Ob und wie das in echt erlaubt ist, klärt der Auftragsverarbeitungsvertrag (offen).
- **Keine Signatur unter Nachrichten:** Im Gespräch steht der Absender ohnehin dabei („Sandra K. · Fründ“). Eine Signatur wäre doppelt.
- **Gewähltes Zeitfenster** bestätigt das Backend sofort als Termin beim Kundendienst. In echt prüft das der Kalender (Schnittstelle).

## Portal komplett: App (03.11.2026, Entscheidung 32)

- **Ein Eingabefeld, zwei Empfänger.** Ist der Fall an den Händler gesendet, steht über dem Feld ein Umschalter „Assistent | Fründ“. Ohne Wahl antwortet das Feld dem, der zuletzt geschrieben hat. Der Platzhalter sagt, wohin es geht („Nachricht an Fründ“).
- **Absender im Gespräch:** „Sandra K. · Fründ“, bei automatischen Nachrichten nur „Fründ“. Deine Nachrichten an den Händler tragen oben „An Fründ“.
- **Begrüßung sofort:** Die Antwort auf das Senden bringt die Begrüßung mit. Kontaktkarte mit Telefon, Servicezeiten und „Anrufen“.
- **Terminvorschlag** des Händlers: Zeitfenster als Buttons wie bei Rückfragen. **Ersatzteil:** „Das Ersatzteil ist bestellt: Laugenpumpe. Lieferung in 3 Werktagen.“
- **Fotos an den Händler** über dieselbe Kamera wie für den Assistenten. Sie gehen mit der nächsten Akte an den Händler, Fotos für den Assistenten weiter nicht.
- **Abruf alle 5 Sekunden** statt 15, damit es sich wie ein Chat anfühlt. Später Push.
- **Bewertung** nach der Reparatur geht mit in die Akte (für die Sterne in der Auswertung).
- **Text der Weitergabe** nennt jetzt auch „Deine Nachrichten an den Händler“ (Textversion 2026-11-3).

## Portal komplett: Oberfläche (03.11.2026, Entscheidungen 33 bis 37)

- **Startansicht „Offen“:** alle Fälle außer erledigten, das Dringendste oben (Frist zuerst, dann neueste). Beim Suchen zählen alle Warteschlangen.
- **Fristenampel:** grün, gelb im letzten Viertel oder der letzten Stunde, rot überfällig. Nur für „Neu“ (erste Reaktion) und „Wartet auf uns“ (Antwort).
- **Ungelesen:** blauer Punkt, wenn die Kundschaft nach dem letzten Öffnen geschrieben hat.
- **Gespräch in der Fallakte** zeigt die Antworten des Händlers so, wie die Kundschaft sie in der App liest (Du-Form). Die Bedienung des Portals bleibt gesiezt.
- **Gewährleistungsprüfung** rechnet ab dem Tag, an dem das Problem gemeldet wurde. Kulanz nur, wenn die Reparatur unter der Kulanzgrenze liegt. Nur ein Vorschlag, entschieden wird per Klick.
- **„Als Nächstes“:** ein Knopf, der den Fall weiterbringt (annehmen, entscheiden, antworten, Termin vorschlagen, abschließen).
- **Videocall** ist eine Bühne mit Zeitanzeige, Mikrofon, Kamera, Foto und Auflegen, ohne Verbindung (Entscheidung 35).
- **Auswertung:** „Ohne Einsatz gelöst“ = selbst gelöst oder im Videocall gelöst. „Vermiedene Rücksendung“ = Reparatur beim Kunden statt Einschicken. Werte in den Einstellungen unter Kundendienst.
- **Diagrammfarben** in `theme/machs.ts` (`chart1` bis `chart5`), geprüft auf Farbsehschwächen, mit Legende und Tabellenansicht.
- **Schnittstellen:** 33 Werkzeuge in neun Gruppen (Warenwirtschaft, Kalender, Kommunikation, Versand, Shop, CRM, Zahlung, Bewertungen, Automatisierung). Logos von simple-icons (CC0), einfarbig. Für Marken ohne Logo dort ein Kürzel. Marken gehören ihren Inhabern. „Verbinden“ ist in der Demo nur ein Schalter.
- **Zugriffsprotokoll:** Öffnet dieselbe Person die Akte innerhalb von zehn Minuten wieder (auch durch die Live-Aktualisierung), bleibt es ein Eintrag mit der letzten Zeit.
- **Team:** Die Anmeldung ist immer Sandra K. (Entscheidung 36). Teammitglieder lassen sich anlegen, zuweisen und deaktivieren, anmelden können sie sich in der Demo nicht.
