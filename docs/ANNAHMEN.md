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
