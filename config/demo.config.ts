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
    /** Feste Zeit beider Demo-Startstände (Händler und Versicherung), siehe store/demoStart.ts */
    startAt: '2026-11-02T08:00:00.000Z',
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

  /**
   * Demo-Startstand für den Händler-Weg (store/demoStart.ts): das Gerät aus dem Katalog, gekauft
   * beim ersten Händler aus `dealers`, ohne Versicherung. Das Kaufdatum ist ein Beispielwert wie
   * alle Werte hier (`isExample` oben), weniger als 24 Monate vor `demo.startAt`. Das Onboarding
   * fragt nicht danach. Die App kennzeichnet es nicht eigens, wie `device.purchaseDate`.
   * Die Prüfung im Portal rechnet mit dem echten Tag: Ab 24 Monaten schlägt sie „Kulanz“ vor.
   * __tests__/demo.test.tsx wird 60 Tage vorher rot, dann das Datum nach vorn setzen.
   */
  dealerDemo: {
    catalogId: 'miele-g5833sc',
    purchaseDate: '2025-06-14T00:00:00+02:00',
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
    /**
     * Vor-Ort-Diagnose 79 € (Anfahrt und Prüfung). Den Preis nennt der Betrieb vor dem Termin,
     * dann buchst du zahlungspflichtig oder nicht (Entscheidung Nr. 33). Beispielwert.
     */
    diagnosis: 7900 as Cents,
  },

  /**
   * Zwei gesetzliche Gewährleistungen, getrennt benannt (U11). Beide Annahmen bis zur Antwort des
   * Anwalts, Beispielwerte, keine Rechtsauskunft.
   * - repairMonths: auf eine Reparatur, ab ihrem Abschluss (ganz Nr. 32, § 634a Abs. 1 Nr. 1 BGB,
   *   Rechtsfrage 52). Liest der Store und gibt ihn an checkWarranty (model/policies/warranty.ts).
   *   Das Gespräch nennt ihn beim Hinweis zur Nachbesserung.
   * - purchaseMonths: des Händlers auf den Kauf, ab Kaufdatum (§ 438 Abs. 1 Nr. 3 BGB). Noch liest
   *   ihn nur ein Test. Ab Schritt 4.1 gibt der Aufrufer ihn als rules.purchaseWarrantyMonths an
   *   regulatorOptions (model/policies/regulator.ts). Die Prüfung im Portal nimmt die Regeln des
   *   Händlers.
   */
  warranty: { repairMonths: 24, purchaseMonths: 24, isAssumption: true },

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
