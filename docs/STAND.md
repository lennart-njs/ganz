# Stand

Zuletzt aktualisiert: 03.11.2026 · Branch `claude/clever-bardeen-bpc32q` · Am Ende jedes Chats aktualisieren.

## Nächster Termin

**Freitag, 06.11.2026: Demo bei Fründ Elektrogeräte AG.** Publikum: erst einmal nur Fründ (Entscheidung 34). Ablauf siehe `docs/ABLAEUFE.md` → „Demo“.

## Fertig

- **App:** Gespräch statt Formulare, Anleitungen aus dem Katalog im Gespräch, Foto an den Reparatur-Assistenten, Gerät anlegen (erst Händler, dann Versicherung), Fall an den Händler senden. Danach Chat mit dem Händler (Umschalter „Assistent | Fründ“), Begrüßung mit Kontaktkarte, Terminvorschlag, Ersatzteil.
- **Backend (Demo):** Dateispeicher, Regeln beim Eingang, Bearbeitungsstand, Notizen, Zugriffsprotokoll, Einstellungen, 42 Beispielfälle und 168 anonyme Fälle, die bis zur Demo frisch bleiben.
- **Händlerportal:** Arbeitsliste, Fallakte als Gespräch, Gewährleistungsprüfung, Auswertung, Einstellungen mit 33 Schnittstellen, Live-Aktualisierung, Tastenkürzel. Der Videocall ist sichtbar, ohne Verbindung.
- **Website machs.io:** Register-Fassung live seit 03.11.2026 (Commit f739a6c). Die Navigation wird beim Scrollen zum „m’“. Die Erklärsätze sind raus.
- Alle Prüfungen grün (379 Tests).

## Offen

- Lennarts lokale Kopie (`~/Desktop/ganz`) steht auf 588e6af. Mit `git pull` nachziehen, danach `npm install`. Die Übertragung der ganz-Linie bringt `zod` und `fast-check` neu dazu. Ohne sie startet Metro nicht.
- Übertragung der ganz-Linie (Lennart: „Jetzt übertragen.“): erst der Merge, danach kleine Schritte. Annahmen in `docs/ANNAHMEN.md` → „Übertragung“.
- Angeboten, noch nicht beauftragt: Moderationskarte und Startskript für Freitag.
- Rechtlich offen: Darf die Auswertung anonyme Fälle zählen, die nicht weitergegeben wurden? Klären über den Auftragsverarbeitungsvertrag (`docs/ANNAHMEN.md`).
- Später: echtes Backend und Anbieter (Entscheidung 30), Push statt Abruf, echter Videocall.

## Als Nächstes

1. Demo am Freitag vorbereiten: Ablauf proben, Startskript, Moderationskarte.
2. Feedback von Fründ als Entscheidungen festhalten.
