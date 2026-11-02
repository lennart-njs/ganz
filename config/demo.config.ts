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
}

export const demoConfig = {
  /** Alle Werte sind Beispielwerte und werden in der App so gekennzeichnet. */
  isExample: true,

  demo: {
    /** Demo-Modus: Steuerung über die Geste im Profil, Hinweise, Beispieldaten */
    enabled: true,
    /** Schließbare Tipps im Demo-Modus */
    hints: true,
  },

  insurer: {
    id: 'kranich',
    name: 'Kranich Versicherung',
    /** Kurzform im Fließtext: „Kranich prüft die Kosten.“ */
    shortName: 'Kranich',
  },

  /** Händler, bei dem das Demo-Gerät gekauft wurde. Name und Code sind Beispielwerte. */
  dealer: {
    id: 'albers',
    name: 'Elektro Albers',
    /** Händler-Code zum Verknüpfen des Schutzes */
    code: 'EA-2023',
    /** Demo-Login im Händlerportal (portal/). Kein echtes Passwort. */
    portalUser: 'demo@elektro-albers.example',
  },

  /** Beispielfälle im Händlerportal, damit es ohne Telefon etwas zeigt. Alles fiktiv. */
  portalExamples: [
    {
      caseId: 'GS-24790',
      customer: 'Robin K.',
      address: { street: 'Musterweg 3', zip: '12047', city: 'Berlin' },
      model: 'G 7100',
      category: 'geschirrspueler' as DeviceCategory,
      purchaseDate: '2025-02-10T00:00:00+01:00',
      daysAgo: 1,
    },
    {
      caseId: 'GS-24802',
      customer: 'Alex M.',
      address: { street: 'Probestraße 8', zip: '10967', city: 'Berlin' },
      model: 'WKB 130',
      category: 'waschmaschine' as DeviceCategory,
      purchaseDate: '2024-11-20T00:00:00+01:00',
      daysAgo: 3,
    },
  ],

  /** Weitere Händler zur Auswahl im Onboarding. Beispielwerte. */
  otherDealers: [{ id: 'technikhaus-nord', name: 'Technikhaus Nord' }],

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
    address: { street: 'Beispielstraße 12', zip: '12043', city: 'Berlin' },
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

  slots: ['Mo vormittags', 'Di nachmittags', 'Mi vormittags', 'Do abends'],

  /** Sichtbare Fallnummer. GS-24817 ist auch im Versicherer-Portal der Demo. */
  caseNumber: { prefix: 'GS-', start: 24817 },

  /** Mock-Timer für Freigabe und Betrieb. Im Demo-Modus geht es auch per Tap. */
  timers: { claimMs: 10_000, bookingStepMs: 5_000 },

  /** EU-Ökodesign: Lieferfrist für Original-Ersatzteile (echter Fakt) */
  ecoDesignDeliveryDays: 15,
} as const;

export type DemoConfig = typeof demoConfig;
