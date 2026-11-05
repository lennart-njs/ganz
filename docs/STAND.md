# Stand

Zuletzt aktualisiert: 05.11.2026 · Branch `claude/clever-bardeen-bpc32q` · Am Ende jedes Chats aktualisieren.

## Nächster Termin

**Freitag, 06.11.2026: Demo bei Fründ Elektrogeräte AG.** Publikum: erst einmal nur Fründ (Entscheidung 34). Ablauf siehe `docs/ABLAEUFE.md` → „Demo“, vom Demo-Startstand aus. Vorher am Telefon `docs/PITCH_CHECK.md` → „1. Händler-Weg“ proben.

- **Demo-Stand: 31e5786** (Portal A bis C, stimmige Beispielfälle, Härtung). Im Browser geprüft: Demo 6 von 6, gleiche Klickfolge wie 67d2fd8, Portal-Rundgang ohne Fehler.
- **Mit den Produktideen (D): 0239fc4** (Spitze des Branches, darauf nur noch Doku). Ebenfalls 6 von 6 und ohne Fehler. Neu sichtbar: Grundlage in der Prüfung, Kulanz mit Betrag, „Nachbesserung“, Fristen „ruht“, Herstelleranfrage.
- **Vor dem Start:** `git pull`, dann `rm -rf portal/.next` und `rm -f .data/ganz-backend.json`. Im Portal neu anmelden (alte Sitzungen gelten nicht mehr). Nach zehn falschen Passwörtern sperrt die Anmeldung zehn Minuten, `npx expo start` neu starten hebt das auf.

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
- **Nach dem Test am Telefon (Entscheidung 38):** Keine Hinweistexte mehr im Gespräch. Die Einwilligung in den Reparatur-Assistenten steht im Profil unter „Freiwillig“, wer was sieht unter „Datenschutz“. Beide Startstände haben die Einwilligung. Unter „Fall an Fründ senden“ steht „Fründ prüft den Fall“. Antworten unten klappen beim Hochscrollen zu einer Zeile ein. Aufklappbare Bereiche sind Kacheln mit grauem Rahmen und Plus und Minus.
- **Generalprobe** im Browser auf 3d3b3d2: Demo-Ablauf 6 von 6, gleiche Klickfolge wie 67d2fd8, keine Fehler in der Konsole. Auch Startstand bis Termin, Foto an Fründ, alter Speicherstand.
- **Händlerportal nach der Prüfung (Entscheidung 39):**
  - A: Fehler auf dem Demo-Weg (eigene Ereignisse nicht doppelt, Antworten eine pro Zeile, deutsche Fehler- und Ladeseiten, kein Doppelklick).
  - B: Portal und App rechnen gleich (Frist auf den Kauf nach Kalendermonaten, „Kaufdatum fehlt“, Abbruch aus der App, Kaufbeleg aus dem Chat).
  - C: Barrierefreiheit (Auswahllisten mit „Übernehmen“, 44 px, Kontraste, Diagrammfarben), Seitentitel, Vorschau-Kennzeichen, Liste nach Dringlichkeit. Beispielfälle wie echte Fälle. Härtung: Demo-Passwort nur im Dev-Server, Abmelden sperrt das Token, Rate-Limits, Sicherheits-Header, Secure-Cookie, Grenzen für Zahlen.
  - D: Grundlage wie in der App mit erlaubten Entscheidungen, Kulanz mit Betrag („Fründ übernimmt 180 €, du zahlst 64 €.“), Nachbesserung am selben Gerät, Fristen in Servicezeiten, Betrieb nach Postleitzahl mit belegten Zeitfenstern, Herstelleranfrage zum Kopieren (Vorschau).
- Alle Prüfungen grün (1537 Tests). Portal-Build grün.

## Offen

- Lennarts lokale Kopie (`~/Desktop/ganz`) mit `git pull` nachziehen. Baut das Portal nicht („Failed to open database … invalid digit found in string“), zuerst `rm -rf portal/.next`.
- Annahmen aus D für den Anwalt und für Lennart: Frist für die Nachbesserung (24 Monate, Rechtsfrage 52), Gerätedaten an den Hersteller, Feiertage in den Servicezeiten, Postleitzahlen der Partner.
- Bekannt: Die Chat-Grenze des Reparatur-Assistenten wirkt im Dev-Server von Expo nicht (die Route wird je Anfrage neu geladen). Die neuen Grenzen liegen an `globalThis`. Die Chat-Grenze bleibt bis nach der Demo, sonst greifen Tagesgrenzen, die nie galten.
- Offen für Lennart: Soll die Vorschau vor „Ja, senden“ zurück? Sie ist mit Entscheidung 38 raus, ebenso „Computerprogramm, kein Mensch“ an der ersten Antwort. Beides für den Anwalt in `docs/ANNAHMEN.md` → „Entscheidung 38“.
- Von welchem Stand läuft die Demo? Der übertragene Stand ist im Browser geprobt, am Telefon noch nicht. Zuerst am Telefon prüfen: einen Fall aus dem Demo-Startstand öffnen und den Händler-Weg einmal ganz gehen. Die Frist rechnet die App selbst, ohne Zeitzonen-Funktion des Telefons.
- Rückweg für Freitag: 67d2fd8, der letzte gute Stand vor der Übertragung (`docs/ABLAEUFE.md` → „Demo“).
- Schritt 4.2 (Kaufmonat beim Gerät) wartet auf Lennarts Antwort. Bis dahin zeigt das Portal für Geräte ohne Kaufdatum „Kaufdatum fehlt“ ohne Vorschlag.
- Nach der Demo: Schritte 5 bis 7 der Übertragung. Meldung an den Regulierer, Händler-Entscheidung als Freigabe, offene Befunde, Entscheidungen zusammenführen und umnummerieren.
- Angeboten, noch nicht beauftragt: Moderationskarte und Startskript für Freitag.
- Rechtlich offen: Darf die Auswertung anonyme Fälle zählen, die nicht weitergegeben wurden? Klären über den Auftragsverarbeitungsvertrag (`docs/ANNAHMEN.md`).
- Später: echtes Backend und Anbieter (Entscheidung 30), Push statt Abruf, echter Videocall.

## Als Nächstes

1. Demo am Freitag: Stand wählen (31e5786 oder mit D), am Telefon proben, Startskript, Moderationskarte.
2. Feedback von Fründ als Entscheidungen festhalten.
3. Übertragung ab Schritt 5 fortsetzen.
