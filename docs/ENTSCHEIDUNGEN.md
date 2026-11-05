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

## Zukunftsplan (03.11.2026)

Nummern der ganz-Linie, hier „ganz Nr. …“. Neue Nummern 38–59 folgen (Schritt 7 der Übertragung, `docs/ANNAHMEN.md`).

Lennart im Chat: „setze den plan um“. Damit ist `docs/ZUKUNFTSPLAN.md` freigegeben. Die Schritte stehen in `docs/BUILD_PLAN.md` Abschnitt 8.

Offen, mit Empfehlung im Zukunftsplan Abschnitt 6. Bis zur Antwort gilt die dort genannte Empfehlung oder die strengere Variante. Die Nummern setzen die bestehenden fort.

- [x] 15. Branch und PR je Schritt (Ende Woche 1). Ja, siehe Nr. 35.
- [ ] 16. Wirkung eines Widerrufs bei lit. b (vor Phase 3a). Bis dahin: Die Simulation hält bei Widerruf an. Teil entschieden: Abbrechen in der Reparatur geht (Nr. 34). Offen bleibt „Anfrage zurückziehen“ gegen „Weitergabe beenden“.
- [ ] 17. Eigener Build für den Pitch, Apple Developer Program als Organisation (Antrag Woche 1)
- [ ] 18. Host für den Assistenten, später EU-Inferenz und Kerndaten
- [ ] 19. Pflichthinweis nach Art. 50 KI-VO (vor dem Gate in Phase 4)
- [ ] 20. Crash-Reporting als Opt-in (vor Phase 4)
- [ ] 21. Co-Branding statt vollem Whitelabel (vor Phase 3b)
- [ ] 22. Rolle von ganz nach DSGVO: Hypothese vor Phase 3a, Bestätigung vor Phase 5
- [ ] 23. Concierge-Pilot nach Gate echte Daten, mit Pilotvertrag
- [ ] 24. Anmeldung und Personen je Haushalt (vor Phase 5)
- [ ] 25. Löschfristen (Entwurf Ende Phase 4)
- [ ] 26. Lizenz und Haftung der Anleitungen (vor dem Gate in Phase 4)
- [ ] 27. Selbstzahler im Pilot und Pflichten als Vermittler (vor Phase 6)
- [ ] 28. Assistent für externe Testerinnen (vor dem Gate in Phase 4)
- [ ] 29. Einzelfall mit Einwilligung für Hersteller (vor Phase 6)
- [ ] 30. Fehlererkennung und Videoanbieter im Pilot (vor Phase 5)

## Nach Phase 1 (04.11.2026)

Nummern der ganz-Linie, hier „ganz Nr. …“. Neue Nummern 38–59 folgen (Schritt 7 der Übertragung, `docs/ANNAHMEN.md`).

Antworten von Lennart im Chat auf die offenen Punkte im Bericht zu Phase 1. Der Anwalt prüft die Rechtsfragen trotzdem. Bis dahin gilt, was hier steht.

31. **Selbstbeteiligung bei einem Termin vorbehaltlich Freigabe (Rechtsfrage 46):** Ein verbindlicher Schritt nach der Freigabe. Solange Kranich prüft, ist die Terminanfrage unverbindlich. Der Button heißt „Termin anfragen“, und es gibt keinen Betrag als Schuld. Nach „Kranich hat freigegeben“ zeigt das Gespräch eine Zusammenfassung mit Betrieb, Zeitfenster und Selbstbeteiligung, dazu den Button „Zahlungspflichtig buchen“. Erst nach diesem Tap bestätigt der Betrieb den Termin. Bei 0 € Selbstbeteiligung gibt es keinen zweiten Schritt. Ergänzt Nr. 4 und Nr. 5.
32. **Misslungene Reparatur (Rechtsfrage 47):** Es kommt auf den Zeitraum an. Läuft die gesetzliche Gewährleistung für die Reparatur noch, bessert der Betrieb nach. Dann gibt es keine neue Schadenmeldung und keine neuen Kosten für den Haushalt. Nach Ablauf beginnt eine neue Runde wie bisher. Annahme bis zur Antwort des Anwalts: 2 Jahre ab Abschluss der Reparatur (§ 634a Abs. 1 Nr. 1 BGB). Der Wert steht in `config/demo.config.ts`.
33. **Vor-Ort-Diagnose ohne festen Preis (Rechtsfrage 34):** Lennart: „Ja“. Ausgelegt als: Die App fragt mit „Termin anfragen“ an, unverbindlich. Der Betrieb nennt den Preis vor dem Termin. Dann folgt derselbe verbindliche Schritt wie in Nr. 31, mit Preis und „Zahlungspflichtig buchen“. Ohne diesen Tap gibt es keinen Termin.
34. **Abbrechen während der Reparatur (zu Nr. 16):** Ja. Ein Fall lässt sich auch in der Reparatur abbrechen, der Betrieb bekommt die Absage. Die App sagt nicht zu, dass dabei keine Kosten entstehen (§ 648 BGB, Frage an den Anwalt).
35. **Branch und PR (Nr. 15):** Ja. Die Arbeit läuft über einen PR, die CI muss grün sein. Mergen tut Lennart.
36. **CLAUDE.md und `.claude/settings.json`:** Lennart erlaubt der Sitzung, die Zeile „Keine Status-Vergleiche in Screens“ in CLAUDE.md einzutragen und das Lesen von `.env` zu sperren.

## Werte für `config/demo.config.ts`

Alles fiktiv und als Beispielwert gekennzeichnet.

| Wert | Eintrag |
|---|---|
| Versicherer | Kranich Versicherung |
| Schutzprodukt | Garantieverlängerung, gültig bis 03/2028 |
| Selbstbeteiligung | 0 € |
| Demo-Vertragsnummer | KV-2023-0471 |
| Händler (fehlt in der Demo) | [HÄNDLER] – Name eintragen, z. B. für den Händler-Code. Bis dahin „Elektro Albers“ (Annahme, siehe ANNAHMEN) |
| Demo-Händler-Code | [CODE]. Bis dahin `EA-2023` (Annahme) |
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

## Demo für Fründ Elektrogeräte AG (02.11.2026)

Termin: Freitag, 06.11.2026, 10 Uhr, online, mit Jan Philipp Fründ. Antworten von Lennart im Chat:

15. **Name:** In der Demo heißt die App „mach’s“ (machs.io) und folgt dem mach’s-Designsystem (Artifact „mach’s“). Ersetzt die Regel „Name ganz“ für diese Demo.
16. **Versicherung oder Händler:** Wer ein neues Gerät anlegt, wird gefragt: „Versicherung vorhanden?“ Ja: Versicherer aus einer Liste wählen und Police-Nr. eintragen. Nein: den Händler wählen, bei dem das Gerät gekauft wurde, ebenfalls aus einer Liste. Beide Listen sind per Eingabe durchsuchbar. Ohne Versicherung kommt im Fall kein Versicherer vor.
17. **Fründ mit echtem Namen:** Fründ darf in der Demo mit echtem Namen erscheinen, immer mit dem Zusatz „(DEMO)“.
18. **Anleitungen aus Gebrauchsanweisungen:** Lennart hat drei Gebrauchsanweisungen geschickt. Daraus werden Anleitungen: Miele G 5833 SC (Geschirrspüler), Bosch SMI4EAS24E (Geschirrspüler), Miele WQ 1000 WPS (Waschmaschine).
19. **Push:** Push auf den Arbeitsbranch ist freigegeben, damit Lennart auf dem Handy testen kann. Kein PR ohne Anweisung.

## Nach dem ersten Test auf dem Handy (03.11.2026)

Lennart: „Ich finde die App teilweise etwas chaotisch und überladen von Platzhaltern, zu viel Text, Quellinformationen etc.“

20. **Schlicht:** Jeder Screen beantwortet eine Frage: ein großes Element, höchstens ein Satz Erklärung, eine Hauptaktion. Alles andere hinter „Details“ oder in der Fallakte. Keine Foto-Platzhalter. Die Quelle der Anleitung steht einmal im ersten Schritt, Seite und Originaltext in der Fallakte.
21. **Keine Demo-Kennzeichnung:** Fründ erscheint ohne „(DEMO)“. Demo-Hinweise und „Beispielwerte“ sind für den Pitch aus und lassen sich über die Demo-Steuerung wieder anschalten. Ersetzt den Zusatz „(DEMO)“ aus Entscheidung 17.
22. **Rebranding vollständig:** mach’s überall, Wortmarke und App-Icon aus den Logo-Dateien des Designsystems. Das ganz-Designsystem liegt nur noch als Referenz unter `reference/ganz-design-system/`.
23. **Übersichtsseiten einklappbar:** Auf Übersichtsseiten (Gerät, Profil, Fälle, Fallakte) ist jedes Thema ein Abschnitt, der sich auf- und zuklappen lässt. Standard: eingeklappt. Eingeklappt zeigt jeder Abschnitt eine Zeile Zusammenfassung, z. B. „läuft“, „3 Anleitungen“ oder „Keine aktiv“. (Lennart, 03.11.2026)

## Anleitungen, Fotos und Händler (02.11.2026, zweiter Chat)

Lennart: „Wie können wir es so umgestalten, dass ich nicht jede Anleitung händisch hinterlegen muss … außerdem fehlt uns noch das Händlerportal/Backend, oder?“ Entstanden parallel zu 15 bis 23 auf einem eigenen Branch, beim Zusammenführen auf 24 bis 31 umnummeriert.

24. **Anleitungs-Katalog:** Anleitungen kommen aus einem Katalog je Material- oder Modellnummer. Eine Pipeline zieht sie einmal je Modell aus der Gebrauchsanweisung des Herstellers, mit Seite und Originaltext (`src`, wie Entscheidung 18). Ein Mensch gibt jede Anleitung frei, bevor die App sie zeigt. Keine Anleitungen, die erst im Moment der Frage entstehen. Die Modelle aus Entscheidung 18 sind die ersten Einträge. Die Inhalte liefert der Hersteller unter Lizenz, er bekommt dafür die Daten zu Abbrüchen.
25. **Anleitung im Gespräch:** Die Schritt-für-Schritt-Anleitung läuft im Fall-Gespräch. Jeder Schritt ist eine Nachricht, „Erledigt“ und „Geht nicht“ stehen als Antworten unten. Der Stift an „Erledigt“ geht einen Schritt zurück. Die Vollbild-Ansicht bleibt als „Details“. Ändert Entscheidung 11 für die Anleitung.
26. **Foto an den Reparatur-Assistenten:** Im Eingabefeld gibt es eine Kamera. Das Foto geht mit dem aktuellen Schritt an den Assistenten („Mache ich das so richtig?“). Er schätzt ein: passt, passt nicht oder unklar, und sagt nie „das ist sicher“. Sieht er Wasser an Strom, beschädigte Kabel oder ein offenes Gehäuse, schlägt er sofort Hilfe vor. Die Einwilligung nennt Fotos ausdrücklich. Der Server speichert die Bilder nicht.
27. **Quelle der Anleitung:** Jeder Schritt trägt Seite und Originaltext der Gebrauchsanweisung. `npm run guides:check` prüft weiter die Demo-Anleitungen der WKB 130.
28. **Händler sieht Einzelfälle:** Der Händler sieht die volle Fallakte, aber nur nach ausdrücklicher Bestätigung je Fall („Fall an … senden“). Ersetzt den Satz „Der Händler bekommt keine Einzelfälle“ in `DATA_MODEL.md`.
29. **Rückfragen des Händlers** kommen als Ereignisse mit Antwort-Buttons ins Fall-Gespräch. Kein freier Chat mit dem Händler, Entscheidung 6 bleibt.
30. **Händlerportal:** Web-App unter der Marke machs.io, im Look der Website, ohne Erklärtexte. Im selben Repo als zweite App (`portal/`). Für die Demo mit Beispielfällen und Demo-Login, gebaut gegen eine Backend-Schnittstelle, damit es später mit echtem Backend weiterläuft. **Backend-Anbieter entscheidet Lennart später.**
31. **Reihenfolge beim Gerät:** Zuerst „Wo hast du das Gerät gekauft?“ (Händler aus der Liste), dann „Zusätzlich eine Versicherung?“. Der Händler bleibt am Gerät, auch wenn eine Versicherung dazukommt. Ändert die Reihenfolge aus Entscheidung 16. Passt zu B-41 „Zuerst der Händler“. (Lennart, 02.11.2026, beim Zusammenführen bestätigt)

## Händlerportal vollständig (03.11.2026)

Lennart: „Der Hersteller muss sich denken: Wow, damit will ich jeden meiner Fälle abwickeln, jeden einzelnen.“ Antworten auf die Rückfragen:

32. **Freier Chat Händler und Kundschaft:** Der Händler schreibt frei, die Kundschaft antwortet per Knopf oder Freitext, auch mit Foto. Alles steht im selben Fall-Gespräch in der App. Ersetzt Entscheidung 29. Der Reparatur-Assistent bleibt daneben erreichbar (Empfänger wählbar).
33. **Portal vollständig:** Arbeitsliste mit Warteschlangen, Fristen, Suche, Massenaktionen, Tastaturkürzeln und Live-Aktualisierung. Fallakte mit Gespräch, interner Notiz, Textbausteinen, Gewährleistungsvorschlag, Termin und Ersatzteil. Auswertung. Einstellungen: Profil, Nachrichten, Team, Regeln, Kundendienst, Benachrichtigungen, Datenschutz, Schnittstellen (mit Logos der wichtigsten Werkzeuge).
34. **Für Freitag nur Fründ.** Kein Hersteller-Blick.
35. **Videocall im Portal:** sichtbar, nicht funktional.
36. **Team sichtbar:** mehrere Personen mit Rollen, die Anmeldung bleibt ein Demo-Konto.
37. **Auswertung aus den Demo-Fällen,** dafür deutlich mehr Beispielfälle anlegen.

## Nach dem Test am Telefon (05.11.2026)

Lennart im Chat, mit zwei markierten Screenshots aus dem Fall GS-24821:

38. **Keine Hinweistexte im Gespräch.** Was rot markiert war, kommt raus: die Karte „Bevor du schreibst“ vor dem Reparatur-Assistenten, „Was du hier schreibst, geht an den Reparatur-Assistenten.“ unter dem Eingabefeld, der Block „Markus T. (Fründ Kundendienst) sieht … Grundlage ist deine Anfrage … Ohne deinen Tap geht nichts weiter.“ vor dem Videocall und die Unterzeile am Kästchen „Screenshots als Nachweis erlauben“. Begründung von Lennart: „all diese Hinweistexte sind damit erledigt, dass der Kunde in den Einstellungen das akzeptiert hat.“ Die Einwilligung in den Assistenten steht deshalb im Profil unter „Freiwillig“, wer was sieht im Profil unter „Datenschutz“. Im Gespräch bleibt der Tap.
    - **Unter dem Angebot „Fall an … senden“** steht „<Unternehmen> prüft den Fall“, und zwar das Unternehmen, das zuständig ist (Regulierer). Ersetzt „Gewährleistung oder Kulanz“.
    - **Antworten unten im Gespräch** klappen beim Hochscrollen ein und kommen beim Herunterscrollen wieder, in jedem Gespräch.
    - **Auf- und zuklappen:** Jeder Bereich, der sich auf- und zuklappen lässt (etwa im Profil), ist eine Kachel mit grauem Rahmen. Der Schalter dazu soll eindeutiger sein als der bisherige Pfeil.
