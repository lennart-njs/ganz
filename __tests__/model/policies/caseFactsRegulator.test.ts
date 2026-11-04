// Regulierer in den Fakten eines Falls (Übertragung 4.1): Kann der Händler die Kosten übernehmen,
// steht kein Zahler fest, bis du wählst. Selbstzahlen bleibt erlaubt. Der Versicherer-Weg bleibt,
// wie er ist: Die Tests dazu stehen unverändert in caseFacts.test.ts, actions.test.ts und
// payer.test.ts.
import { can } from '@/model/policies/actions';
import { selectCaseFacts, type CaseFactsSource } from '@/model/policies/caseFacts';
import { bookingCosts } from '@/model/policies/payer';
import { DEFAULT_REGULATOR_RULES, type RegulatorOption } from '@/model/policies/regulator';
import type { Booking, Case, Claim, Contract, Device, PartnerRef, Quote } from '@/model/types';

const NOW = '2026-11-03T10:00:00+01:00';
const PERSON = 'person-1';
const FRUEND: PartnerRef = { id: 'fruend', kind: 'haendler', name: 'Fründ Elektrogeräte AG' };
const KRANICH: Contract = {
  id: 'vertrag-1',
  householdId: 'haushalt-1',
  provider: { id: 'kranich', kind: 'versicherer', name: 'Kranich Versicherung' },
  kind: 'geraeteversicherung',
  productName: 'Geräteschutz',
  contractNumber: 'KR-1',
  validFrom: '2023-03-15T00:00:00+01:00',
  validUntil: '2028-03-31T23:59:59+02:00',
  policyholderId: PERSON,
  deductible: 5000,
  coveredDeviceIds: ['geraet-1'],
  linkedVia: 'vertragsnummer',
  linkedAt: NOW,
};

function makeCase(extra: Partial<Case> = {}): Case {
  return {
    id: 'GS-1',
    householdId: 'haushalt-1',
    deviceId: 'geraet-1',
    reportedBy: PERSON,
    status: 'eskaliert',
    entry: 'symptom',
    problemLabel: 'Wasser bleibt im Spülraum',
    diagnosisIds: [],
    guideRunIds: [],
    photoIds: [],
    quoteId: 'angebot-1',
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
  };
}

function makeDevice(extra: Partial<Device> = {}): Device {
  return {
    id: 'geraet-1',
    householdId: 'haushalt-1',
    manufacturerId: 'miele',
    category: 'geschirrspueler',
    model: 'G 5833 SC',
    identifiedBy: 'katalog',
    createdAt: NOW,
    ...extra,
  };
}

const quote: Quote = {
  id: 'angebot-1',
  caseId: 'GS-1',
  createdBy: { kind: 'fachkraft', name: 'Fachkraft' },
  repair: { originalPart: true, parts: 11900, labor: 7000, total: 18900 },
  replacement: { total: 89900, note: '' },
  saving: 71000,
  payer: { kind: 'haushalt', name: 'Sam' },
  deductible: 0,
  isExample: true,
  createdAt: NOW,
};

const claim = (result?: 'freigegeben' | 'abgelehnt'): Claim => ({
  contractId: KRANICH.id,
  reportedAt: NOW,
  reportedBy: PERSON,
  confirmationId: 'consent-v',
  decision: result ? { result, at: NOW, actor: 'mensch' } : undefined,
});

function repair(extra: Partial<Booking> = {}): Booking {
  return {
    id: 't-1',
    caseId: 'GS-1',
    kind: 'reparatur',
    provider: {
      id: 'fruend-kundendienst',
      kind: 'betrieb',
      name: 'Kundendienst',
      authorized: false,
    },
    slotLabel: 'Mo, 8–12 Uhr',
    status: 'angefragt',
    subjectToApproval: false,
    createdAt: NOW,
    ...extra,
  };
}

function factsOf(c: Case, device: Device, extra: Partial<CaseFactsSource> = {}) {
  const s: CaseFactsSource = {
    cases: { [c.id]: c },
    devices: [device],
    contracts: device.contractId ? [KRANICH] : [],
    quotes: [quote],
    bookings: [],
    videoSessions: [],
    consents: [],
    guideRuns: {},
    diagnoses: [],
    ...extra,
  };
  return selectCaseFacts(s, c.id)!;
}

type Shape = readonly [RegulatorOption['kind'], RegulatorOption['basis'], 'sicher' | 'pruefen'];
const shape = (o: RegulatorOption): Shape => [o.kind, o.basis, o.certainty];
const SELF: Shape = ['haushalt', 'selbstzahler', 'sicher'];

const fruendDevice = makeDevice({ soldBy: FRUEND });

describe('Händler-Gerät ohne Schutz mit Kostenvoranschlag (Übertragung 4.1)', () => {
  const f = factsOf(makeCase(), fruendDevice);

  test('der Händler kann die Kosten übernehmen, der Zahler steht noch nicht fest', () => {
    expect(f.regulators?.map(shape)).toEqual([['haendler', 'gewaehrleistung', 'pruefen'], SELF]);
    expect(f.regulator).toMatchObject({ kind: 'haendler', party: FRUEND, arranges: true });
    expect(f.payer).toBeUndefined();
    expect(f.hasContract).toBe(false);
  });

  test('Selbstzahlen und der Termin dazu bleiben erlaubt, der Fall kann an den Händler', () => {
    expect(can(f, 'selbst_zahlen')).toBe(true);
    expect(can(f, 'termin_selbst')).toBe(true);
    expect(can(f, 'an_haendler_senden')).toBe(true);
    expect(can(f, 'schaden_melden')).toBe(false);
    expect(can(f, 'termin_versicherer')).toBe(false);
  });

  test('„Du zahlst“ gibt es erst mit der Wahl „selbst zahlen“, dann mit dem Preis', () => {
    expect(bookingCosts(f, 'reparatur', false, 0)).toBeUndefined();
    expect(bookingCosts(f, 'reparatur', true, 0)).toEqual({ payer: 'haushalt', amount: 18900 });
  });

  test('nach der Buchung als Selbstzahler zahlt der Haushalt', () => {
    const booked = factsOf(makeCase({ status: 'in_reparatur' }), fruendDevice, {
      bookings: [repair({ status: 'bestaetigt' })],
    });
    expect(booked.regulator?.kind).toBe('haendler');
    expect(booked.payer).toBe('haushalt');
  });

  test('ohne Kostenvoranschlag kein Zahler, wie ohne Händler', () => {
    expect(factsOf(makeCase({ quoteId: undefined }), fruendDevice).payer).toBeUndefined();
  });
});

describe('Ohne Händler bleibt alles, wie es war', () => {
  test('ohne Schutz und ohne Händler zahlt der Haushalt', () => {
    const f = factsOf(makeCase(), makeDevice());
    expect(f.regulators?.map(shape)).toEqual([SELF]);
    expect(f.regulator).toBeUndefined();
    expect(f.payer).toBe('haushalt');
  });

  test('ohne Gerät: keine Möglichkeiten, kein Regulierer', () => {
    const f = factsOf(makeCase({ deviceId: 'geraet-weg' }), makeDevice());
    expect(f.regulators).toEqual([]);
    expect(f.regulator).toBeUndefined();
    expect(f.payer).toBe('haushalt');
  });

  test('mit Kranich: der Versicherer, Zahler wie bisher', () => {
    const insured = makeDevice({ contractId: KRANICH.id });
    const before = factsOf(makeCase(), insured);
    expect(before.regulators?.map(shape)).toEqual([
      ['versicherer', 'versicherung', 'sicher'],
      SELF,
    ]);
    expect(before.regulator).toMatchObject({ kind: 'versicherer', contractId: KRANICH.id });
    expect(before.payer).toBeUndefined();
    const reviewing = factsOf(makeCase({ status: 'freigabe_noetig', claim: claim() }), insured);
    expect(reviewing.regulator?.kind).toBe('versicherer');
    expect(reviewing.payer).toBeUndefined();
    const approved = factsOf(
      makeCase({ status: 'freigegeben', claim: claim('freigegeben') }),
      insured,
    );
    expect(approved.payer).toBe('versicherer');
  });

  test('Vertrag ohne gültige Daten: kein Regulierer, der Zahler bleibt offen wie bisher', () => {
    const insured = makeDevice({ contractId: KRANICH.id });
    const f = factsOf(makeCase(), insured, {
      contracts: [{ ...KRANICH, validUntil: '2024-01-01T00:00:00+01:00' }],
    });
    expect(f.regulators?.map(shape)).toEqual([SELF]);
    expect(f.regulator).toBeUndefined();
    expect(f.hasContract).toBe(true);
    expect(f.payer).toBeUndefined();
  });
});

describe('Händler und Versicherer zugleich (U10)', () => {
  const both = makeDevice({ soldBy: FRUEND, contractId: KRANICH.id });

  test('die Fakten nehmen den Händler zuerst, der Zahler bleibt offen wie mit Schutz', () => {
    const f = factsOf(makeCase(), both);
    expect(f.regulators?.map(shape)).toEqual([
      ['haendler', 'gewaehrleistung', 'pruefen'],
      ['versicherer', 'versicherung', 'sicher'],
      SELF,
    ]);
    expect(f.regulator?.kind).toBe('haendler');
    expect(f.payer).toBeUndefined();
    // Gemeldet wird wie bisher an den Versicherer
    expect(can(f, 'schaden_melden')).toBe(true);
  });

  test('mit Schadenfall ist der Regulierer der Versicherer des Vertrags', () => {
    const f = factsOf(makeCase({ status: 'freigabe_noetig', claim: claim() }), both);
    expect(f.regulator).toMatchObject({ kind: 'versicherer', contractId: KRANICH.id });
  });
});

describe('Kaufdatum und Regeln', () => {
  test('Kauf 03/2025: Gewährleistung sicher, 03/2023: Kulanz', () => {
    const recent = factsOf(makeCase(), makeDevice({ soldBy: FRUEND, purchaseDate: '2025-03-10' }));
    expect(recent.regulator).toMatchObject({ basis: 'gewaehrleistung', certainty: 'sicher' });
    const old = makeDevice({ soldBy: FRUEND, purchaseDate: '2023-03-15T00:00:00+01:00' });
    expect(factsOf(makeCase(), old).regulator).toMatchObject({
      basis: 'kulanz',
      certainty: 'pruefen',
    });
    // Auch mit Kulanz steht kein Zahler fest, bis du wählst
    expect(factsOf(makeCase(), old).payer).toBeUndefined();
  });

  test('der Stichtag ist der Tag, an dem der Fall angelegt wurde', () => {
    const device = makeDevice({ soldBy: FRUEND, purchaseDate: '2024-11-03T12:00:00+01:00' });
    expect(
      factsOf(makeCase({ createdAt: '2026-11-03T20:00:00+01:00' }), device).regulator?.basis,
    ).toBe('gewaehrleistung');
    expect(
      factsOf(makeCase({ createdAt: '2026-11-04T08:00:00+01:00' }), device).regulator?.basis,
    ).toBe('kulanz');
  });

  test('Kaufdatum aus einem kaputten Speicher: Fakten ohne Absturz, der Händler prüft', () => {
    for (const purchaseDate of [
      '+275759-01-01T00:00:00.000Z',
      '-271821-04-20T00:00:00.000Z',
      '0050-06-01T00:00:00.000Z',
    ]) {
      const f = factsOf(makeCase(), makeDevice({ soldBy: FRUEND, purchaseDate }));
      expect(f.regulator).toMatchObject({ basis: 'gewaehrleistung', certainty: 'pruefen' });
      expect(f.regulator?.until).toBeUndefined();
      expect(f.payer).toBeUndefined();
      expect(can(f, 'selbst_zahlen')).toBe(true);
    }
  });

  test('Regeln aus der Quelle gelten, sonst DEFAULT_REGULATOR_RULES', () => {
    const old = makeDevice({ soldBy: FRUEND, purchaseDate: '2023-03-15T00:00:00+01:00' });
    const rules = { ...DEFAULT_REGULATOR_RULES, purchaseWarrantyMonths: 48 };
    expect(factsOf(makeCase(), old, { rules }).regulator?.basis).toBe('gewaehrleistung');
  });
});
