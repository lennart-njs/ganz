# CLAUDE.md – ganz Haushalts-App

## Lies zuerst
1. `docs/ENTSCHEIDUNGEN.md` – Antworten von Lennart. Sie gehen allem anderen vor.
2. `docs/BUILD_PLAN.md` – Stack, Screens, Datenmodell, Reihenfolge mit Akzeptanzkriterien.
3. `docs/REVIEW.md` – Befunde (B-xx) und Soll-Flow. Jeder P0- und P1-Befund muss behoben sein.
4. `docs/AUFTRAG.md` – ursprünglicher Auftrag (Abschnitt 7 = Phase 2).
5. `design-system/README.md` – verbindlich. Bei Widerspruch gilt das Designsystem, außer bei den Punkten in REVIEW Abschnitt 8.

Quelle für Inhalte: `reference/demo-v1.0/Main.dc.html`. Nur als Spezifikation lesen, nicht als Code kopieren.

## Feste Regeln
- Name „ganz“, immer klein. Die Fotodiagnose heißt „Intelligente Fehlererkennung“. Nie „KI“ oder „AI“, keine Funken-Icons.
- Du-Form, kurze Sätze, ruhiger Ton. Keine Ausrufezeichen, keine Emojis.
- Anleitungsinhalte aus `guides()` wörtlich übernehmen. Nicht umformulieren.
- Alle Texte in `i18n/de.ts`. Alle fiktiven Namen und Preise in `config/demo.config.ts`.
- Keine Hex-Werte außerhalb von `theme/`. Dark Mode, Dynamic Type bis 200 %, Screenreader-Labels, Trefferflächen ab 44 pt.
- Keine Links zu Portalen, kein Chat.
- Keine Datenweitergabe ohne Bestätigung. Kein Schadenfall ohne aktiven Tap. Keine Kostenzusage vor der Freigabe.

## Arbeitsweise
- Schritte aus BUILD_PLAN Abschnitt 5 der Reihe nach. Ein Commit pro Schritt, kleine Commits.
- Kein Push, kein PR ohne Anweisung.
- Bei Unklarheit: vernünftige Annahme treffen, in `docs/ANNAHMEN.md` notieren, weitermachen. Nur bei schwer umkehrbaren Entscheidungen fragen.
- Nach jedem Schritt: Tests und Lint laufen lassen, kurz berichten, was fertig ist.
