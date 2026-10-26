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
