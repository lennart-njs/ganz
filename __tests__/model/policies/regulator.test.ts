// Regulierer als reine Regel (model/policies/regulator.ts, Übertragung Schritt 4)
import { demoConfig } from '@/config/demo.config';
import { CONSENT_SCOPES } from '@/model/policies/consentScopes';
import {
  DEFAULT_REGULATOR_RULES,
  REGULATOR_CONSENT,
  type RegulatorInput,
  type RegulatorOption,
  type RegulatorRules,
  purchaseWarrantyUntil,
  regulatorOptions,
  withinPurchaseWarranty,
} from '@/model/policies/regulator';
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

/** Tag in Berlin, unabhängig von der Zeitzone, in der der Test läuft */
const berlinDate = (iso: string) =>
  new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));

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
      'Kauf am 01.03. um Mitternacht Ortszeit, Stichtag 29.02. im Schaltjahr: Gewährleistung sicher',
      {
        ...input({ soldBy: FRUEND, purchaseDate: '2022-03-01T00:00:00+01:00' }),
        asOf: '2024-02-29T12:00:00+01:00',
      },
      [['haendler', 'gewaehrleistung', 'sicher'], SELF],
    ],
    [
      'Jahrestag des Kaufs um 10 Uhr: Gewährleistung sicher',
      {
        ...input({ soldBy: FRUEND, purchaseDate: '2025-06-14T00:00:00+02:00' }),
        asOf: '2027-06-14T10:00:00+02:00',
      },
      [['haendler', 'gewaehrleistung', 'sicher'], SELF],
    ],
    [
      'Tag nach dem Jahrestag des Kaufs: Kulanz',
      {
        ...input({ soldBy: FRUEND, purchaseDate: '2025-06-14T00:00:00+02:00' }),
        asOf: '2027-06-15T00:00:00+02:00',
      },
      [['haendler', 'kulanz', 'pruefen'], SELF],
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
  test('Händler: Partei aus dem Gerät, Frist bis Ende des Kauftags plus 24 Monate, schickt selbst', () => {
    const [dealer] = regulatorOptions(input({ soldBy: FRUEND, purchaseDate: BOUGHT_03_2025 }));
    expect(dealer).toEqual({
      kind: 'haendler',
      basis: 'gewaehrleistung',
      party: { id: 'fruend', kind: 'haendler', name: 'Fründ Elektrogeräte AG' },
      certainty: 'sicher',
      // 10.03.2027, 23:59:59,999 Uhr in Berlin (Winterzeit)
      until: '2027-03-10T22:59:59.999Z',
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

describe('withinPurchaseWarranty: Kalendermonate, Kalendertage in Berlin', () => {
  test('bis zum Ende des Tages, der dem Kauftag entspricht (§ 188 Abs. 2 BGB), nicht zur Uhrzeit', () => {
    // 02.11.2024, 9 Uhr in Berlin
    const bought = '2024-11-02T08:00:00.000Z';
    expect(purchaseWarrantyUntil(bought, 24)).toBe('2026-11-02T22:59:59.999Z');
    expect(withinPurchaseWarranty(bought, '2026-11-02T08:00:00.001Z', 24)).toBe(true);
    expect(withinPurchaseWarranty(bought, '2026-11-02T22:59:59.999Z', 24)).toBe(true);
    expect(withinPurchaseWarranty(bought, '2026-11-02T23:00:00.000Z', 24)).toBe(false);
    expect(withinPurchaseWarranty(bought, '2025-01-01T00:00:00.000Z', 24)).toBe(true);
  });

  test('am Monatsende der letzte Tag (29.02. plus 24 Monate ist der 28.02.)', () => {
    const bought = '2024-02-29T10:00:00.000Z';
    expect(purchaseWarrantyUntil(bought, 24)).toBe('2026-02-28T22:59:59.999Z');
    expect(withinPurchaseWarranty(bought, '2026-02-28T22:59:59.999Z', 24)).toBe(true);
    expect(withinPurchaseWarranty(bought, '2026-02-28T23:00:00.000Z', 24)).toBe(false);
    expect(withinPurchaseWarranty(bought, '2026-03-01T00:00:00.000Z', 24)).toBe(false);
    expect(purchaseWarrantyUntil('2025-01-31T12:00:00+01:00', 1)).toBe('2025-02-28T22:59:59.999Z');
  });

  test('Kauf am 01.03. mit Ortszeit: im Schaltjahr endet die Frist am 01.03., nicht am 29.02.', () => {
    const bought = '2022-03-01T00:00:00+01:00';
    expect(purchaseWarrantyUntil(bought, 24)).toBe('2024-03-01T22:59:59.999Z');
    expect(withinPurchaseWarranty(bought, '2024-02-29T12:00:00+01:00', 24)).toBe(true);
    expect(withinPurchaseWarranty(bought, '2024-03-01T23:59:59+01:00', 24)).toBe(true);
    expect(withinPurchaseWarranty(bought, '2024-03-02T00:00:00+01:00', 24)).toBe(false);
  });

  test('der Kauftag ist der Tag in Berlin, gleich in welcher Zeitzone gespeichert', () => {
    const until = '2027-06-14T21:59:59.999Z';
    expect(purchaseWarrantyUntil('2025-06-14T00:00:00+02:00', 24)).toBe(until);
    // 14.06.2025, 0:30 Uhr in Berlin, in UTC noch der 13.06.
    expect(purchaseWarrantyUntil('2025-06-13T22:30:00.000Z', 24)).toBe(until);
    expect(purchaseWarrantyUntil('2025-06-14T23:59:59+02:00', 24)).toBe(until);
    expect(purchaseWarrantyUntil('2025-06-14', 24)).toBe(until);
  });

  test('Ende an Tagen um die Zeitumstellung, als letzter Augenblick des Tages in Berlin', () => {
    // 28.03.2027 und 31.10.2027 sind die Tage der Umstellung
    expect(purchaseWarrantyUntil('2025-03-27T12:00:00+01:00', 24)).toBe('2027-03-27T22:59:59.999Z');
    expect(purchaseWarrantyUntil('2025-03-28T12:00:00+01:00', 24)).toBe('2027-03-28T21:59:59.999Z');
    expect(purchaseWarrantyUntil('2025-10-30T12:00:00+01:00', 24)).toBe('2027-10-30T21:59:59.999Z');
    expect(purchaseWarrantyUntil('2025-10-31T12:00:00+01:00', 24)).toBe('2027-10-31T22:59:59.999Z');
    for (const iso of ['2027-03-27T22:59:59.999Z', '2027-10-31T22:59:59.999Z']) {
      expect(berlinDate(iso)).not.toBe(berlinDate(new Date(Date.parse(iso) + 1).toISOString()));
    }
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
    expect(purchaseWarrantyUntil('', 24)).toBeUndefined();
    expect(purchaseWarrantyUntil('irgendwann', 24)).toBeUndefined();
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

  const dealerDevice: RegulatorInput['device'] = {
    soldBy,
    purchaseDate: demoConfig.dealerDemo.purchaseDate,
    category: 'geschirrspueler',
    manufacturerId: 'miele',
  };

  test('Startstand Fründ (dealerDemo): Gewährleistung sicher am Demo-Tag', () => {
    const options = regulatorOptions({
      device: dealerDevice,
      asOf: demoConfig.demo.startAt,
      rules,
    });
    expect(options.map(shape)).toEqual([['haendler', 'gewaehrleistung', 'sicher'], SELF]);
  });

  test('Startstand Fründ: Ende und Einstufung passen zusammen, auch am letzten Tag', () => {
    const dayBefore = regulatorOptions({
      device: dealerDevice,
      asOf: '2027-06-13T10:00:00+02:00',
      rules,
    })[0]!;
    expect(berlinDate(dayBefore.until!)).toBe('14.06.2027');
    const lastDay = regulatorOptions({
      device: dealerDevice,
      asOf: '2027-06-14T23:59:00+02:00',
      rules,
    });
    expect(lastDay.map(shape)).toEqual([['haendler', 'gewaehrleistung', 'sicher'], SELF]);
    expect(lastDay[0]!.until).toBe(dayBefore.until);
    const dayAfter = regulatorOptions({
      device: dealerDevice,
      asOf: '2027-06-15T00:00:00+02:00',
      rules,
    });
    expect(dayAfter.map(shape)).toEqual([['haendler', 'kulanz', 'pruefen'], SELF]);
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
