# Review-Checkliste

Stand: 03.11.2026 · Bezug: `docs/ZUKUNFTSPLAN.md` Grundsatz 8 und Abschnitt 5

Review-Zeit ist der Engpass, nicht das Schreiben von Code. Diese Liste hilft, schnell und gleich gründlich zu prüfen. Sie ersetzt keinen Test. Was ein Test oder eine Lint-Regel prüft, prüft ihr nicht noch einmal von Hand.

## Arbeitsweise

- **Commits je Tag:** Höchstens so viele, wie ihr am selben Tag prüfen könnt. Ist am Abend etwas ungeprüft, startet am nächsten Morgen keine neue Sitzung, bevor es geprüft ist.
- **Eine Sitzung je Hotspot:** In `store/appStore.ts`, `i18n/de.ts` und `app/fall/[id]/index.tsx` arbeitet immer nur eine Sitzung gleichzeitig. Der Auftrag an eine Sitzung nennt die Hotspots, die sie ändern darf. Eine zweite Sitzung mit demselben Hotspot wartet, bis die erste geprüft und committet ist.
- **Klein:** ein Commit je Teilschritt. Ein Commit, der zu groß zum Prüfen ist, geht zurück an die Sitzung und wird geteilt.
- **Pflicht-Review durch einen Menschen** für `model/policies/`, Consent-Flows, Hinweistexte, `config/` und ab Phase 4 die Compliance-Registry. Wer prüft, steht unten bei jedem Abschnitt.
- **Rot heißt Stopp:** Ist `scripts/ci-checks.sh` rot, gibt es kein Review und keinen Merge.

## Jeder Commit

- [ ] `scripts/ci-checks.sh` ist grün, ab Nr. 15 auch CI.
- [ ] Der Commit macht, was die Nachricht sagt, und nichts nebenbei.
- [ ] Kein Test ist geschwächt, übersprungen oder gelöscht. Kein Timeout ist erhöht.
- [ ] Ein Regressionstest wechselt nur im selben Commit wie die Behebung von `test.failing` auf `test`. `docs/BEFUNDE.md` ist im selben Commit nachgezogen.
- [ ] Neue Annahmen stehen in `docs/ANNAHMEN.md`.
- [ ] Keine neue Abhängigkeit ohne Auftrag. Wenn doch, ist `package-lock.json` im selben Commit.
- [ ] Kein Geheimnis im Diff. Kein API-Schlüssel in der App, kein `EXPO_PUBLIC_` vor einem Schlüssel.
- [ ] Feste Regeln aus `CLAUDE.md`: „ganz“ klein, „Intelligente Fehlererkennung“, nie „KI“ oder „AI“, keine Funken-Icons, Du-Form, kurze Sätze, keine Ausrufezeichen, keine Emojis.
- [ ] Ändert sich ein Feld in `model/types.ts` oder `AppData`, ist `store/storedState.ts` im selben Commit angepasst. Steigt `STORE_VERSION`, gibt es eine Migration und eine neue Fixture.

## `model/policies/`

Prüft: Technik.

- [ ] Jede Regel gibt es genau einmal. Screens fragen nur nach, kein `.status ===` in `app/` und `components/` außerhalb der Allowlist.
- [ ] Der Tabellentest je Status deckt die Änderung ab. Ein neuer Status oder eine neue Aktion hat eine Zeile in der Tabelle.
- [ ] Reine Funktionen: kein React, kein Store, keine Texte, keine Uhr ohne Parameter.
- [ ] Die festen Regeln halten: keine Kostenzusage vor der Freigabe, kein Schadenfall ohne aktiven Tap, keine Weitergabe ohne Bestätigung, höchstens ein offener Fall je Gerät (Nr. 13).
- [ ] Eine geänderte Regel ist begründet, in `docs/ENTSCHEIDUNGEN.md` oder `docs/ANNAHMEN.md`.

## Consent-Flows

Prüft: Technik, die Texte dazu Produkt.

- [ ] Vor jeder Weitergabe steht sichtbar, wer was bekommt, wozu und auf welcher Grundlage. Erst der Tap löst sie aus.
- [ ] Vorschau und gespeicherte Bestätigung nutzen dieselbe Liste der Kategorien (R-14).
- [ ] Gespeichert sind wer, wann, was, Grundlage und Textversion, ab Schritt 26 auch `textHash`.
- [ ] Widerruf und „Weitergabe beenden“ stoppen alles Künftige, auch die Simulation (R-12).
- [ ] Eine Einwilligung, die für alle Fälle gilt, hängt an keinem Fall (R-15).
- [ ] Mitteilungen nur mit gespeicherter Einwilligung (R-13). Ein Rückruf nur mit Bestätigung (R-16).
- [ ] Bei lit. b heißt es nicht „Widerruf“ (Nr. 16).
- [ ] Tests decken Erteilen, Widerrufen und erneutes Erteilen ab.

## Hinweistexte in `i18n/de.ts`

Prüft: Produkt. Rechtstexte erst nach dem Wortlaut von Anwalt oder DSB (`docs/recht/RECHTSFRAGEN.md`).

- [ ] Ein Rechts- oder Pflichttext ändert sich nur mit neuer `textVersion`. Ab Schritt 26 macht ein Test die Suite sonst rot.
- [ ] Der Wortlaut des Anwalts steht unverändert da, etwa der Pflichtsatz nach Art. 50 (Nr. 19).
- [ ] Mitteilungen auf dem Sperrbildschirm sind neutral: kein Gerät, kein Betrag, kein Betrieb, keine Entscheidung, keine Fallnummer (R-17).
- [ ] Ton: Du, kurze Sätze, ruhig, keine Ausrufezeichen, keine Emojis, nie „KI“ oder „AI“.
- [ ] Anleitungen bleiben wörtlich wie in der Demo (`npm run guides:check`).
- [ ] Kein Name aus `config/demo.config.ts` im Text. Der Whitelabel-Test prüft das.
- [ ] Jeder neue Button und jedes neue Feld hat ein Label für den Screenreader, wo nötig einen Hinweis.

## `config/`

Prüft: Produkt.

- [ ] Nur Beispielwerte, und die App kennzeichnet sie so. Keine echten Personen, Verträge oder Fälle.
- [ ] Ein echter Fakt (etwa `ecoDesignDeliveryDays`) hat eine geprüfte Quelle oder steht in `docs/recht/RECHTSFRAGEN.md`.
- [ ] Beträge in Cent. Selbstbeteiligung und Preise passen zu den Texten.
- [ ] Kein Schlüssel, kein Token, kein Link zu einem Portal.
- [ ] Ein anderer Versicherer in der Konfiguration ändert weiter alle Texte (Whitelabel-Test).

## Hotspots

| Datei | Warum ein Hotspot | Worauf achten |
|---|---|---|
| `store/appStore.ts` | Alle Aktionen, Persistenz und Simulation in einer Datei. Fast jeder Schritt ändert sie. | Schema in `store/storedState.ts` im selben Commit. `STORE_VERSION` nur mit Migration. Neue Aktionen mit Test. Ab Schritt 24 `Result` statt Exception. |
| `i18n/de.ts` | Alle Texte, auch Rechts- und Pflichttexte. | Pflichttexte nur mit neuer `textVersion`. Kein Name aus der Konfiguration. Ton nach `CLAUDE.md`. |
| `app/fall/[id]/index.tsx` | Das Gespräch eines Falls, die größte Fläche der App. | Keine Status-Vergleiche, nur Fragen an die Regeln. Die Regressionstests in `__tests__/regressions/` bleiben grün oder wechseln mit der Behebung auf `test`. |

## Am Ende des Tages

- [ ] Jeder Commit des Tages ist geprüft oder zurückgegeben.
- [ ] Offene Fragen an Anwalt oder DSB stehen in `docs/recht/RECHTSFRAGEN.md`.
- [ ] Vor einem wichtigen Termin: 48 Stunden Merge-Freeze, Pitch-Tag nach `docs/PITCH_CHECK.md`.
