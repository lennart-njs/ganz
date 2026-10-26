// Anleitungen für die Miele WKB 130, wörtlich aus guides() in reference/demo-v1.0/Main.dc.html.
// Inhalte nicht umformulieren (CLAUDE.md). Prüfung: npm run guides:check
import type { Guide } from '@/model/types';

export const GUIDE_SOURCE = 'Gebrauchsanweisung WKB 130, M.-Nr. 10 162 440';

/** Schlüssel der Schrittfotos. Bis die Markenfotos da sind: beschriftete Platzhalter. */
export type GuideImage = 'fehler' | 'pumpe';

export type GuideId =
  | 'zulauf'
  | 'ablauf'
  | 'tuer'
  | 'wackelt'
  | 'nass'
  | 'start'
  | 'verriegelung'
  | 'entriegelung'
  | 'waterproof'
  | 'fehlerf'
  | 'dosierung'
  | 'hygiene'
  | 'einspuel';

export const guides: Record<GuideId, Guide> = {
  zulauf: {
    id: 'zulauf',
    kind: 'stoerung',
    title: 'Wasserzulauf gestört',
    code: 'Wasserzulauf',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Wasserhahn prüfen',
        d: 'Ist der Wasserhahn weit genug geöffnet? Dreh ihn ganz auf.',
      },
      {
        t: 'Zulaufschlauch prüfen',
        d: 'Schau hinter die Maschine: Der Schlauch darf nirgends geknickt sein.',
      },
      {
        t: 'Sieb im Zulaufschlauch reinigen',
        d: 'Wasserhahn zudrehen, Schlauch am Hahn abschrauben. Gummidichtung herausziehen, Kunststoffsieb am Steg greifen, herausziehen und reinigen. In umgekehrter Reihenfolge wieder einbauen.',
        tool: 'Spitzzange',
      },
      {
        t: 'Sieb im Einlaufstutzen reinigen',
        d: 'Gerippte Kunststoffmutter an der Rückseite vorsichtig vom Zulaufstutzen schrauben, Sieb am Steg herausziehen, reinigen und wieder einbauen.',
        tool: 'Zange und Spitzzange',
        w: 'Beide Siebe müssen wieder rein. Hahn danach langsam aufdrehen und prüfen, ob die Verschraubungen dicht sind.',
      },
      {
        t: 'Wasserdruck prüfen',
        d: 'Die Maschine braucht mindestens 1 bar Fließdruck. Kommt an anderen Hähnen im Haus genug Wasser?',
      },
    ],
  },
  ablauf: {
    id: 'ablauf',
    kind: 'stoerung',
    title: 'Wasserablauf gestört',
    code: 'Wasserablauf',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Maschine ausschalten',
        d: 'Schalte die Maschine mit der Ein/Aus-Taste aus und öffne unten vorne die Klappe für die Laugenpumpe.',
        img: 'fehler',
      },
      {
        t: 'Behälter unterstellen',
        d: 'Stell ein flaches Gefäß unter die Klappe, ein Backblech reicht. Bei verstopftem Ablauf kann viel Wasser kommen.',
        w: 'Verbrühungsgefahr, wenn kurz vorher heiß gewaschen wurde.',
      },
      {
        t: 'Wasser ablassen',
        d: 'Dreh den Laugenfilter langsam auf, bis Wasser ausläuft. Zum Unterbrechen wieder zudrehen. Noch nicht ganz herausdrehen.',
      },
      {
        t: 'Laugenfilter reinigen',
        d: 'Läuft kein Wasser mehr, den Laugenfilter ganz herausdrehen und gründlich reinigen.',
        img: 'pumpe',
      },
      {
        t: 'Pumpe freimachen',
        d: 'Lässt sich der Pumpenflügel leicht drehen? Entferne Fremdkörper wie Knöpfe oder Münzen und reinige den Innenraum.',
        img: 'pumpe',
      },
      {
        t: 'Filter wieder einsetzen',
        d: 'Laugenfilter einsetzen und fest zudrehen.',
        w: 'Sitzt der Filter nicht fest, läuft Wasser aus der Maschine.',
      },
      {
        t: 'Ablaufschlauch prüfen',
        d: 'Der Schlauch muss knickfrei liegen. Die Pumpe schafft maximal 1 m Höhe.',
      },
    ],
  },
  tuer: {
    id: 'tuer',
    kind: 'stoerung',
    title: 'Tür geht nicht auf',
    code: 'Tür verriegelt',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Programm unterbrechen',
        d: 'Drück Start/Stop und wähle im Display „Abbrechen“ oder „Wäsche nachlegen“.',
      },
      {
        t: 'Abkühlen lassen',
        d: 'Steht „Komfortkühlen“ im Display, ist die Lauge über 55 °C. Warte, bis die Anzeige erlischt.',
      },
      {
        t: 'Wasser in der Trommel?',
        d: 'Pumpt die Maschine nicht ab, reinige zuerst den Laugenfilter. Danach lässt sich die Tür hinter der Pumpenklappe mit einem Schraubendreher notentriegeln.',
        tool: 'Schraubendreher',
        w: 'Nie in eine noch drehende Trommel greifen.',
        img: 'pumpe',
      },
    ],
  },
  wackelt: {
    id: 'wackelt',
    kind: 'stoerung',
    title: 'Maschine wackelt',
    code: 'Unruhiger Lauf',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Lot prüfen',
        d: 'Leg eine Wasserwaage oben auf die Maschine.',
        tool: 'Wasserwaage',
      },
      {
        t: 'Fuß ausrichten',
        d: 'Kontermutter im Uhrzeigersinn lösen und den Fuß herausdrehen, bis die Maschine gerade steht.',
        tool: 'Maulschlüssel (liegt der Maschine bei)',
      },
      {
        t: 'Füße kontern',
        d: 'Fuß mit der Zange festhalten, Kontermutter fest gegen das Gehäuse drehen. Prüf alle vier Füße.',
        tool: 'Wasserpumpenzange',
        w: 'Lose Kontermuttern lassen die Maschine wandern.',
      },
      {
        t: 'Untergrund prüfen',
        d: 'Kein weicher Bodenbelag. Bei Holzbalkendecke: Sperrholzplatte (mind. 59 × 52 × 3 cm) mit den Balken verschrauben.',
      },
    ],
  },
  nass: {
    id: 'nass',
    kind: 'stoerung',
    title: 'Wäsche noch nass',
    code: 'Schleudern reduziert',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Unwucht vermeiden',
        d: 'Bei großer Unwucht senkt die Maschine die Drehzahl selbst. Misch große und kleine Wäschestücke.',
      },
      {
        t: 'Drehzahl prüfen',
        d: 'Taste Drehzahl: Steht dort 0 U/min oder Spülstop? Baumwolle schafft bis 1600 U/min.',
      },
      {
        t: 'Nachschleudern',
        d: 'Programm „Pumpen/Schleudern“ wählen und starten.',
      },
    ],
  },
  start: {
    id: 'start',
    kind: 'stoerung',
    title: 'Maschine startet nicht',
    code: 'Display dunkel',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Strom prüfen',
        d: 'Steckt der Netzstecker? Ist die Sicherung in Ordnung?',
      },
      {
        t: 'Einschalten',
        d: 'Ohne Bedienung schaltet sich die Maschine nach 15 Minuten ab. Drück die Ein/Aus-Taste.',
      },
      {
        t: 'PIN-Code',
        d: 'Fragt das Display nach einem PIN? Der Werkscode ist 125.',
        img: 'fehler',
      },
    ],
  },
  verriegelung: {
    id: 'verriegelung',
    kind: 'stoerung',
    title: 'Türverriegelung',
    code: 'Kundendienst · Türverriegelung',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Tür neu schließen',
        d: 'Die Verriegelung ist nicht eingerastet. Schließ die Tür mit leichtem Schwung, ohne dass Wäsche im Dichtring klemmt.',
      },
      {
        t: 'Neu starten',
        d: 'Starte das Programm erneut.',
      },
    ],
  },
  entriegelung: {
    id: 'entriegelung',
    kind: 'stoerung',
    title: 'Türschloss blockiert',
    code: 'Kundendienst · Türentriegelung',
    noSelf: true,
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Nicht selbst lösbar',
        d: 'Das Türschloss ist blockiert. Das muss ein Fachbetrieb oder der Kundendienst beheben.',
        img: 'fehler',
      },
    ],
  },
  waterproof: {
    id: 'waterproof',
    kind: 'stoerung',
    title: 'Wasserschutz ausgelöst',
    code: 'Waterproof · Kundendienst',
    noSelf: true,
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Wasserhahn schließen',
        d: 'Das Wasserschutzsystem hat Wasser in der Bodenwanne erkannt und den Zulauf gesperrt. Dreh den Wasserhahn jetzt zu.',
        w: 'Maschine nicht weiter benutzen. Ein Leck im Gerät braucht einen Fachbetrieb.',
        img: 'fehler',
      },
    ],
  },
  fehlerf: {
    id: 'fehlerf',
    kind: 'stoerung',
    title: 'Defekt gemeldet',
    code: 'Kundendienst · Fehler F',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Einmal neu starten',
        d: 'Maschine aus- und wieder einschalten, Programm erneut starten. Kommt die Meldung wieder, liegt ein Defekt vor.',
        img: 'fehler',
      },
    ],
  },
  dosierung: {
    id: 'dosierung',
    kind: 'hinweis',
    title: 'Zu viel Schaum',
    code: 'Dosierung prüfen',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Weniger Waschmittel',
        d: 'Dosier beim nächsten Mal nach Packungsangabe. Bei halber Beladung etwa ein Drittel weniger.',
      },
    ],
  },
  hygiene: {
    id: 'hygiene',
    kind: 'pflege',
    title: 'Hygienewäsche',
    code: 'Hygiene-Info',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Maschine reinigen',
        d: 'Ohne Wäsche: Programm Baumwolle 75 °C mit Maschinenreiniger oder Pulver-Vollwaschmittel starten.',
      },
      {
        t: 'Einspülkasten reinigen',
        d: 'Kasten bis zum Anschlag ziehen, Entriegelungsknopf drücken, herausnehmen und mit warmem Wasser reinigen. Saugheber im Weichspülerfach mitreinigen.',
      },
    ],
  },
  einspuel: {
    id: 'einspuel',
    kind: 'stoerung',
    title: 'Reste im Einspülkasten',
    code: 'Waschmittelrückstände',
    sourceDocument: GUIDE_SOURCE,
    steps: [
      {
        t: 'Einspülkasten reinigen',
        d: 'Kasten bis zum Anschlag ziehen, Entriegelungsknopf drücken, herausnehmen und mit warmem Wasser reinigen.',
      },
      {
        t: 'Saugheber reinigen',
        d: 'Saugheber aus dem Weichspülerfach ziehen, unter warmem Wasser reinigen, das Rohr darunter auch. Wieder aufstecken.',
      },
      {
        t: 'Zulaufsieb prüfen',
        d: 'Zu wenig Wasserdruck lässt Pulver kleben. Reinige das Sieb im Wasserzulauf.',
      },
      {
        t: 'Reihenfolge beachten',
        d: 'Erst Waschmittel, dann Enthärter einfüllen.',
      },
    ],
  },
};
