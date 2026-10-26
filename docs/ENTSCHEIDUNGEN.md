# Entscheidungen für Phase 2

Ausgefüllt von Lennart. Vorbelegt mit den Vorschlägen aus dem Review. Ändere nur, was nicht passt.

## Freigabe
- [ ] Phase 1 (REVIEW.md, BUILD_PLAN.md) ist freigegeben.

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
