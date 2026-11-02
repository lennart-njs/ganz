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

## Anleitungen, Fotos und Händler (02.11.2026)

Lennart: „Wie können wir es so umgestalten, dass ich nicht jede Anleitung händisch hinterlegen muss … außerdem fehlt uns noch das Händlerportal/Backend, oder?“ Antworten auf den Vorschlag:

15. **Anleitungs-Katalog:** Anleitungen kommen aus einem Katalog auf dem Server, je Material- oder Modellnummer. Eine Pipeline zieht sie einmal je Modell aus der Gebrauchsanweisung des Herstellers, wörtlich und mit Seitenangabe. Ein Mensch gibt jede Anleitung frei, bevor die App sie zeigt (z. B. der Hersteller in einer Partnerschaft). Keine Anleitungen, die erst im Moment der Frage entstehen. Ohne geprüfte Anleitung darf der Assistent aus der Gebrauchsanweisung zitieren, zeigt aber keine Schritte; danach Hilfe holen. Die Inhalte liefert der Hersteller unter Lizenz, er bekommt dafür die Daten zu Abbrüchen.
16. **Anleitung im Gespräch:** Die Schritt-für-Schritt-Anleitung läuft im Fall-Gespräch. Jeder Schritt ist eine Nachricht, „Erledigt“ und „Geht nicht“ stehen als Antworten unten. Der Stift an „Erledigt“ geht einen Schritt zurück. Die Vollbild-Ansicht bleibt als „Details“. Ändert Entscheidung 11 für die Anleitung.
17. **Foto an den Reparatur-Assistenten:** Im Eingabefeld gibt es eine Kamera. Das Foto geht mit dem aktuellen Schritt an den Assistenten („Soll ich das so machen?“). Er schätzt ein: passt, passt nicht oder unklar, und sagt nie „das ist sicher“. Sieht er Wasser an Strom, beschädigte Kabel oder ein offenes Gehäuse, schlägt er sofort Hilfe vor. Die Einwilligung nennt Fotos ausdrücklich. Der Server speichert die Bilder nicht.
18. **Anleitungen wörtlich aus der Hersteller-Quelle** statt aus der Demo. `npm run guides:check` prüft weiter die Demo-Anleitungen im Katalog.
19. **Händler sieht Einzelfälle:** Der Händler sieht die volle Fallakte, aber nur nach ausdrücklicher Bestätigung je Fall („Fall an … senden“). Ersetzt den Satz „Der Händler bekommt keine Einzelfälle“ in `DATA_MODEL.md`.
20. **Rückfragen des Händlers** kommen als Ereignisse mit Antwort-Buttons ins Fall-Gespräch. Kein freier Chat mit dem Händler, Entscheidung 6 bleibt.
21. **Händlerportal:** Web-App unter der Domain der Webseite (z. B. `portal.ganz.de`), im selben Repo als zweite App (`portal/`). Für die Demo mit Beispieldaten und Demo-Login, gebaut gegen eine Backend-Schnittstelle, damit es später mit echtem Backend weiterläuft. **Backend-Anbieter entscheidet Lennart später.**
22. **Onboarding:** Zuerst „Wo hast du das Gerät gekauft?“ (Händler), dann „Hast du zusätzlich eine Versicherung oder Garantieverlängerung?“. Passt zu B-41 „Zuerst der Händler“.

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
