# ganz Design System

ganz ist ein Reparatur-Marktplatz für Haushaltsgeräte (Testphase, Deutschland). Haushalte melden einen Defekt per Text, Fehlercode und Foto. ganz stellt eine Diagnose und löst den Fall auf einem von drei Wegen: Anleitung, Fachkraft per Video oder Fachbetrieb vor Ort. Hersteller und Händler nutzen ganz, um die Reparaturpflicht nach §§ 479a ff. BGB (Richtlinie (EU) 2024/1799, ab 31.07.2026) zu erfüllen. Jeder Fall endet in einer **Fallakte**.

**Produkte / Oberflächen**
- Website: eine Landingpage, drei Zielgruppen (Zu Hause · Hersteller & Handel · Fachbetriebe) hinter einem Umschalter
- App „Zu Hause“ (iOS): Meldung → Rückfragen → Diagnose → Anleitung / Video / Fachbetrieb → Fallakte → Bewertung
- Pitchdeck (1920×1080)

**Quellen** (dieses Projekt): `ganz Richtung B.dc.html` (Landingpage, gewählte Richtung), `ganz App Zuhause.dc.html` (App-Prototyp), `ganz Pitchdeck.dc.html`, `uploads/Handover Landingpage ganz.docx`. `Landingpage ganz.dc.html` (Newsreader / Hanken Grotesk / IBM Plex Mono) ist die verworfene Richtung A und **nicht** Teil dieses Systems.

---

## Content fundamentals

- **Sprache:** Deutsch. Haushalte werden geduzt („Beschreib, was dein Gerät macht.“), Hersteller und Betriebe gesiezt („Sie bleiben verantwortlich.“). Nie mischen innerhalb einer Fläche.
- **Ton:** sachlich, konkret, ruhig. Kurze Hauptsätze. Keine Superlative, kein Marketingsprech, keine Ausrufezeichen.
- **Ehrlich über Grenzen:** Sicherheitsgrenzen werden direkt benannt („Am Kältemittelkreislauf bitte nicht selbst arbeiten.“, „Wann wir dir keine Anleitung geben.“).
- **Konkret statt abstrakt:** echte Geräte, echte Fehlerbilder, echte Zeiten („Spülmaschine pumpt nicht ab, unten steht Wasser.“, „Do, 10–12 Uhr“).
- **Überschriften** sind ganze Aussagen mit Punkt („Reparatur, die mit einem Foto beginnt.“). Im Deck: Aussage des Teams in der ersten Person Plural („Wir starten mit …“).
- **Schreibweise:** Satzbau-Großschreibung, keine VERSALIEN, kein Letterspacing auf Labels. Typografische Anführungszeichen „…“ und Apostroph ’. Daten deutsch: „Mo, 13.10. · 19:42“. Mittelpunkt · als Trenner.
- **Offene Werte** stehen in eckigen Versalien-Platzhaltern: [PREIS], [BETRIEB], [MODELLNUMMER].
- **Kein Emoji.** Einzige Glyphe ist ★ in der Bewertung.
- Das Wort „ganz“ immer klein, auch am Satzanfang.

## Visual foundations

- **Farbe:** fast monochrom. Warmer Papiergrund Stone 100 `#F5F4F0`, Tinte `#16181A` für Text und die einzige Primärfarbe. Akzentfarben gibt es nicht; Farbe kommt aus den Fotos. Rot `#C8372D` nur für „Auflegen“ im Videocall.
- **Typo:** eine Familie, Schibsted Grotesk. Überschriften 500 (Web/App) bzw. 600 (Deck) mit negativem Tracking (-0.02 bis -0.045em), Fließtext 400, UI-Labels 500/600. Labels sind klein (13–15px) und grau, nie Versalien, nie Mono.
- **Hintergründe:** Seiten auf Stone 100, App-Canvas Stone 150. Dunkle Blöcke (Ink 900) für Sicherheit und Abschluss. Keine Verläufe außer Foto-Scrims (unten oder links, Ink mit 35–92 % Deckkraft), keine Muster oder Texturen.
- **Bilder:** dokumentarische Fotos echter Situationen: Küche, Hände am Gerät, Monteurin an der Tür, Werkstatt, Lager. Warmes Tageslicht, natürliche Farben, leichte Unschärfe im Hintergrund. Vollflächig im Hero mit Text darauf, sonst randlos oben in Karten (16:10) oder als Hälfte einer Folie.
- **Karten:** weiß, Radius 14px, kein Rahmen, kein Schatten. Schatten (`--shadow-float`) nur, wenn eine Karte über einem Foto oder einer Farbfläche schwebt. Keine farbigen Seitenränder, keine Icons in Kreisen.
- **Linien:** Haarlinien 1px für Listen und Tabellen (`--border-subtle` in Karten, `--border-default` auf der Seite). Im Deck beginnt eine Liste mit einer 2px-Tintenlinie, danach 1px Stone 400.
- **Radien:** 8px für Buttons, Inputs, Chips. 14px für Karten, Fotos, Blöcke. 4px innerer Zipfel bei Chat-Blasen. Pill nur für das Chat-Eingabefeld.
- **Layout:** max. 1400px, 24px Rand, 104px zwischen Sektionen. Raster mit `auto-fit minmax`. App: 20px Seitenrand, Kopfzeile mit Zurück-Chevron, unten fixierte Aktionsleiste mit einer Primäraktion in voller Breite.
- **Deck:** 1920×1080, 120px Seitenrand, Titel 64px/600 oben links, Inhalt am unteren Rand (`margin-top:auto`), Fußzeile 24px mit Quelle links und Seitenzahl rechts. Hell (Stone 100) und dunkel (Ink 900) wechseln sich ab; nie mehr als diese zwei Gründe.
- **Bewegung:** zurückhaltend. Inhalt blendet beim Zielgruppenwechsel 200 ms aus und ein (`ease`). Keine Bounces, keine Parallax-Effekte.
- **Hover:** Primärbutton Ink 900 → Ink 700. Sekundär: Rahmen wird Tinte. Links: Ink 700. **Press:** keine Skalierung. **Disabled:** 40 % Deckkraft, Hinweis per Toast beim Tippen.
- **Fokus:** 2px Tinten-Outline, 2px Abstand.
- **Transparenz/Blur:** nur Scrims auf Fotos und Untertitel-Kästen im Videocall (Ink 78 %). Kein Glas-Effekt.
- **Trefferflächen:** min. 44px, Primärbuttons 50–52px.

## Iconography

Es gibt kein Icon-Set. ganz arbeitet mit Wörtern statt Symbolen. Einzige Zeichen, als kleine Inline-SVG (2–2.2px Strich, runde Enden, Ink oder Ink 500): Zurück-Chevron, Weiter-Chevron, Häkchen in der Checkbox, Senden-Pfeil, Auflegen-Hörer. Bewertung mit dem Unicode-Stern ★. Kein Emoji. Wird ein größeres Icon-Set nötig, Lucide (gleiche Strichstärke) verwenden und das hier vermerken.

**Vermerk App (Phase 2, 26.10.2026):** Die App nutzt ein kleines Lucide-Set (`lucide-react-native`, Strich 2): Zurück, Weiter, Aufklappen, Schließen, Häkchen, Warndreieck (nur mit dem Wort „Achtung“), Tab-Leiste (Haus, Ordner, Person), Kamera, Mikrofon an/aus, Kamera an/aus, Auflegen, Suche, Plus. Jedes Icon steht neben einem Wort oder hat ein Label am Bedienteil. Liste: `components/ds/Icon.tsx`.

**Logo:** Es gibt keine Logodatei. Die Wortmarke ist „ganz“ in Schibsted Grotesk 600, Tracking -0.03em (Komponente `Wordmark`).

---

## Index

- `styles.css` – Einstieg, importiert alle Tokens
- `tokens/` – `fonts.css`, `colors.css`, `typography.css`, `spacing.css` (inkl. Radien), `effects.css` (Schatten, Scrims, Motion)
- `guidelines/` – Foundation-Karten (Farben, Typo, Abstände, Radien, Elevation, Bildsprache, Wortmarke, Tonalität)
- `components/`
  - `core/` Button, Wordmark
  - `forms/` TextField, Checkbox, ChoiceChip, SegmentedControl
  - `content/` Card (+ CardTitle, CardText), FactList, Timeline, NavRow
  - `app/` AppHeader (+ BottomBar), ChatBubble, StepProgress, Toast, StarRating
- `ui_kits/web/` – Landingpage mit Zielgruppen-Umschalter
- `ui_kits/app/` – App „Zu Hause“, 6 Screens zum Durchklicken
- `slides/` – Folientypen: Title, BigNumber, RuledList, SplitImage, Table, Closing
- `assets/web/`, `assets/app/` – Fotos (KI-generierte Platzhalter, vor Veröffentlichung ersetzen)
- `SKILL.md` – Nutzung als Agent Skill
- `ganz-loader.js` – stellt `window.GANZ` bereit (kompiliertes Bundle oder, falls nicht vorhanden, die Komponenten-Quellen im Browser übersetzt); Karten und UI-Kits warten auf `ganzReady`

### Intentional additions
- `Wordmark` – es gibt kein Logo; die Wortmarke soll überall gleich gesetzt werden.
