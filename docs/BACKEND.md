# Backend und Händlerportal

Stand: 02.11.2026 · Entscheidungen 28 bis 21 · Typen: `model/sharing.ts`, Schnittstelle: `server/backend/types.ts`

## Wofür

Ein Haushalt hat das Gerät bei einem Händler gekauft und ein Problem. Nach seiner Bestätigung („Fall an … senden“) sieht der Händler die Fallakte in seinem Portal und antwortet. Seine Antworten kommen als Nachrichten ins Gespräch des Falls.

```
App (Telefon)                Backend                         Händlerportal (Web)
─────────────                ───────                         ───────────────────
„Ja, senden“  ─POST /api/v1/faelle──▶ speichert Akte, gibt Token
Fall ändert sich ─POST (Token)──────▶ aktualisiert Akte
                                  ◀── GET /api/v1/portal/faelle ── Liste
                                  ◀── GET /api/v1/portal/faelle/:id ── Fallakte
                                  ◀── POST …/:id/aktionen ── annehmen, Rückfrage, …
alle 15 s ─GET /api/v1/faelle/:id/ereignisse (Token)─▶ Ereignisse des Händlers
Widerruf im Profil ─DELETE /api/v1/faelle/:id (Token)─▶ Personendaten weg
```

## Heute (Demo)

- **Backend** sind API-Routen im Expo-Dev-Server (`app/api/v1/…`), wie schon der Reparatur-Assistent. Speicher ist eine JSON-Datei `.data/ganz-backend.json` (Dateiname bleibt, wie Repo und Ordner) (`server/backend/fileStore.ts`, nicht im Git). Beim ersten Start legt er zwei Beispielfälle für Fründ an (`config/demo.config.ts` → `portalExamples`), damit das Portal ohne Telefon etwas zeigt.
- **Portal** ist eine eigene Web-App in `portal/` (Next.js). Sie spricht nur über die API mit dem Backend, nie direkt mit dem Speicher.
- **Anmeldung im Portal** mit dem Demo-Konto des Händlers aus der Konfiguration (`dealers[].portalUser`, Fründ: `demo@fruend.example`), Passwort `demo` (änderbar mit `PORTAL_DEMO_PASSWORD`). Die Sitzung ist ein signiertes Token mit 8 Stunden Laufzeit (`PORTAL_SESSION_SECRET`).

## Regeln, die das Backend durchsetzt

- **Nur nach Bestätigung.** Die App sendet erst, wenn es einen `Consent` mit `purpose = 'weitergabe_haendler'` gibt. Die Akte trägt dessen Id.
- **Nur dieser Händler.** Jede Abfrage im Portal ist an den Mandanten gebunden (`recipient.id`). Fremde Fälle gibt es als 404.
- **Nur die App ändert die Akte.** Beim ersten Senden gibt das Backend ein Token zurück, gespeichert wird nur sein Hash. Ändern, Antworten lesen und Widerrufen gehen nur mit diesem Token.
- **Widerruf löscht Personendaten.** Danach bleiben Fallnummer, Empfänger und Zeitpunkte. Das Portal zeigt „Weitergabe widerrufen“.
- **Nicht in der Akte:** das Gespräch mit dem Reparatur-Assistenten, Fotos zu Fragen an ihn, die Vertragsnummer.
- **Händler-Aktionen** werden `CaseEvent` mit `actor.kind = 'haendler'` und den Typen `haendler_angenommen`, `haendler_rueckfrage`, `haendler_entscheidung`, `haendler_betrieb`, `haendler_status`. Die App übernimmt nur solche Ereignisse und nur für den richtigen Fall.
- **Kein freier Chat** mit dem Händler (Entscheidung 29). Rückfragen haben bis zu vier Antworten als Buttons.

## Was die Akte enthält

`SharedCaseFile` in `model/sharing.ts`: Name und Adresse, Gerät mit Typenschild, Kaufdatum und Händler, zusätzlicher Schutz ohne Vertragsnummer, Fall und Status, Ergebnisse, Anleitung bis zum Abbruch mit Notiz, Befund, Kostenvoranschlag, Termin, Fotos (auf 800 px verkleinert, höchstens 12), Zeitstrahl wie in der App, Antworten auf Rückfragen.

## Später (Anbieter entscheidet Lennart)

Wer das echte Backend baut, implementiert `CaseStore` aus `server/backend/types.ts` und setzt es in `server/backend/index.ts` ein. Die API-Routen, die App und das Portal bleiben gleich. Dazu kommt:

- echte Anmeldung für Haushalte und Händler-Mitarbeitende, Rollen je Mitarbeiter
- Fotos als Dateien im Objektspeicher statt base64 in der Akte, mit Hash (`Photo.sha256`)
- Mitteilungen per Push statt Abruf alle 15 Sekunden
- Mandanten für Versicherer und Hersteller (gleiche Schnittstelle, eigener `purpose`)
- Löschfristen, Protokoll jedes Zugriffs, Auftragsverarbeitungsvertrag mit dem Händler
- Serverstandort EU, Rate-Limits, Größenbeschränkung je Anfrage
