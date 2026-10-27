# Entscheidungen für Phase 2

Ausgefüllt von Lennart. Vorbelegt mit den Vorschlägen aus dem Review. Ändere nur, was nicht passt.

## Freigabe
- [x] Phase 1 (REVIEW.md, BUILD_PLAN.md) ist freigegeben. (Freigabe im Chat am 26.10.2026)

## Nach dem Gerätetest (26.10.2026)

Antworten von Lennart im Chat auf „Da sind Fehler drin … Review alles“:

6. **Reparatur-Assistent:** Echter Chat mit Claude (Anthropic). Ersetzt die Regel „kein Chat“ und die Befunde B-09 und B-10 für diesen einen Chat in der App. Der API-Schlüssel liegt nur auf dem Server (`.env`), nie in der App. In der Oberfläche heißt er „Reparatur-Assistent“, ohne „KI“ oder „AI“. Er sagt offen, dass er ein Computerprogramm ist und kein Mensch. Erste Nachricht erst nach Einwilligung (lit. a), widerrufbar im Profil.
7. **Texte je Gerät:** Gemeint ist das Hausgerät. Texte, Symptome und Befunde passen sich dem Gerätetyp an (Waschmaschine, Geschirrspüler, Trockner, Kühlschrank).

## Nach dem zweiten Gerätetest (27.10.2026)

Lennart zeigt eine Versicherungs-App mit Schadenmeldung als Gespräch und fragt: „Können wir uns noch mehr in diese Richtung orientieren?“

8. **Gesprächsstil:** „Problem melden“ läuft als Gespräch. ganz fragt eine Sache nach der anderen, die Antworten stehen als Buttons unten, mit dem Stift lässt sich jede Antwort ändern. Der Reparatur-Assistent bekommt denselben Stil.
9. **Schadenmeldung:** Formular bleibt. Als zweiter Weg geht die Schadenmeldung auch als Gespräch.
10. **Darstellung:** Schalter im Profil: Wie System, Hell, Dunkel.

Abgleich mit dem Designsystem: Keine Versalien, kein Foto-Avatar, kein Rot als Akzent. Der Absender heißt „ganz“ wie in der ChatBubble des Designsystems, Antworten des Haushalts sind Tintenblasen mit 4-px-Zipfel. Neu im Icon-Set: Stift.

## Nach dem Durchklicken (27.10.2026)

Lennart: „Die Formular/Chat logik macht noch nicht richtig sinn. Das muss ein smoother reibungsloser Ablauf werden.“ Antworten auf die Rückfragen:

11. **Ein Gespräch pro Fall:** Der ganze Fall ist ein Verlauf. Ergebnis, Anleitung, Hilfe, Befund, Kosten, Termin und Status stehen als Nachrichten mit Karten darin. Kamera, Anleitung und Videocall öffnen sich als Vollbild und kehren zurück. „Details“ zeigt die Formulare. Ersetzt Entscheidung 9 (Schadenmeldung als zweites Gespräch).
12. **Eigene Worte:** gehen direkt an den Reparatur-Assistenten. Die Einwilligung kommt beim ersten Mal und schickt den Text danach selbst ab. Ohne Einwilligung oder ohne Schlüssel wird der Text eine Notiz für die Fachkraft.
13. **Ein offener Fall pro Gerät:** Ein neuer Versuch ohne Fortschritt ersetzt den alten Fall. Mit Fortschritt fragt ganz: „Weitermachen“ oder „Neues Problem melden“ (der alte Fall wird dann abgebrochen).
14. **Befund:** Die Fachkraft entscheidet. Du bestätigst mit „Passt, weiter“ oder sagst „Stimmt nicht“.

## Offene Fragen aus REVIEW Abschnitt 9

1. **Rechtsgrundlage je Datenfluss:** Vorschlag übernehmen. Angefragte Leistungen (Videocall, Termin, Schadenmeldung) = Art. 6 Abs. 1 lit. b DSGVO mit Bestätigung vor jeder Weitergabe. Einwilligung (lit. a) nur für Screenshots im Call, Einzelfall-Daten an Hersteller und Mitteilungen.
2. **Wer meldet den Schaden?** Nur die Versicherungsnehmerin. Keine weiteren Personen im Prototyp.
3. **Ersatzteil-Weg:** Die Laugenpumpe bestellt und baut immer der Betrieb ein. „Ersatzteil an dich“ nur bei Endnutzer-Teilen, nicht im Golden Path.
4. **Selbstbeteiligung im Pitch:** Standard 0 €. In der Konfiguration auf einen Betrag umschaltbar, dann mit Button „Zahlungspflichtig buchen“.
5. **Termin:** Anfrage „vorbehaltlich Freigabe“.

## Werte für `config/demo.config.ts`

Alles fiktiv und als Beispielwert gekennzeichnet.

| Wert | Eintrag |
|---|---|
| Versicherer | Kranich Versicherung |
| Schutzprodukt | Garantieverlängerung, gültig bis 03/2028 |
| Selbstbeteiligung | 0 € |
| Demo-Vertragsnummer | KV-2023-0471 |
| Händler (fehlt in der Demo) | [HÄNDLER] – Name eintragen, z. B. für den Händler-Code |
| Demo-Händler-Code | [CODE] |
| Hersteller | Miele |
| Gerät | Miele WKB 130, Waschmaschine, gekauft 03/2023 |
| Kundendienst | Miele Kundendienst, 0800 22 44 666, kostenfrei |
| Betrieb 1 | Hausgeräte Brandt, Miele-autorisiert, 2,4 km |
| Betrieb 2 | Reparaturwerk Neukölln, freie Werkstatt, 3,8 km |
| Fachkraft | Jonas K., Hausgeräte Brandt |
| Reparatur | 189 € (Original-Laugenpumpe und Arbeit) |
| Ersatzgerät | 899 € |
| Zeitfenster | Mo vormittags, Di nachmittags, Mi vormittags, Do abends |

## Gerät und Testumgebung
- Testgerät im Pitch: [iPhone / Android] mit Expo Go
- Fotos in `assets/photos/`: [ja / noch nicht – Platzhalter verwenden]
