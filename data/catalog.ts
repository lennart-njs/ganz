// Gerätekatalog: Modelle, für die die App Anleitungen aus der Gebrauchsanweisung kennt.
// Einstiege und Meldungen je Modell zeigen nur auf Anleitungen aus genau dieser Gebrauchsanweisung.
import { GUIDE_SOURCE } from '@/data/guides';
import { MODEL_SOURCES, type ModelGuideId } from '@/data/modelGuides';
import type { DeviceCategory } from '@/model/types';

export interface CatalogProblem {
  id: string;
  label: string;
  sub: string;
  guideId: string;
}

export interface CatalogMessage {
  guideId: string;
  code: string;
  hint: string;
}

export interface CatalogModel {
  /** Schlüssel im Katalog, z. B. „miele-g5833sc“ */
  id: string;
  manufacturerId: string;
  model: string;
  category: DeviceCategory;
  /** Gebrauchsanweisung, aus der die Anleitungen stammen */
  manual: string;
  /** Erkannt bei der Suche zusätzlich zu Hersteller und Modell */
  keywords?: string[];
  /** Fehlerbild der Intelligenten Fehlererkennung → Anleitung */
  patterns: { ablauf: string; zulauf: string };
  /** Einstiege in „Problem melden“. Ohne Angabe: die aus der Demo (nur WKB 130). */
  problems?: CatalogProblem[];
  /** Meldungen im Display. Ohne Angabe: die aus der Demo (nur WKB 130). */
  messages?: CatalogMessage[];
}

type Id = ModelGuideId;
const p = (id: string, label: string, sub: string, guideId: Id): CatalogProblem => ({
  id,
  label,
  sub,
  guideId,
});
const m = (guideId: Id, code: string, hint: string): CatalogMessage => ({ guideId, code, hint });

export const catalog: CatalogModel[] = [
  {
    id: 'miele-g5833sc',
    manufacturerId: 'miele',
    model: 'G 5833 SC',
    category: 'geschirrspueler',
    manual: MODEL_SOURCES.g5833,
    keywords: ['G 5843'],
    patterns: { ablauf: 'g5833_ablauf', zulauf: 'g5833_zulauf' },
    problems: [
      p(
        'gs_wasser',
        'Wasser bleibt stehen',
        'Unten im Spülraum, nach dem Programm',
        'g5833_ablauf',
      ),
      p('gs_sauber', 'Geschirr wird nicht sauber', 'Reste oder Beläge', 'g5833_siebe'),
      p(
        'gs_start',
        'Bedienfeld bleibt dunkel',
        'Geschirrspüler lässt sich nicht einschalten',
        'g5833_start',
      ),
    ],
    messages: [
      m('g5833_ablauf', 'Kontrollanzeige Ablauf blinkt', 'Der Geschirrspüler spült nicht weiter'),
      m('g5833_zulauf', 'Kontrollanzeige Zulauf blinkt', 'Der Geschirrspüler spült nicht weiter'),
    ],
  },
  {
    id: 'bosch-smi4eas24e',
    manufacturerId: 'bosch',
    model: 'SMI4EAS24E',
    category: 'geschirrspueler',
    manual: MODEL_SOURCES.smi4,
    keywords: ['Serie 4'],
    patterns: { ablauf: 'smi4_pumpe', zulauf: 'smi4_zulauf' },
    problems: [
      p('gs_wasser', 'Wasser bleibt stehen', 'Wasser wird nicht abgepumpt', 'smi4_pumpe'),
      p('gs_sauber', 'Speisereste auf dem Geschirr', 'Geschirr wird nicht sauber', 'smi4_siebe'),
      p('gs_led', 'Alle Anzeigen leuchten oder blinken', 'Gerät reagiert nicht', 'smi4_reset'),
    ],
    messages: [
      m('smi4_pumpe', 'E:61-02', 'Abwasserpumpe blockiert'),
      m('smi4_pumpe', 'E:61-03', 'Wasser wird nicht abgepumpt'),
      m('smi4_siebe', 'E:92-40', 'Siebe verschmutzt'),
      m('smi4_zulauf', 'E:32-00', 'Kein Wasserzulauf'),
    ],
  },
  {
    id: 'miele-wq1000wps',
    manufacturerId: 'miele',
    model: 'WQ 1000 WPS',
    category: 'waschmaschine',
    manual: MODEL_SOURCES.wq1000,
    patterns: { ablauf: 'wq1000_ablauf', zulauf: 'wq1000_zulauf' },
    problems: [
      p('wm_ablauf', 'Wasser bleibt in der Trommel', 'Maschine pumpt nicht ab', 'wq1000_ablauf'),
      p('wm_zulauf', 'Maschine zieht kein Wasser', 'Programm bricht ab', 'wq1000_zulauf'),
      p('wm_leck', 'Wasser am Laugenfilter', 'Unten vorne an der Maschine', 'wq1000_filter'),
    ],
    messages: [
      m('wq1000_ablauf', 'Fehler F11', 'Wasserablauf'),
      m('wq1000_zulauf', 'Fehler F10', 'Wasserzulauf'),
      m('wq1000_filter', 'Fehler F373', 'Undichtigkeit am Laugenfilter'),
      m('wq1000_fxxx', 'Fehler FXXX', 'Andere Fehlernummer'),
    ],
  },
  {
    // Das Gerät der ersten Demo. Einstiege und Meldungen aus Main.dc.html (de.problems, de.displayMessages).
    id: 'miele-wkb130',
    manufacturerId: 'miele',
    model: 'WKB 130',
    category: 'waschmaschine',
    manual: GUIDE_SOURCE,
    patterns: { ablauf: 'ablauf', zulauf: 'zulauf' },
  },
];

export const manufacturers: Record<string, string> = {
  miele: 'Miele',
  bosch: 'Bosch',
};

export function findModel(device: { manufacturerId: string; model: string } | undefined) {
  if (!device) return undefined;
  return catalog.find(
    (c) => c.manufacturerId === device.manufacturerId && c.model === device.model,
  );
}

/** Suche im Katalog: Hersteller, Modell, Gerätetyp und Stichworte, ohne Groß- und Kleinschreibung */
export function searchCatalog(query: string, categoryLabel: (c: DeviceCategory) => string) {
  const q = normalize(query);
  if (!q) return catalog;
  return catalog.filter((c) =>
    normalize(
      [
        manufacturers[c.manufacturerId],
        c.model,
        categoryLabel(c.category),
        ...(c.keywords ?? []),
      ].join(' '),
    ).includes(q),
  );
}

/** Für die Suche: klein, ohne Leerzeichen und Bindestriche */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-.]/g, '');
}
