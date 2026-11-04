# Abläufe

Wiederkehrende Handgriffe. Befehle jeweils im Ordner des Repos.

## Starten

Nach jedem `git pull` einmal die Pakete nachziehen:

```bash
npm install
```

Seit der Übertragung der ganz-Linie braucht die App `zod` und `fast-check`. Ohne sie startet Metro nicht.

App und API (Backend der Demo):

```bash
npx expo start
```

Händlerportal, in einem zweiten Terminal:

```bash
cd portal && npm install && npm run build && npm start
```

Portal: http://localhost:3000, Zugang `demo@fruend.example` mit Passwort `demo`. Für die Entwicklung reicht `npm run dev`. Für die Vorführung `npm start` nehmen, das läuft ohne Entwickler-Hinweise.

## Prüfen

```bash
npm run check
```

```bash
cd portal && npx tsc --noEmit
```

Die Prüfungen aus CI, mit dem Typecheck des Portals: `scripts/ci-checks.sh`. `next build` läuft nur in CI, lokal mit `cd portal && npm run build`. gitleaks und osv-scanner laufen lokal nur, wenn sie installiert sind. Sonst steht ein Hinweis da.

## Demo

1. Vorher die Beispielfälle frisch anlegen: `.data/ganz-backend.json` löschen und die App neu starten. Sie bleiben aber auch ohne das aktuell.
2. Zwei Terminals öffnen: Expo und Portal (siehe oben). Das Handy ist im selben WLAN.
3. Am Handy einen Fall anlegen, „Fall an Fründ senden“ tippen. Im Portal erscheint der Hinweis „Neuer Fall“, in der App sofort die Begrüßung.
4. Im Portal annehmen, Gewährleistung bestätigen, Nachricht oder Terminvorschlag senden. Die Antwort steht nach höchstens 5 Sekunden in der App.
5. Danach Auswertung und Einstellungen → Schnittstellen zeigen.

## Website auf Hetzner

1. Änderungen nur in `website/site/` machen. Nach Änderungen an CSS oder JS die Versionsnummer `?v=` in allen HTML-Dateien erhöhen.
2. Lokal mit den Sicherheitsregeln aus `.htaccess` testen: keine Fehler in der Konsole.
3. Den Inhalt von `website/site/` ins Webverzeichnis von machs.io hochladen, inklusive der versteckten Datei `.htaccess`.
4. Live prüfen: Startseite, `/impressum/`, `/datenschutz/`, 404, HTTPS.

Details: `website/README.md`.

## Git

- Arbeitsbranch: `claude/clever-bardeen-bpc32q`. Cloud-Chats pushen dorthin.
- Lokal vor der Arbeit nachziehen (im normalen Terminal, nicht in einer Sandbox):

```bash
git pull origin claude/clever-bardeen-bpc32q
npm install
```

- Arbeiten zwei Sitzungen gleichzeitig (Cloud und Mac), immer über GitHub abgleichen.

## Neuer Chat

Den ersten Satz so beginnen: „Lies docs/STAND.md und mach weiter mit …“. Am Ende sagen: „Aktualisier den Stand.“
