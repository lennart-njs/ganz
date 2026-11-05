# Stand

Zuletzt aktualisiert: 04.11.2026 · Branch `claude/clever-bardeen-bpc32q` · Am Ende jedes Chats aktualisieren.

## Nächster Termin

**Freitag, 06.11.2026: Demo bei Fründ Elektrogeräte AG.** Publikum: erst einmal nur Fründ (Entscheidung 34). Ablauf siehe `docs/ABLAEUFE.md` → „Demo“, vom Demo-Startstand aus. Vorher am Telefon `docs/PITCH_CHECK.md` → „1. Händler-Weg“ proben.

## Fertig

- **App:** Gespräch statt Formulare, Anleitungen aus dem Katalog im Gespräch, Foto an den Reparatur-Assistenten, Gerät anlegen (erst Händler, dann Versicherung), Fall an den Händler senden. Danach Chat mit dem Händler (Umschalter „Assistent | Fründ“), Begrüßung mit Kontaktkarte, Terminvorschlag, Ersatzteil.
- **Backend (Demo):** Dateispeicher, Regeln beim Eingang, Bearbeitungsstand, Notizen, Zugriffsprotokoll, Einstellungen, 42 Beispielfälle und 168 anonyme Fälle, die bis zur Demo frisch bleiben.
- **Händlerportal:** Arbeitsliste, Fallakte als Gespräch, Gewährleistungsprüfung, Auswertung, Einstellungen mit 33 Schnittstellen, Live-Aktualisierung, Tastenkürzel. Der Videocall ist sichtbar, ohne Verbindung.
- **Website machs.io:** Register-Fassung live seit 03.11.2026 (Commit f739a6c). Die Navigation wird beim Scrollen zum „m’“. Die Erklärsätze sind raus.
- **Übertragung der ganz-Linie** (Lennart: „Jetzt übertragen.“): Merge 045fc93, dann die Schritte 1.1 bis 4.1. Einzelheiten in `docs/ANNAHMEN.md` → „Übertragung (04.11.2026)“.
  - Regeln für Fälle in `model/policies/`, auch für den Händler. Lint `ganz/kein-status-vergleich` ohne Ausnahmen.
  - „Fall an Fründ senden“ sendet erst mit „Ja, senden“. Wer was sieht, steht im Profil unter „Datenschutz“ (Entscheidung 38). Die Bestätigung speichert Umfang und Stempel. Die Akte enthält nur das.
  - Ein Foto bleibt beim gewählten Empfänger, Assistent oder Händler.
  - Gespeicherter Stand mit Prüfung beim Laden. Backend-Eingänge mit Größenlimit, Chat-Route mit Token und Grenzen.
  - Demo-Startstand mit Fründ (Profil → 7-mal Versionsnummer). Mit seinem Kaufdatum schlägt das Portal „Gewährleistung“ vor.
  - Regulierer als reine Regel. Beim Händler-Gerät kein „Du zahlst“ vor der Wahl, Selbstzahlen mit Preis.
  - CI und `scripts/ci-checks.sh` prüfen auch das Portal. Commits über `scripts/commit-if-green.sh`.
- **Generalprobe** im Browser auf 3d3b3d2: Demo-Ablauf 6 von 6, gleiche Klickfolge wie 67d2fd8, keine Fehler in der Konsole. Auch Startstand bis Termin, Foto an Fründ, alter Speicherstand.
- Alle Prüfungen grün (1452 Tests).

## Offen

- Lennarts lokale Kopie (`~/Desktop/ganz`) steht auf 588e6af. Mit `git pull` nachziehen, danach `npm install` und `cd portal && npm ci && npm run build`. Die Übertragung bringt `zod` und `fast-check` neu dazu. Ohne sie startet Metro nicht.
- Von welchem Stand läuft die Demo? Der übertragene Stand ist im Browser geprobt, am Telefon noch nicht. Zuerst am Telefon prüfen: einen Fall aus dem Demo-Startstand öffnen und den Händler-Weg einmal ganz gehen. Die Frist rechnet die App selbst, ohne Zeitzonen-Funktion des Telefons.
- Rückweg für Freitag: 67d2fd8, der letzte gute Stand vor der Übertragung (`docs/ABLAEUFE.md` → „Demo“).
- Schritt 4.2 (Kaufmonat beim Gerät) wartet auf Lennarts Antwort. Bis dahin schlägt das Portal für Geräte ohne Kaufdatum „Abgelaufen“ vor: „Anders entscheiden“.
- Nach der Demo: Schritte 5 bis 7 der Übertragung. Meldung an den Regulierer, Händler-Entscheidung als Freigabe, offene Befunde, Entscheidungen zusammenführen und umnummerieren.
- Angeboten, noch nicht beauftragt: Moderationskarte und Startskript für Freitag.
- Rechtlich offen: Darf die Auswertung anonyme Fälle zählen, die nicht weitergegeben wurden? Klären über den Auftragsverarbeitungsvertrag (`docs/ANNAHMEN.md`).
- Später: echtes Backend und Anbieter (Entscheidung 30), Push statt Abruf, echter Videocall.

## Als Nächstes

1. Demo am Freitag: Stand wählen, am Telefon proben, Startskript, Moderationskarte.
2. Feedback von Fründ als Entscheidungen festhalten.
3. Übertragung ab Schritt 5 fortsetzen.
