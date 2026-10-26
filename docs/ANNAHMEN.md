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
