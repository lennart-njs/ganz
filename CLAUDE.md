# CLAUDE.md – mach’s (machs.io), Repo „ganz“

## Neu im Chat? So fängst du an
1. `docs/STAND.md` – was fertig ist, was offen ist, was als Nächstes kommt. Am Ende jedes Chats aktualisieren.
2. `docs/ENTSCHEIDUNGEN.md` – Antworten von Lennart. Sie gehen allem anderen vor.
3. `docs/ABLAEUFE.md` – Starten, Prüfen, Demo, Website auf Hetzner, Git.
4. Bei Bedarf: `docs/ANNAHMEN.md`, `docs/BACKEND.md`, `docs/BUILD_PLAN.md`, `docs/REVIEW.md`, `docs/AUFTRAG.md`, `design-system/README.md` (verbindlich, außer REVIEW Abschnitt 8).

Quelle für Inhalte der Demo: `reference/demo-v1.0/Main.dc.html`. Nur als Spezifikation lesen, nicht als Code kopieren.

## Was wo liegt
- `app/`, `components/`, `store/`, `lib/`, `model/`, `i18n/`, `theme/`, `config/`: Haushalts-App (Expo). Unter `app/api/` die API-Routen, darunter das Demo-Backend (`server/backend/`).
- `portal/`: Händlerportal (Next.js), spricht nur über die API mit dem Backend.
- `website/site/`: die Website machs.io (Register-Fassung, statisch, Hetzner). Einzige Quelle der Website. `website/mach_s_Register.html` nur zum Ansehen, nie hochladen.

## Feste Regeln
- Name „mach’s“, immer klein, mit typografischem Apostroph (Entscheidung 15). Marke und Look: machs.io (blau). Die Wortmarke kommt aus der Logo-Datei, nie aus der Schrift. Die Fotodiagnose heißt „Intelligente Fehlererkennung“. Nie „KI“ oder „AI“, keine Funken-Icons.
- App: Du-Form. Portal: Sie-Form. Kurze Sätze, ruhiger Ton, keine Ausrufezeichen, keine Emojis. Keine Erklärtexte: Oberflächen müssen sich selbst erklären. Es bleiben Fakten, Sicherheitshinweise, Fehlermeldungen und Rechtliches.
- Anleitungsinhalte wörtlich aus der Quelle (Gebrauchsanweisung mit Seitenangabe). Nicht umformulieren. Keine Anleitung ohne Freigabe (Entscheidung 24).
- Alle Texte in `i18n/de.ts`. Fiktive Namen und Preise in `config/demo.config.ts` und `config/portal.demo.ts`.
- Keine Hex-Werte außerhalb von `theme/`. Dark Mode, Dynamic Type bis 200 %, Screenreader-Labels, Trefferflächen ab 44 pt.
- Keine Links zu Portalen in der App. Chats gibt es zwei: den Reparatur-Assistenten und, nach der Weitergabe, den Händler (Entscheidungen 6, 32). Der API-Schlüssel nie in die App.
- Keine Datenweitergabe ohne Bestätigung. Kein Schadenfall ohne aktiven Tap. Keine Kostenzusage vor der Freigabe.
- Website: strenge Sicherheitsregeln in `website/site/.htaccess`. Kein Inline-CSS, kein Inline-JS. Nach Änderungen an `site.css` oder `site.js` die Versionsnummer `?v=` in allen HTML-Dateien erhöhen.

## Arbeitsweise
- Arbeitsbranch: `claude/clever-bardeen-bpc32q`. Commit und Push auf diesen Branch sind erlaubt (Lennart: „push alles“). Keine PRs, kein Merge ohne Anweisung.
- Kleine Commits, ein Commit pro Schritt. Vorher `npm run check` (App, Backend, Tests). Beim Portal zusätzlich `cd portal && npx tsc --noEmit`.
- Bei Unklarheit: vernünftige Annahme treffen, in `docs/ANNAHMEN.md` notieren, weitermachen. Nur bei schwer umkehrbaren Entscheidungen fragen.
- Neue Festlegungen von Lennart als nächste Nummer in `docs/ENTSCHEIDUNGEN.md` aufnehmen.
- Oberflächen im Browser prüfen (Playwright), mit Screenshots, hell und dunkel, Rechner und Handy.
- Kurz berichten, was fertig ist. Am Ende `docs/STAND.md` aktualisieren.
