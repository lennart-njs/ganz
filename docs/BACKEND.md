# Backend und Händlerportal

Stand: 03.11.2026 · Entscheidungen 28 bis 37 · Typen: `model/sharing.ts`, `model/portal.ts`, Schnittstelle: `server/backend/types.ts`

## Wofür

Ein Haushalt hat das Gerät bei einem Händler gekauft und ein Problem. Nach seiner Bestätigung („Fall an … senden“) sieht der Händler die Fallakte in seinem Portal und antwortet. Seine Antworten kommen als Nachrichten ins Gespräch des Falls.

```
App (Telefon)                Backend                         Händlerportal (Web)
─────────────                ───────                         ───────────────────
„Ja, senden“  ─POST /api/v1/faelle──▶ speichert Akte, Regeln greifen,
                                     gibt Token und Begrüßung zurück
Fall ändert sich ─POST (Token)──────▶ aktualisiert Akte, Antworten und
                                     Nachrichten setzen „Wartet auf uns“
                                  ◀── GET  /api/v1/portal/faelle ── Arbeitsliste
                                  ◀── GET  /api/v1/portal/faelle/:id ── Fallakte (+ Zugriffsprotokoll)
                                  ◀── POST …/:id/aktionen ── Nachricht, Rückfrage, Termin, …
                                  ◀── POST …/:id/bearbeitung ── Notiz, Zuweisung, Stand
                                  ◀── POST /api/v1/portal/sammelaktion ── mehrere Fälle
                                  ◀── GET/PUT /api/v1/portal/einstellungen
                                  ◀── GET  /api/v1/portal/auswertung ── anonyme Zahlen
alle 5 s ─GET /api/v1/faelle/:id/ereignisse (Token)─▶ Ereignisse des Händlers
Widerruf im Profil ─DELETE /api/v1/faelle/:id (Token)─▶ Personendaten weg
```

## Heute (Demo)

- **Backend** sind API-Routen im Expo-Dev-Server (`app/api/v1/…`), wie schon der Reparatur-Assistent. Speicher ist eine JSON-Datei `.data/ganz-backend.json` (Dateiname bleibt, wie Repo und Ordner) (`server/backend/fileStore.ts`, nicht im Git). Beim ersten Start legt er 42 Beispielfälle für Fründ in allen Ständen und 168 anonyme Fälle für die Auswertung an, verteilt über zwölf Wochen (`server/backend/seed.ts`, Bausteine in `config/portal.demo.ts`). Zufall mit festem Startwert: Die Demo sieht jedes Mal gleich aus.
- **Beispiele bleiben frisch.** Liegt die letzte Aktivität an Beispielfällen mehr als sechs Stunden zurück, rücken alle ihre Zeitpunkte um dieselbe Spanne an heute heran. Am Freitag sind die neuen Fälle also wieder von heute, die Fristen knapp. Fälle aus der App bleiben unverändert. Ganz neu anlegen: `.data/ganz-backend.json` löschen.
- **Portal** ist eine eigene Web-App in `portal/` (Next.js). Sie spricht nur über die API mit dem Backend, nie direkt mit dem Speicher.
- **Anmeldung im Portal** mit dem Demo-Konto aus `config/portal.demo.ts` (`demo@fruend.example` = Sandra K. im Team von Fründ), Passwort `demo` aus derselben Datei (`portalLogin.demoPassword`). Es gilt nur in der Entwicklung (`npx expo start`) oder mit `PORTAL_DEMO_LOGIN=1`. `PORTAL_DEMO_PASSWORD` ersetzt es. In Produktion ohne beides kann sich niemand anmelden. Die Sitzung ist ein signiertes Token mit 8 Stunden Laufzeit (`PORTAL_SESSION_SECRET`). Aktionen tragen den Namen des Teammitglieds.

## Regeln beim Eingang eines Falls

Einstellbar je Händler im Portal (`DealerSettings` in `model/portal.ts`):

- **Begrüßung** mit Platzhaltern `{kunde}`, `{fall}`, `{haendler}`, `{telefon}` und Kontaktkarte (Telefon, E-Mail, Servicezeiten). Kommt sofort mit der Antwort auf das Senden, steht also gleich im Gespräch.
- **Abwesenheitsnachricht** außerhalb der Servicezeiten (Ortszeit Berlin).
- **Automatisch annehmen** (Standard aus) und **automatisch zuweisen** je Gerätetyp.
- **Kaufbeleg anfordern:** Fehlt ein Foto vom Kaufbeleg, stellt das Portal die Rückfrage aus den Vorlagen.

## Bearbeitungsstand

`Workflow` am Fall, nur im Portal: **Neu → Wartet auf uns ⇄ Wartet auf Kundschaft → Termin → Erledigt**. Übergänge automatisch: annehmen und Entscheidung → wartet auf uns; Nachricht, Rückfrage, Terminvorschlag → wartet auf Kundschaft; Antwort oder Nachricht aus der App → wartet auf uns; gewähltes Zeitfenster → Termin (das Backend bestätigt den Betrieb gleich im Gespräch); „Abgeschlossen“ → Erledigt. Von Hand geht jeder Stand. Dazu Zuweisung, interne Notizen (nie in der App) und das Zugriffsprotokoll (wer hat die Akte wann geöffnet). Fristen (erste Reaktion, Antwort) stehen in den Regeln.

## Regeln, die das Backend durchsetzt

- **Nur nach Bestätigung.** Die App sendet erst, wenn es einen `Consent` mit `purpose = 'weitergabe_haendler'` gibt. Die Akte trägt dessen Id. Sie enthält nur, was die Kategorien dieser Bestätigung nennen (`lib/sharing.ts`, `consentCategories`).
- **Nur dieser Händler.** Jede Abfrage im Portal ist an den Mandanten gebunden (`recipient.id`). Fremde Fälle gibt es als 404.
- **Nur die App ändert die Akte.** Beim ersten Senden gibt das Backend ein Token zurück, gespeichert wird nur sein Hash. Ändern, Antworten lesen und Widerrufen gehen nur mit diesem Token.
- **Widerruf löscht Personendaten.** Danach bleiben Fallnummer, Empfänger und Zeitpunkte. Das Portal zeigt „Weitergabe widerrufen“.
- **Nicht in der Akte:** das Gespräch mit dem Reparatur-Assistenten samt den Notizen an die Fachkraft daraus, Fotos zu Fragen an ihn, die Vertragsnummer, verworfene Ergebnisse. Der Zeitstrahl nimmt nur Ereignisarten aus der Allow-List `TIMELINE_EVENTS` (`lib/sharing.ts`).
- **Händler-Aktionen** werden `CaseEvent` mit `actor.kind = 'haendler'` und den Typen `haendler_angenommen`, `haendler_rueckfrage`, `haendler_entscheidung`, `haendler_betrieb`, `haendler_status`, `haendler_nachricht`, `haendler_termin`, `haendler_ersatzteil`. Die App übernimmt nur solche Ereignisse und nur für den richtigen Fall.
- **Freier Chat** mit dem Händler (Entscheidung 32, ersetzt 29): Nachrichten des Haushalts stehen in der Akte (`messages`, mit Foto), Nachrichten des Händlers sind `haendler_nachricht`. Rückfragen haben weiter bis zu vier Antworten als Buttons, Terminvorschläge bis zu vier Zeitfenster.
- **Interne Notizen und Zuweisung** kommen nie in der App an.
- **Größe je Anfrage.** Eine Fallakte hat höchstens 8 MB, eine Anfrage aus dem Portal 256 KB (`server/http/readJson.ts`). Darüber antwortet das Backend mit 413 und liest nicht weiter, auch ohne `Content-Length`.
- **Auswertung** bekommt nur anonyme Zahlen (Zeitpunkt, Gerätetyp, Modell, Ausgang, Fehlerbild), keine Namen, keine Adressen, keine Fallnummern.

## Was die Akte enthält

`SharedCaseFile` in `model/sharing.ts`: Name und Adresse, Gerät mit Typenschild, Kaufdatum und Händler, zusätzlicher Schutz ohne Vertragsnummer, Fall und Status, Ergebnisse, Anleitung bis zum Abbruch mit Notiz, Befund, Kostenvoranschlag, Termin, Fotos (auf 800 px verkleinert, höchstens 12), Zeitstrahl wie in der App, Antworten auf Rückfragen, Nachrichten an den Händler, Bewertung nach der Reparatur. Das ist der Umfang `weitergabe_haendler` (`model/policies/consentScopes.ts`), den der Satz vor „Ja, senden“ nennt. Fehlt eine Kategorie in der Bestätigung, bleiben ihre Felder leer. Fallnummer, Empfänger, Stand und Zeitpunkte des Falls und die Geräteart gehören zur Weitergabe selbst.

## Später (Anbieter entscheidet Lennart)

Wer das echte Backend baut, implementiert `CaseStore` aus `server/backend/types.ts` und setzt es in `server/backend/index.ts` ein. Die API-Routen, die App und das Portal bleiben gleich. Dazu kommt:

- echte Anmeldung für Haushalte und Händler-Mitarbeitende, Rollen je Mitarbeiter
- Fotos als Dateien im Objektspeicher statt base64 in der Akte, mit Hash (`Photo.sha256`)
- Mitteilungen per Push statt Abruf alle 5 Sekunden
- Mandanten für Versicherer und Hersteller (gleiche Schnittstelle, eigener `purpose`)
- Löschfristen durchsetzen (heute nur eingestellt), Auftragsverarbeitungsvertrag mit dem Händler
- Serverstandort EU, Rate-Limits
