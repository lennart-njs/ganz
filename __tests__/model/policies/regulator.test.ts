// Regulierer als reine Regel (model/policies/regulator.ts, Übertragung Schritt 4)
import { demoConfig } from '@/config/demo.config';
import { CONSENT_SCOPES } from '@/model/policies/consentScopes';
import {
  DEFAULT_REGULATOR_RULES,
  REGULATOR_CONSENT,
  type RegulatorInput,
  type RegulatorOption,
  type RegulatorRules,
  regulatorOptions,
  withinPurchaseWarranty,
} from '@/model/policies/regulator';
import { addMonths } from '@/model/policies/warranty';
import type { PartnerRef, RegulatorKind } from '@/model/types';

/** Stichtag: Fall angelegt am Morgen der Demo-Woche (demo.startAt) */
const AS_OF = '2026-11-02T08:00:00.000Z';
const FRUEND: PartnerRef = { id: 'fruend', kind: 'haendler', name: 'Fründ Elektrogeräte AG' };
const KRANICH: NonNullable<RegulatorInput['contract']> = {
  id: 'vertrag-1',
  provider: { id: 'kranich', kind: 'versicherer', name: 'Kranich Versicherung' },
  validFrom: '2023-03-15T00:00:00+01:00',
  validUntil: '2028-03-31T23:59:59+02:00',
};
const MIELE_GARANTIE: NonNullable<RegulatorInput['contract']> = {
  id: 'vertrag-2',
  provider: { id: 'miele', kind: 'hersteller', name: 'Miele' },
  validFrom: '2025-03-10T00:00:00+01:00',
  validUntil: '2030-03-09T23:59:59+01:00',
};
const BOUGHT_03_2025 = '2025-03-10T00:00:00+01:00';
/** 43 Monate vor dem Stichtag, wie demoConfig.device.purchaseDate */
const BOUGHT_03_2023 = '2023-03-15T00:00:00+01:00';
const REPAIR_DUTY: RegulatorRules = {
  ...DEFAULT_REGULATOR_RULES,
  rightToRepair: ['geschirrspueler'],
};

type Shape = readonly [RegulatorOption['kind'], RegulatorOption['basis'], 'sicher' | 'pruefen'];
const SELF: Shape = ['haushalt', 'selbstzahler', 'sicher'];

function input(
  device: Partial<RegulatorInput['device']>,
  contract?: RegulatorInput['contract'],
  rules: RegulatorRules = DEFAULT_REGULATOR_RULES,
): RegulatorInput {
  return {
    device: { category: 'geschirrspueler', manufacturerId: 'miele', ...device },
    contract,
    asOf: AS_OF,
    rules,
  };
}

const shape = (o: RegulatorOption): Shape => [o.kind, o.basis, o.certainty];

describe('regulatorOptions: Tabelle aus regulierer §1.3', () => {
  test.each<[string, RegulatorInput, Shape[]]>([
    [
      'Fründ, gekauft 03/2025, ohne Versicherung: Gewährleistung sicher',
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2025 }),
      [['haendler', 'gewaehrleistung', 'sicher'], SELF],
    ],
    [
      'Fründ, Kaufdatum unbekannt, ohne Versicherung: Gewährleistung, der Händler prüft',
      input({ soldBy: FRUEND }),
      [['haendler', 'gewaehrleistung', 'pruefen'], SELF],
    ],
    [
      'Fründ, gekauft 03/2023, 43 Monate: Kulanz, der Händler prüft',
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2023 }),
      [['haendler', 'kulanz', 'pruefen'], SELF],
    ],
    [
      'Fründ und Kranich, gekauft innerhalb von 24 Monaten: erst Gewährleistung, dann Versicherung',
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2025 }, KRANICH),
      [['haendler', 'gewaehrleistung', 'sicher'], ['versicherer', 'versicherung', 'sicher'], SELF],
    ],
    [
      'Nur Kranich (Golden Path der ganz-Linie): Versicherung',
      input({ purchaseDate: BOUGHT_03_2023 }, KRANICH),
      [['versicherer', 'versicherung', 'sicher'], SELF],
    ],
    ['Kein Händler, kein Vertrag: nur Selbstzahlen', input({}), [SELF]],
    [
      'Kein Händler, kein Vertrag, Geräteart mit Reparaturpflicht: Hersteller, dann Selbstzahlen',
      input({}, undefined, REPAIR_DUTY),
      [['hersteller', 'reparaturpflicht', 'pruefen'], SELF],
    ],
  ])('%s', (_name, i, expected) => {
    expect(regulatorOptions(i).map(shape)).toEqual(expected);
  });
});

describe('regulatorOptions: Reihenfolge und Grenzen', () => {
  test.each<[string, RegulatorInput, Shape[]]>([
    [
      'Fründ und Kranich, 43 Monate: Versicherung vor Kulanz',
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2023 }, KRANICH),
      [['versicherer', 'versicherung', 'sicher'], ['haendler', 'kulanz', 'pruefen'], SELF],
    ],
    [
      'Fründ und Herstellergarantie: Gewährleistung vor Garantie',
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2025 }, MIELE_GARANTIE),
      [
        ['haendler', 'gewaehrleistung', 'sicher'],
        ['hersteller', 'herstellergarantie', 'sicher'],
        SELF,
      ],
    ],
    [
      'Vertrag abgelaufen: keine Versicherung',
      input({}, { ...KRANICH, validUntil: '2026-11-01T23:59:59+01:00' }),
      [SELF],
    ],
    [
      'Vertrag erst ab morgen: keine Versicherung',
      input({}, { ...KRANICH, validFrom: '2026-11-03T00:00:00+01:00' }),
      [SELF],
    ],
    [
      'Vertrag mit unlesbarem Ende: keine Versicherung',
      input({}, { ...KRANICH, validUntil: 'unbekannt' }),
      [SELF],
    ],
    [
      'Vertrag eines Händlers: kein Regulierer aus dem Vertrag',
      input({}, { ...KRANICH, provider: FRUEND }),
      [SELF],
    ],
    [
      'Reparaturpflicht, Gewährleistung sicher: kein Hersteller',
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2025 }, undefined, REPAIR_DUTY),
      [['haendler', 'gewaehrleistung', 'sicher'], SELF],
    ],
    [
      'Reparaturpflicht, Kaufdatum unbekannt: Hersteller nach dem Händler',
      input({ soldBy: FRUEND }, undefined, REPAIR_DUTY),
      [
        ['haendler', 'gewaehrleistung', 'pruefen'],
        ['hersteller', 'reparaturpflicht', 'pruefen'],
        SELF,
      ],
    ],
    [
      'Reparaturpflicht, 43 Monate: Kulanz vor Reparaturpflicht',
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2023 }, undefined, REPAIR_DUTY),
      [['haendler', 'kulanz', 'pruefen'], ['hersteller', 'reparaturpflicht', 'pruefen'], SELF],
    ],
    [
      'Reparaturpflicht für eine andere Geräteart: kein Hersteller',
      input({ category: 'waschmaschine' }, undefined, REPAIR_DUTY),
      [SELF],
    ],
    [
      'Unlesbares Kaufdatum zählt wie ein fehlendes',
      input({ soldBy: FRUEND, purchaseDate: 'irgendwann' }),
      [['haendler', 'gewaehrleistung', 'pruefen'], SELF],
    ],
    [
      'Gekauft bei jemandem, der kein Händler ist: kein Händler',
      input({ soldBy: { ...FRUEND, kind: 'betrieb' }, purchaseDate: BOUGHT_03_2025 }),
      [SELF],
    ],
    [
      'Frist aus den Regeln: 30 Monate nach dem Kauf, mit 24 Monaten Kulanz',
      input({ soldBy: FRUEND, purchaseDate: '2024-05-02T08:00:00.000Z' }),
      [['haendler', 'kulanz', 'pruefen'], SELF],
    ],
    [
      'Frist aus den Regeln: 30 Monate nach dem Kauf, mit 36 Monaten Gewährleistung',
      input({ soldBy: FRUEND, purchaseDate: '2024-05-02T08:00:00.000Z' }, undefined, {
        ...DEFAULT_REGULATOR_RULES,
        purchaseWarrantyMonths: 36,
      }),
      [['haendler', 'gewaehrleistung', 'sicher'], SELF],
    ],
  ])('%s', (_name, i, expected) => {
    expect(regulatorOptions(i).map(shape)).toEqual(expected);
  });

  test('Selbstzahlen steht immer am Ende, genau einmal', () => {
    const all = [
      input({}),
      input({ soldBy: FRUEND }),
      input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2023 }, KRANICH, REPAIR_DUTY),
    ];
    for (const i of all) {
      const kinds = regulatorOptions(i).map((o) => o.kind);
      expect(kinds.at(-1)).toBe('haushalt');
      expect(kinds.filter((k) => k === 'haushalt')).toHaveLength(1);
    }
  });
});

describe('regulatorOptions: Angaben je Möglichkeit', () => {
  test('Händler: Partei aus dem Gerät, Frist bis Kaufdatum plus 24 Monate, schickt selbst', () => {
    const [dealer] = regulatorOptions(input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2025 }));
    expect(dealer).toEqual({
      kind: 'haendler',
      basis: 'gewaehrleistung',
      party: { id: 'fruend', kind: 'haendler', name: 'Fründ Elektrogeräte AG' },
      certainty: 'sicher',
      until: addMonths(BOUGHT_03_2025, 24),
      arranges: true,
      needsQuote: false,
    });
  });

  test('Händler ohne Kaufdatum und mit Kulanz: kein Ende, das die App kennt', () => {
    expect(regulatorOptions(input({ soldBy: FRUEND }))[0]!.until).toBeUndefined();
    const kulanz = regulatorOptions(input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2023 }))[0]!;
    expect(kulanz.until).toBeUndefined();
    expect(kulanz.party).toEqual({
      id: 'fruend',
      kind: 'haendler',
      name: 'Fründ Elektrogeräte AG',
    });
  });

  test('Versicherer: Vertrag, Ende des Vertrags, braucht einen Kostenvoranschlag (R-02)', () => {
    const [insurer] = regulatorOptions(input({}, KRANICH));
    expect(insurer).toEqual({
      kind: 'versicherer',
      basis: 'versicherung',
      party: { id: 'kranich', kind: 'versicherer', name: 'Kranich Versicherung' },
      certainty: 'sicher',
      until: KRANICH.validUntil,
      contractId: 'vertrag-1',
      arranges: false,
      needsQuote: true,
    });
  });

  test('Hersteller mit Garantie: Vertrag, schickt selbst, ohne Kostenvoranschlag', () => {
    const [maker] = regulatorOptions(input({}, MIELE_GARANTIE));
    expect(maker).toEqual({
      kind: 'hersteller',
      basis: 'herstellergarantie',
      party: { id: 'miele', kind: 'hersteller', name: 'Miele' },
      certainty: 'sicher',
      until: MIELE_GARANTIE.validUntil,
      contractId: 'vertrag-2',
      arranges: true,
      needsQuote: false,
    });
  });

  test('Hersteller mit Reparaturpflicht: Kennung aus dem Gerät, kein Vertrag', () => {
    const [maker] = regulatorOptions(input({}, undefined, REPAIR_DUTY));
    expect(maker).toEqual({
      kind: 'hersteller',
      basis: 'reparaturpflicht',
      party: { id: 'miele', kind: 'hersteller', name: 'miele' },
      certainty: 'pruefen',
      arranges: true,
      needsQuote: false,
    });
  });

  test('Selbstzahlen: keine Partei, kein Vertrag', () => {
    expect(regulatorOptions(input({}, KRANICH)).at(-1)).toEqual({
      kind: 'haushalt',
      basis: 'selbstzahler',
      certainty: 'sicher',
      arranges: false,
      needsQuote: false,
    });
  });

  test('Die Partei ist eine Kopie, kein Verweis auf das Gerät', () => {
    const soldBy = { ...FRUEND };
    const [dealer] = regulatorOptions(input({ soldBy }));
    expect(dealer!.party).not.toBe(soldBy);
  });
});

describe('withinPurchaseWarranty: Kalendermonate', () => {
  test('bis einschließlich Kaufdatum plus Monate', () => {
    const bought = '2024-11-02T08:00:00.000Z';
    expect(withinPurchaseWarranty(bought, '2026-11-02T08:00:00.000Z', 24)).toBe(true);
    expect(withinPurchaseWarranty(bought, '2026-11-02T08:00:00.001Z', 24)).toBe(false);
    expect(withinPurchaseWarranty(bought, '2025-01-01T00:00:00.000Z', 24)).toBe(true);
  });

  test('am Monatsende der letzte Tag (29.02. plus 24 Monate ist der 28.02.)', () => {
    const bought = '2024-02-29T10:00:00.000Z';
    expect(withinPurchaseWarranty(bought, '2026-02-28T10:00:00.000Z', 24)).toBe(true);
    expect(withinPurchaseWarranty(bought, '2026-03-01T00:00:00.000Z', 24)).toBe(false);
  });

  test('nicht in Monaten zu 30,44 Tagen: 731 Tage mit Schalttag sind noch 24 Monate', () => {
    // portal/lib/check.ts rechnet heute mit 30,44 Tagen und käme hier auf 24 volle Monate
    const bought = '2023-03-15T00:00:00.000Z';
    const asOf = '2025-03-15T00:00:00.000Z';
    expect((Date.parse(asOf) - Date.parse(bought)) / 86_400_000).toBe(731);
    expect(Math.floor((Date.parse(asOf) - Date.parse(bought)) / (30.44 * 86_400_000))).toBe(24);
    expect(withinPurchaseWarranty(bought, asOf, 24)).toBe(true);
  });

  test('ohne lesbares Datum: nein, ohne Absturz', () => {
    expect(withinPurchaseWarranty('', AS_OF, 24)).toBe(false);
    expect(withinPurchaseWarranty('irgendwann', AS_OF, 24)).toBe(false);
    expect(withinPurchaseWarranty(BOUGHT_03_2025, 'irgendwann', 24)).toBe(false);
  });
});

describe('REGULATOR_CONSENT', () => {
  const kinds: RegulatorKind[] = ['versicherer', 'haendler', 'hersteller'];

  test.each(kinds)('%s: Zweck mit genau diesem Empfänger, Rechtsgrundlage Vertrag', (kind) => {
    const purpose = REGULATOR_CONSENT[kind];
    if (purpose === null) return;
    expect(CONSENT_SCOPES[purpose].recipientKind).toBe(kind);
    expect(CONSENT_SCOPES[purpose].legalBasis).toBe('vertrag');
  });

  test('je Regulierer ein eigener Zweck, für den Hersteller noch keiner (Schritt 5.4)', () => {
    expect(REGULATOR_CONSENT).toEqual({
      versicherer: 'weitergabe_versicherer',
      haendler: 'weitergabe_haendler',
      hersteller: null,
    });
    // Einwilligung für Erkenntnisse zum Produkt, keine Meldung eines Falls
    expect(Object.values(REGULATOR_CONSENT)).not.toContain('hersteller_einzelfall');
  });
});

describe('Werte der Demo', () => {
  test('Regel und Konfiguration nennen dieselbe Frist auf den Kauf', () => {
    expect(DEFAULT_REGULATOR_RULES).toEqual({ purchaseWarrantyMonths: 24, rightToRepair: [] });
    expect(demoConfig.warranty.purchaseMonths).toBe(DEFAULT_REGULATOR_RULES.purchaseWarrantyMonths);
  });

  test('zwei Gewährleistungen, getrennt benannt (U11)', () => {
    expect(Object.keys(demoConfig.warranty).sort()).toEqual([
      'isAssumption',
      'purchaseMonths',
      'repairMonths',
    ]);
    expect(demoConfig.warranty.isAssumption).toBe(true);
  });

  const rules: RegulatorRules = {
    ...DEFAULT_REGULATOR_RULES,
    purchaseWarrantyMonths: demoConfig.warranty.purchaseMonths,
  };
  const fruend = demoConfig.dealers[0]!;
  const soldBy: PartnerRef = { id: fruend.id, kind: 'haendler', name: fruend.name };

  test('Startstand Fründ (dealerDemo): Gewährleistung sicher am Demo-Tag', () => {
    const options = regulatorOptions({
      device: {
        soldBy,
        purchaseDate: demoConfig.dealerDemo.purchaseDate,
        category: 'geschirrspueler',
        manufacturerId: 'miele',
      },
      asOf: demoConfig.demo.startAt,
      rules,
    });
    expect(options.map(shape)).toEqual([['haendler', 'gewaehrleistung', 'sicher'], SELF]);
  });

  test('Gerät der ganz-Linie (03/2023) mit Fründ: 43 Monate, Kulanz', () => {
    const asOf = demoConfig.demo.startAt;
    const bought = demoConfig.device.purchaseDate;
    // Mehr als 43, weniger als 44 Monate
    expect(withinPurchaseWarranty(bought, asOf, 43)).toBe(false);
    expect(withinPurchaseWarranty(bought, asOf, 44)).toBe(true);
    const options = regulatorOptions({
      device: { soldBy, purchaseDate: bought, category: 'waschmaschine', manufacturerId: 'miele' },
      asOf,
      rules,
    });
    expect(options.map(shape)).toEqual([['haendler', 'kulanz', 'pruefen'], SELF]);
  });
});
