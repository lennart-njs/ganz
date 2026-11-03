// Alle fiktiven Namen, Nummern und Preise an einer Stelle (Whitelabel-Light).
// Werte aus docs/ENTSCHEIDUNGEN.md. Alles Beispielwerte, nicht echt.
// Für einen anderen Pitch: Versicherer, Händler und Hersteller hier tauschen.
import type { Cents, DeviceCategory } from '@/model/types';

export interface PartnerConfig {
  id: string;
  name: string;
  /** vom Hersteller autorisiert, sonst freie Werkstatt */
  authorized: boolean;
  distanceKm: number;
  /** Kundendienst des Händlers, bei dem das Gerät gekauft wurde */
  dealerService?: boolean;
}

export interface InsurerConfig {
  id: string;
  name: string;
  shortName: string;
}

export interface DealerConfig {
  id: string;
  name: string;
  shortName: string;
  /** Standorte oder „Onlinehandel“, als Unterzeile in der Liste */
  place: string;
  /** Eigener Kundendienst des Händlers. Die Fachkraft übernimmt Videocall und Befund. */
  service?: { name: string; distanceKm: number; expert: string };
}

export const demoConfig = {
  /** Alle Werte sind Beispielwerte und werden in der App so gekennzeichnet. */
  isExample: true,

  demo: {
    /** Demo-Modus: Steuerung über die Geste im Profil, Hinweise, Beispieldaten */
    enabled: true,
    /** Schließbare Tipps im Demo-Modus. Aus für den Pitch (Entscheidung 21), an über die Demo-Steuerung. */
    hints: false,
  },

  insurer: {
    id: 'kranich',
    name: 'Kranich Versicherung',
    /** Kurzform im Fließtext: „Kranich prüft die Kosten.“ */
    shortName: 'Kranich',
  },

  /** Händler, bei dem das Demo-Gerät gekauft wurde. Name und Code sind Beispielwerte. */
  dealer: {
    id: 'haendler',
    name: '[HÄNDLER]',
    /** Händler-Code zum Verknüpfen des Schutzes */
    code: '[CODE]',
  },

  /**
   * Versicherer zur Auswahl beim Anlegen eines Geräts (Entscheidung 16). Alle erfunden.
   * Der erste ist der Versicherer aus `insurer`.
   */
  insurers: [
    { id: 'kranich', name: 'Kranich Versicherung', shortName: 'Kranich' },
    { id: 'lerche', name: 'Lerche Versicherung', shortName: 'Lerche' },
    { id: 'eichenhof', name: 'Eichenhof Assekuranz', shortName: 'Eichenhof' },
    { id: 'nordlicht', name: 'Nordlicht Versicherung', shortName: 'Nordlicht' },
    { id: 'weserland', name: 'Weserland Versicherung', shortName: 'Weserland' },
  ] satisfies InsurerConfig[],

  /**
   * Händler zur Auswahl, wenn keine Versicherung vorhanden ist (Entscheidung 16).
   * Fründ mit echtem Namen, ohne Demo-Kennzeichnung (Entscheidung 21). Alle anderen erfunden.
   * Händler mit `service` haben einen eigenen Kundendienst, der den Fall übernimmt.
   */
  dealers: [
    {
      id: 'fruend',
      name: 'Fründ Elektrogeräte AG',
      shortName: 'Fründ',
      place: 'Löhne, Bad Oeynhausen, Minden',
      service: { name: 'Fründ Kundendienst', distanceKm: 3.1, expert: 'Markus T.' },
    },
    { id: 'lindemann', name: 'Elektro Lindemann', shortName: 'Lindemann', place: 'Bielefeld' },
    { id: 'kuechenwelt', name: 'Küchenwelt Nord', shortName: 'Küchenwelt', place: 'Herford' },
    {
      id: 'technikhaus',
      name: 'Technikhaus Online',
      shortName: 'Technikhaus',
      place: 'Onlinehandel',
    },
  ] satisfies DealerConfig[],

  manufacturer: {
    id: 'miele',
    name: 'Miele',
    serviceContact: {
      label: 'Miele Kundendienst',
      phone: '0800 22 44 666',
      freeOfCharge: true,
    },
  },

  contract: {
    kind: 'garantieverlaengerung' as const,
    productName: 'Garantieverlängerung',
    number: 'KV-2023-0471',
    validFrom: '2023-03-15T00:00:00+01:00',
    validUntil: '2028-03-31T23:59:59+02:00',
    /** Selbstbeteiligung. Standard 0 €. Bei mehr als 0 € heißt der Button „Zahlungspflichtig buchen“. */
    deductible: 0 as Cents,
  },

  device: {
    category: 'waschmaschine' as DeviceCategory,
    model: 'WKB 130',
    purchaseDate: '2023-03-15T00:00:00+01:00',
    /** Was der Typenschild-Scan im Mock „erkennt“. Nummern sind erfunden. */
    typePlate: { materialNumber: '11 450 120', serialNumber: '000/94512873' },
  },

  household: {
    displayName: 'Sam',
    address: { street: 'Beispielstraße 12', zip: '32549', city: 'Bad Oeynhausen' },
  },

  partners: [
    { id: 'brandt', name: 'Hausgeräte Brandt', authorized: true, distanceKm: 2.4 },
    { id: 'neukoelln', name: 'Reparaturwerk Neukölln', authorized: false, distanceKm: 3.8 },
  ] satisfies PartnerConfig[],

  /** Anbieter hinter dem Reparatur-Assistenten (Auftragsverarbeiter). Das Modell steht in app/api/chat+api.ts. */
  assistant: {
    id: 'anthropic',
    name: 'Anthropic',
  },

  expert: {
    name: 'Jonas K.',
    partnerId: 'brandt',
  },

  prices: {
    /** Reparatur 189 € (Original-Laugenpumpe und Arbeit). Aufteilung ist eine Annahme. */
    repair: { parts: 11900 as Cents, labor: 7000 as Cents },
    replacement: 89900 as Cents,
  },

  /** Zeitfenster für die Fründ-Demo (Annahme, ANNAHMEN „Werte für Fründ“) */
  slots: ['Mo, 8–12 Uhr', 'Di, 12–16 Uhr', 'Mi, 8–12 Uhr', 'Fr, 9–13 Uhr'],

  /** Sichtbare Fallnummer. GS-24817 ist auch im Versicherer-Portal der Demo. */
  caseNumber: { prefix: 'GS-', start: 24817 },

  /** Mock-Timer für Freigabe und Betrieb. Im Demo-Modus geht es auch per Tap. */
  timers: { claimMs: 10_000, bookingStepMs: 5_000 },

  /** EU-Ökodesign: Lieferfrist für Original-Ersatzteile (echter Fakt) */
  ecoDesignDeliveryDays: 15,
} as const;

export type DemoConfig = typeof demoConfig;
