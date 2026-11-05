# mach’s Designsystem

Quelle: Artifact „mach’s“ (Design System, Stand 29.10.2026). Diese Kopie ist verbindlich für die App (Entscheidung 15). Tokens: `tokens.json`, umgesetzt in `theme/`. Logos: `assets/logos/`. Das frühere ganz-Designsystem liegt unter `reference/ganz-design-system/` und gilt nicht mehr.

mach’s (machs.io) hilft Haushalten bei kaputten Hausgeräten: Problem melden, selbst lösen mit der Herstelleranleitung, sonst Hilfe holen. Der Look ist eine cleane, native App: weißer Grund, viel Luft, große Fotos, ruhige graue Flächen statt Linien und genau eine Signalfarbe, Blaumann-Blau. Die Bezahler (Versicherer, Händler) erscheinen nur als Kostenträger. Die sichtbare Marke ist mach’s.

Diese Regeln gelten für die Haushalts-App (Expo, React Native). Website und Mail-Signatur stehen im Abschnitt **Website und E-Mail**. Die Web-Komponenten hier sind die Referenz. Die App baut sie mit denselben Namen und Props nach.

## Sprache

- Sprich die Nutzerin mit **du** an. Kurze, klare Sätze. Ruhiger Ton.
- Keine Ausrufezeichen-Euphorie, keine Emojis.
- Schreib **„mach’s“** immer klein, auch am Satzanfang, mit typografischem Apostroph (’). Die Domain schreibst du **machs.io**, ohne Apostroph.
- Das Wort **„KI“** und **„AI“** kommt nicht vor. Die Fotodiagnose heißt immer **„Intelligente Fehlererkennung“**.
- Buttons sind Verb + Objekt oder ein klarer Zustand: „Anleitung starten“, „Erledigt“, „Geht nicht“, „Läuft wieder“, „Läuft noch nicht“, „Videocall starten“, „Schadenfall melden“, „Termin anfragen“. Nie nur „Ja“, „Nein“ oder „Weiter“.
- Begriffe stehen im Abschnitt **Glossar**. Nimm immer dasselbe Wort für dieselbe Sache.

Beispiele aus der App:

> Die Kosten prüft Kranich nach dem Befund. Deine Selbstbeteiligung laut Vertrag: 0 €.

> Jonas K. (Hausgeräte Brandt) sieht: Gerät, Fotos und deine erledigten Schritte.

> Der Betrieb bekommt die Original-Laugenpumpe innerhalb von 15 Arbeitstagen. So verlangt es das EU-Ökodesign-Recht.

### Texte mit rechtlicher Wirkung

- **Keine Kostenzusage vor der Freigabe.** „Die Kosten prüft …“, nicht „… übernimmt die Kosten“. Bis zur Freigabe heißt es „vorbehaltlich Freigabe“.
- **Keine Weitergabe ohne Bestätigung.** Vor jedem Videocall, jeder Schadenmeldung und jeder Buchung nennt die App Empfänger und Daten. Die Nutzerin bestätigt mit einem eigenen Button.
- **Ein Schadenfall entsteht nur durch „Schadenfall melden“.** Nie „wurde automatisch angelegt“.
- Wird Geld fällig, heißt der Button „Zahlungspflichtig buchen“.
- Sicherheitshinweise aus der Herstelleranleitung bleiben wörtlich. Sie stehen in `InfoBox` mit `tone="achtung"` **vor** dem Schritttext.

## Farbe

Eine Signalfarbe, sonst Weiß. Das Blau kommt vom Arbeitsanzug, aber die App sieht nicht nach Werkstatt aus.

- `accent` (Blaumann-Blau) zeigt, wo es weitergeht und was gewählt ist: Primary Button, Text von Secondary Button und Links, „‹ Zurück“, gewählte Chips, Häkchen, erledigte Schritte, aktiver Tab, Fokusring. Text darauf in `on-accent`.
- `accent` ist kein Schmuck. Keine blauen Überschriften, keine blauen Flächen ohne Aufgabe, keine Verläufe. Auf einem Screen ist höchstens ein großes blaues Element: der Primary Button.
- `accent-soft` nur als Fläche des Secondary Buttons.
- Seitengrund ist `bg`. Text in `ink` (Titel), `body` (Fließtext) und `muted` (Meta).
- `sunken` ist die Fläche, die ordnet: Groups, Beleg, offener Fall, Eingabefelder, leere Chips, Suchpille, Info-Box, Foto-Platzhalter.
- Keine dunklen Flächen. `inv` und `on-inv` sind reserviert und werden in der App nicht genutzt. Toast und offener Fall sind hell.
- Keine Haarlinien. `line` und `line-2` werden nicht mehr für Trenner genutzt.
- `border-control` nur für den Ring leerer Auswahl-Kreise. Eingabefelder sind gefüllt, ohne Linie.
- `placeholder` nur für Platzhalter in leeren Feldern.
- `danger` nur für Fehler in Feldern, immer mit Wort und Icon.
- `page` nur außerhalb der App (Demo-Rahmen, Pitch).
- Information steht nie nur in der Farbe. Gewählt heißt immer auch Häkchen; Status heißt immer auch Wort.
- Dark Mode folgt dem System. Jede Fläche nutzt Tokens, nie feste Hex-Werte.

## Schrift

Zwei Familien mit klarer Aufgabe.

- **Display** (`font-display`, Schibsted Grotesk 700, eng gesetzt): nur für die Wortmarke, die eine große Überschrift pro Screen (`large-title`) und die eine wichtige Zahl (`number`). Die Datei liegt unter `fonts/schibsted-grotesk-latin-700-normal.woff2` (SIL Open Font License, siehe `fonts/OFL.txt`). Im Web immer vom eigenen Server laden, nie von Google Fonts.
- **Text** (`font-text`, Systemschrift: SF Pro auf iOS, Roboto auf Android): alles andere. So fühlt sich die App an wie das Telefon selbst.
- Hierarchie über Größe und Gewicht, nicht über Farbe: `large-title` 34/700, `title` 22/700, `headline` 17/600, `body` 17/400, `subhead` 15, `footnote` 13. Kein Medium-Einheitsgrau.
- `body` ist 17 px wie in iOS, nicht 16.
- Große Überschriften sind kurze Aussagen mit Punkt: „Pumpt nicht ab.“, „Wer zahlt was.“ Keine Fragen als Überschrift, keine Doppelpunkte.
- Zahlen (Preise, Uhrzeiten, Nummern) immer mit `font-variant-numeric: tabular-nums`.
- Alles skaliert mit der Systemschrift bis 200 %. Kein Text darf abgeschnitten werden.

## Raum, Radien, Layout

- Seitenrand `space-5`. Abstand zwischen Abschnitten `space-8`. Innerhalb eines Abschnitts `space-2` bis `space-4`. Der Unterschied ist gewollt groß.
- Alles linksbündig. Zentriert ist nur der kleine Titel in der Kopfzeile und der Text in Buttons.
- Radien mit Aufgabe: `radius-pill` für alles, was man drückt (Buttons, Chips, Suchpille). `radius-group` für gefüllte Flächen. `radius-photo` für Fotos.
- Zusammengehöriges steht in einer `Group` (graue Fläche, `radius-group`). In einer Group trennt nur der Abstand, nie eine Linie.
- Gefüllte Flächen statt Rahmen und Linien. Kein Element hat einen Rahmen oder eine Trennlinie, außer die Achtung-Box.
- Jeder Screen mit einer Hauptaktion hat unten die `ActionBar`: der Primary Button über volle Breite, darunter optional ein leiser Link.
- Kopfzeile wie in iOS (`AppHeader`): „‹ Befund“ links, X rechts, großer Titel darunter.
- Drei Tabs: Geräte, Fälle, Profil (`TabBar`). Ein Fall läuft als modaler Stack ohne Tab-Leiste.
- Schatten nur beim gewählten Segment, beim Toast und bei Sheets.

## So stellen wir uns dar: der Beleg

Jeder Screen sieht aus wie ein guter Beleg: wenige Posten, klar gerechnet, unten steht, was für dich bleibt.

- **Graue Flächen ordnen, Abstand trennt.** Keine Haarlinien, keine Rahmen, keine Kästen in Kästen. Was zusammengehört, steht in einer `Group`.
- **Eine Antwort, groß.** Jeder Screen beantwortet eine Frage, und die Antwort ist das größte Element: „Du zahlst 0 €“, das Foto des Schritts, der Termin.
- **Gerechnet, nicht behauptet.** Geld steht immer als `Receipt`: Posten, was der Kostenträger übernimmt (Minus in `accent`, „nach Freigabe“), und „Du zahlst“. Vergleiche wie „Ein neues Gerät würde 899 € kosten“ stehen klein darunter.
- **Jede Angabe nur einmal.** Kein Betrag, kein Name doppelt auf einem Screen.
- **Nebenwege leise.** Ein Primary Button pro Screen. Alles andere ist ein Link in `accent` oder eine Zeile in einer Group, nie ein zweiter loser Absatz.
- **Hell.** Keine schwarzen Karten, keine dunklen Toasts. Das einzige kräftige Element ist der blaue Button.

## Gestaltung, die nicht generiert aussieht

- **Ein Ding ist groß.** Jeder Screen hat genau ein dominantes Element: das Foto, die Zahl oder die große Überschrift. Alles andere ist deutlich kleiner.
- **Asymmetrie.** Keine zwei gleich großen Spalten, keine Raster aus drei gleichen Kacheln, keine gleich starken Buttons nebeneinander. Vergleiche stehen als Beleg plus kleiner Satz darunter.
- **Echter Inhalt statt Etiketten.** „Hausgeräte Brandt kommt Mo, 8 bis 12 Uhr“ statt „Termin: bestätigt“. Keine Füllwörter wie „nahtlos“, „smart“, „mühelos“.
- **Keine Deko-Icons.** Keine Icons in farbigen Kreisen oder Kacheln, keine Icon-Zeile über jedem Abschnitt. Icons nur, wo sie bedienen: Zurück, Schließen, Suche, Tabs, Häkchen.
- **Keine Effekte.** Keine Verläufe, kein Glas, kein Glühen, keine farbigen Schatten, keine Karten mit farbigem Rand links.
- **Native Muster.** Was iOS schon hat (Liste mit Häkchen, Sheet, großer Titel, Zurück mit Name), wird nicht neu erfunden.
- **Aufklappen.** Was sich auf- und zuklappen lässt (`Section`, `Disclosure`), ist eine Kachel mit grauem Rahmen (`border-default`, `radius-group`). Rechts im Kopf steht Plus, solange sie zu ist, Minus, wenn sie offen ist. Nie der Pfeil „>“: Der steht für Weitergehen. Der Inhalt öffnet sich in derselben Kachel (Entscheidung 38).
- **Antworten unten im Gespräch** klappen beim Hochscrollen zu einer Zeile ein und kommen beim Herunterscrollen wieder. Mit Screenreader bleiben sie offen (Entscheidung 38).

Die Beispiel-Screens unter Komponenten (Startseite, Anleitungsschritt, Kosten) zeigen diese Regeln zusammen.

## Clean, nicht Werkstatt

mach’s fühlt sich an wie eine gute iPhone-App, nicht wie ein Baumarkt.

- Keine Texturen, kein Metall, kein Holz, keine Stempel, kein Klebeband, keine Durchschlag-Optik.
- Keine Schablonen- oder Typenschild-Schriften. Nummern wie M.-Nr. oder Fall-Nummer stehen in `subhead` oder `footnote`, mit Ziffern in fester Breite (`font-variant-numeric: tabular-nums`).
- Keine Werkzeug-Icons als Deko (Schraubenschlüssel, Hammer, Zahnrad). Ein Werkzeug darf nur erscheinen, wenn die Anleitung es verlangt.
- Das Handwerk zeigt sich im Inhalt: echte Fotos, genaue Anleitungsschritte, Namen der Fachkräfte. Nie in der Dekoration.
- Native Muster vor eigenen Erfindungen: gruppierte Listen, Sheets, große Titel, Systemgesten.

## Fotos

- Große Fotos mit `radius-photo`, volle Breite im Seitenrand. Im Anleitungsschritt ist das Foto das größte Element.
- Echte Markenfotos kommen nach `assets/photos/` (Display, Laugenpumpe, Typenschild, Fachkraft im Videocall, eigenes Bild der Pumpe, Werkstatt, Abschluss, Monteurin). Bis dahin: `PhotoFrame` mit Beschriftung.
- Keine generierten Fotos in der App.
- Fotos als Nachweis zeigen Zeitstempel und „in der App aufgenommen“. Kein Import aus der Galerie.
- Bildsprache: Geräte in echten, hellen Wohnungen, Hände bei der Arbeit, Fachkräfte mit Gesicht. Hell und ruhig, keine dunkle Werkstatt-Stimmung, keine Stockfoto-Posen.

## Ikonografie

- In der App SF Symbols (iOS) und Material Symbols (Android), damit Icons nativ wirken. Die Komponente `Icon` ist nur die Web-Referenz im gleichen Strichstil.
- Icons stehen neben Text. Ein Icon allein braucht ein Label.
- Keine Funken, keine Zauberstäbe, keine Emojis, keine Werkzeug-Deko.
- Icons sind `ink` oder `muted`. Nur der aktive Tab ist `accent`.
- Lucide-Set der Web-Referenz (`components/ds/Icon.tsx`): Pfeile für Zurück, Weiter und Aufklappen im Gespräch, Plus und Minus für Kacheln, Schließen, Häkchen, Warnung, Tabs, Kamera, Mikrofon, Video, Auflegen, Suche, Stift, Senden.
- **Logo:** Die Wortmarke „mach’s“ liegt als Pfade unter **Assets › Logos** (Schwarz, Weiß, Blau). Nutze immer diese Dateien, setz die Wortmarke nicht neu aus der Schrift.
- **Zeichen und App-Icon:** „m’“, das „m“ in `ink`, der Apostroph in `accent`. Das App-Icon steht auf weißem Grund. Der Apostroph ist das Markenzeichen und das einzige farbige Teil.
- Kein weißes „m“ auf blauem Quadrat: zu nah an bestehenden Marken.

## Bedienung und Barrierefreiheit

- Jede Trefferfläche ist mindestens `touch-min` (44 pt).
- Text erreicht mindestens 4,5 : 1, Rahmen und Icons mindestens 3 : 1, in beiden Themes.
- Fokusring: `focus-width` in `accent`, 2 px Abstand.
- Jedes Bedienelement hat ein Label und eine Rolle für VoiceOver und TalkBack. Auswahlkarten und Chips sind Radios.
- Fortschritt und Laden werden angesagt, nicht nur gezeigt.
- Bewegung nur kurz (unter 200 ms) und aus bei „Bewegung reduzieren“.
- Haptik beim Auslöser der Kamera und bei „Erledigt“.

## Beispielwerte

Fiktive Namen und Preise bleiben fiktiv und stehen in einer Konfigurationsdatei: Kranich Versicherung, Hausgeräte Brandt, Reparaturwerk Neukölln, Jonas K., 189 € und 899 €. Im Demo-Modus zeigt `Receipt` „Beispielwerte“.
