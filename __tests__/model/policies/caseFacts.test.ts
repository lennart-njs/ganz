import fs from 'fs';
import path from 'path';

import { selectCaseFacts, type CaseFactsSource } from '@/model/policies/caseFacts';
import { closeRound } from '@/model/policies/rounds';
import type {
  Booking,
  Case,
  Claim,
  Consent,
  Diagnosis,
  GuideRun,
  Quote,
  VideoSession,
} from '@/model/types';

const NOW = '2026-11-03T10:00:00+01:00';
const PERSON = 'person-1';

function makeCase(extra: Partial<Case> = {}): Case {
  return {
    id: 'GS-1',
    householdId: 'haushalt-1',
    deviceId: 'geraet-1',
    reportedBy: PERSON,
    status: 'eskaliert',
    entry: 'foto',
    problemLabel: 'Wasserablauf',
    diagnosisIds: [],
    guideRunIds: [],
    photoIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
  };
}

const claim = (result?: 'freigegeben' | 'abgelehnt'): Claim => ({
  contractId: 'vertrag-1',
  reportedAt: NOW,
  reportedBy: PERSON,
  confirmationId: 'consent-v',
  decision: result ? { result, at: NOW, actor: 'mensch' } : undefined,
});

function booking(id: string, extra: Partial<Booking> = {}): Booking {
  return {
    id,
    caseId: 'GS-1',
    kind: 'reparatur',
    provider: { id: 'betrieb-1', kind: 'betrieb', name: 'Betrieb', authorized: true },
    slotLabel: 'Mo vormittags',
    status: 'angefragt',
    subjectToApproval: false,
    createdAt: NOW,
    ...extra,
  };
}

function consent(purpose: Consent['purpose'], extra: Partial<Consent> = {}): Consent {
  return {
    id: `consent-${purpose}`,
    personId: PERSON,
    caseId: 'GS-1',
    purpose,
    legalBasis: 'vertrag',
    recipient: { id: 'betrieb-1', kind: 'betrieb', name: 'Betrieb' },
    dataCategories: [],
    textVersion: '1',
    grantedAt: NOW,
    ...extra,
  };
}

const quote: Quote = {
  id: 'angebot-1',
  caseId: 'GS-1',
  createdBy: { kind: 'fachkraft', name: 'Fachkraft' },
  repair: { originalPart: true, parts: 9000, labor: 9900, total: 18900 },
  replacement: { total: 89900, note: '' },
  saving: 71000,
  payer: { kind: 'versicherer', name: 'Versicherer' },
  deductible: 0,
  isExample: true,
  createdAt: NOW,
};

function source(c: Case, extra: Partial<CaseFactsSource> = {}): CaseFactsSource {
  return {
    cases: { [c.id]: c },
    devices: [
      {
        id: 'geraet-1',
        householdId: 'haushalt-1',
        manufacturerId: 'miele',
        category: 'waschmaschine',
        model: 'WKB 130',
        contractId: 'vertrag-1',
        identifiedBy: 'vertrag',
        createdAt: NOW,
      },
    ],
    contracts: [{ id: 'vertrag-1' } as CaseFactsSource['contracts'][number]],
    quotes: [quote],
    bookings: [],
    videoSessions: [],
    consents: [],
    guideRuns: {},
    diagnoses: [],
    ...extra,
  };
}

const factsOf = (c: Case, extra: Partial<CaseFactsSource> = {}) =>
  selectCaseFacts(source(c, extra), c.id)!;

describe('selectCaseFacts', () => {
  test('ohne Fall: keine Fakten', () => {
    expect(selectCaseFacts(source(makeCase()), 'GS-99999')).toBeUndefined();
  });

  test('Status, Schutz, Kostenvoranschlag, Pause', () => {
    const f = factsOf(makeCase({ quoteId: quote.id, pausedAt: NOW }));
    expect(f).toMatchObject({
      caseId: 'GS-1',
      status: 'eskaliert',
      closed: false,
      paused: true,
      hasContract: true,
      quote,
    });
    expect(factsOf(makeCase({ status: 'erledigt' })).closed).toBe(true);
    expect(factsOf(makeCase(), { contracts: [] }).hasContract).toBe(false);
  });

  test('anderer offener Fall desselben Geräts', () => {
    const done = makeCase({ status: 'erledigt' });
    const other = { ...makeCase(), id: 'GS-2' };
    const elsewhere = { ...makeCase(), id: 'GS-3', deviceId: 'geraet-2' };
    const closed = { ...makeCase({ status: 'abgebrochen' }), id: 'GS-4' };
    const cases = (...list: Case[]) => Object.fromEntries(list.map((c) => [c.id, c]));
    expect(factsOf(done, { cases: cases(done, other) }).otherOpenCase).toBe('GS-2');
    expect(factsOf(done, { cases: cases(done, elsewhere, closed) }).otherOpenCase).toBeUndefined();
  });

  test('Schadenfall: keiner, in Prüfung, freigegeben, abgelehnt', () => {
    expect(factsOf(makeCase()).claim).toBe('keiner');
    expect(factsOf(makeCase({ status: 'freigabe_noetig', claim: claim() })).claim).toBe(
      'in_pruefung',
    );
    expect(factsOf(makeCase({ status: 'freigegeben', claim: claim('freigegeben') })).claim).toBe(
      'freigegeben',
    );
    expect(factsOf(makeCase({ status: 'abgelehnt', claim: claim('abgelehnt') })).claim).toBe(
      'abgelehnt',
    );
  });

  test('Zahler: steht während der Prüfung nicht fest', () => {
    const withQuote = { quoteId: quote.id };
    expect(factsOf(makeCase(withQuote)).payer).toBeUndefined();
    expect(
      factsOf(makeCase({ ...withQuote, status: 'freigabe_noetig', claim: claim() })).payer,
    ).toBe(undefined);
    expect(
      factsOf(makeCase({ ...withQuote, status: 'freigegeben', claim: claim('freigegeben') })).payer,
    ).toBe('versicherer');
    expect(
      factsOf(makeCase({ ...withQuote, status: 'abgelehnt', claim: claim('abgelehnt') })).payer,
    ).toBeUndefined();
    // Ohne Schutz zahlt der Haushalt, nach selbst_zahlen auch mit Schutz
    expect(factsOf(makeCase(withQuote), { contracts: [] }).payer).toBe('haushalt');
    expect(
      factsOf(makeCase({ ...withQuote, status: 'in_reparatur' }), { bookings: [booking('t-1')] })
        .payer,
    ).toBe('haushalt');
  });

  test('Termine: neuester je Art, ohne stornierte', () => {
    const f = factsOf(makeCase(), {
      bookings: [
        booking('t-1', { status: 'storniert' }),
        booking('t-2', { kind: 'vor_ort_diagnose', status: 'erledigt' }),
        booking('t-3'),
        booking('t-4', { status: 'storniert' }),
        booking('t-5', { caseId: 'GS-2' }),
      ],
    });
    expect(f.bookings.reparatur?.id).toBe('t-3');
    expect(f.bookings.vor_ort_diagnose?.id).toBe('t-2');
    expect(f.bookings.ersatzteil_versand).toBeUndefined();
    expect(f.booking?.id).toBe('t-3');
    expect(f.bookingOpen).toBe(true);
  });

  test('ein Termin vorbehaltlich Freigabe verfällt mit der Ablehnung', () => {
    const pending = booking('t-1', { subjectToApproval: true });
    const rejected = makeCase({ status: 'abgelehnt', claim: claim('abgelehnt') });
    expect(factsOf(rejected, { bookings: [pending] }).bookings.reparatur).toBeUndefined();
    expect(factsOf(rejected, { bookings: [pending] }).booking).toBeUndefined();
    // Während der Prüfung und nach der Freigabe zählt er
    const inReview = makeCase({ status: 'freigabe_noetig', claim: claim() });
    expect(factsOf(inReview, { bookings: [pending] }).bookings.reparatur?.id).toBe('t-1');
    // Ein bestätigter Termin verfällt nicht
    const confirmed = booking('t-2', { subjectToApproval: true, status: 'bestaetigt' });
    expect(factsOf(rejected, { bookings: [confirmed] }).bookings.reparatur?.id).toBe('t-2');
  });

  test('Selbstbeteiligung aus dem Vertrag des Geräts, ohne Schutz 0', () => {
    const contract = { id: 'vertrag-1', deductible: 5000 } as CaseFactsSource['contracts'][number];
    expect(factsOf(makeCase(), { contracts: [contract] }).deductible).toBe(5000);
    expect(factsOf(makeCase(), { contracts: [] }).deductible).toBe(0);
  });

  describe('Termin wartet auf „Zahlungspflichtig buchen“ (Entscheidung Nr. 31)', () => {
    const contract = (deductible: number) => [
      { id: 'vertrag-1', deductible } as CaseFactsSource['contracts'][number],
    ];
    const pending = booking('t-1', { subjectToApproval: true });
    const approved = makeCase({ status: 'freigegeben', claim: claim('freigegeben') });

    test('nach der Freigabe mit Selbstbeteiligung über 0 €: ja, mit diesem Betrag', () => {
      expect(
        factsOf(approved, { contracts: contract(5000), bookings: [pending] }).bindingDue,
      ).toEqual({ booking: pending, amount: 5000, reason: 'selbstbeteiligung' });
    });

    test('mit 0 €, während der Prüfung, nach der Ablehnung und ohne Termin: nein', () => {
      expect(factsOf(approved, { contracts: contract(0), bookings: [pending] }).bindingDue).toBe(
        undefined,
      );
      const reviewing = makeCase({ status: 'freigabe_noetig', claim: claim() });
      expect(
        factsOf(reviewing, { contracts: contract(5000), bookings: [pending] }).bindingDue,
      ).toBeUndefined();
      const rejected = makeCase({ status: 'abgelehnt', claim: claim('abgelehnt') });
      expect(
        factsOf(rejected, { contracts: contract(5000), bookings: [pending] }).bindingDue,
      ).toBeUndefined();
      expect(factsOf(approved, { contracts: contract(5000) }).bindingDue).toBeUndefined();
    });

    test('schon verbindlich gebucht, bestätigt oder storniert: nein', () => {
      for (const b of [
        booking('t-1', { subjectToApproval: true, binding: { at: NOW, amount: 5000 } }),
        booking('t-1', { subjectToApproval: true, status: 'bestaetigt' }),
        booking('t-1', { subjectToApproval: true, status: 'storniert' }),
      ]) {
        expect(factsOf(approved, { contracts: contract(5000), bookings: [b] }).bindingDue).toBe(
          undefined,
        );
      }
    });

    test('Vor-Ort-Diagnose (Nr. 33): erst mit dem Preis des Betriebs, nur nach „Hilfe holen“', () => {
      const visit = (extra: Partial<Booking> = {}) =>
        booking('t-2', { kind: 'vor_ort_diagnose', ...extra });
      const escalated = makeCase();
      expect(factsOf(escalated, { bookings: [visit()] }).bindingDue).toBeUndefined();
      expect(factsOf(escalated, { bookings: [visit({ price: 0 })] }).bindingDue).toBeUndefined();
      const named = visit({ price: 7900 });
      expect(factsOf(escalated, { bookings: [named] }).bindingDue).toEqual({
        booking: named,
        amount: 7900,
        reason: 'preis',
      });
      // Ohne Schutz genauso: Den Besuch zahlt der Haushalt
      expect(factsOf(escalated, { bookings: [named], contracts: [] }).bindingDue?.amount).toBe(
        7900,
      );
      const bound = visit({ price: 7900, binding: { at: NOW, amount: 7900 } });
      expect(factsOf(escalated, { bookings: [bound] }).bindingDue).toBeUndefined();
      const declined = visit({ price: 7900, status: 'storniert' });
      expect(factsOf(escalated, { bookings: [declined] }).bindingDue).toBeUndefined();
      const reviewing = makeCase({ status: 'freigabe_noetig', claim: claim() });
      expect(factsOf(reviewing, { bookings: [named] }).bindingDue).toBeUndefined();
    });

    test('ein geschlossener Fall wartet auf nichts', () => {
      for (const status of ['erledigt', 'abgebrochen'] as const) {
        const closed = makeCase({ status, claim: claim('freigegeben') });
        expect(
          factsOf(closed, { contracts: contract(5000), bookings: [pending] }).bindingDue,
        ).toBeUndefined();
      }
    });
  });

  test('gültige Bestätigungen: für diesen Fall oder ohne Fall, nicht widerrufen', () => {
    const f = factsOf(makeCase(), {
      consents: [
        consent('weitergabe_fachkraft'),
        consent('weitergabe_fachkraft', { id: 'c-2' }),
        consent('weitergabe_versicherer', { revokedAt: NOW }),
        consent('weitergabe_betrieb', { caseId: 'GS-2' }),
        consent('mitteilungen', { caseId: undefined, legalBasis: 'einwilligung' }),
        consent('screenshots_im_call', { personId: 'person-2' }),
      ],
    });
    expect(f.activeConsents).toEqual(['weitergabe_fachkraft', 'mitteilungen']);
  });

  test('Widerruf hält die Simulation an (R-12)', () => {
    const review = makeCase({ status: 'freigabe_noetig', claim: claim() });
    expect(factsOf(review).hold).toBe('weitergabe_versicherer');
    expect(factsOf(review, { consents: [consent('weitergabe_versicherer')] }).hold).toBeUndefined();

    const approved = makeCase({ status: 'freigegeben', claim: claim('freigegeben') });
    const b = booking('t-1', { subjectToApproval: true });
    expect(factsOf(approved, { bookings: [b] }).hold).toBe('weitergabe_betrieb');
    // Nur die Bestätigung für genau den gebuchten Betrieb zählt
    const other = consent('weitergabe_betrieb', {
      recipient: { id: 'betrieb-2', kind: 'betrieb', name: 'Anderer Betrieb' },
    });
    expect(factsOf(approved, { bookings: [b], consents: [other] }).hold).toBe('weitergabe_betrieb');
    expect(
      factsOf(approved, { bookings: [b], consents: [consent('weitergabe_betrieb')] }).hold,
    ).toBeUndefined();
    // Ohne laufenden Termin und im geschlossenen Fall hält nichts an
    expect(factsOf(approved).hold).toBeUndefined();
    expect(
      factsOf(makeCase({ status: 'erledigt' }), {
        bookings: [booking('t-2', { status: 'erledigt' })],
      }).hold,
    ).toBeUndefined();
  });

  test('Anleitung: läuft nur, wenn die neueste nicht beendet ist', () => {
    const run = (id: string, extra: Partial<GuideRun> = {}): GuideRun => ({
      id,
      caseId: 'GS-1',
      guideId: 'ablauf',
      startedAt: NOW,
      currentStep: 2,
      completedSteps: [0, 1],
      ...extra,
    });
    const ended = run('a-1', { endedAt: NOW, outcome: 'geht_nicht' });
    const c = makeCase({ status: 'selbsthilfe', guideRunIds: ['a-1', 'a-2'] });
    const running = factsOf(c, { guideRuns: { 'a-1': ended, 'a-2': run('a-2') } });
    expect(running.guideRun?.id).toBe('a-2');
    expect(running.guideOutcome).toBeUndefined();
    const done = factsOf(makeCase({ status: 'selbsthilfe', guideRunIds: ['a-1'] }), {
      guideRuns: { 'a-1': ended },
    });
    expect(done.guideRun).toBeUndefined();
    expect(done.guideOutcome).toBe('geht_nicht');
  });

  test('Befund: der neueste von Fachkraft oder Betrieb, Ersatzgerät daraus', () => {
    const d = (id: string, extra: Partial<Diagnosis>): Diagnosis => ({
      id,
      caseId: 'GS-1',
      photoIds: [],
      mode: 'bauteil',
      errorPattern: 'wasserablauf',
      confidence: 'hoch',
      confidenceScore: 1,
      source: 'fachkraft',
      createdAt: NOW,
      ...extra,
    });
    const diagnoses = [
      d('e-1', { source: 'fachkraft', errorPattern: 'ersatzgeraet_noetig' }),
      d('e-2', { source: 'fehlererkennung' }),
    ];
    const f = factsOf(makeCase({ diagnosisIds: ['e-1', 'e-2'] }), { diagnoses });
    expect(f.finding?.id).toBe('e-1');
    expect(f.replacement).toBe(true);
    expect(factsOf(makeCase()).replacement).toBe(false);
  });

  test('Runden: nach „Problem besteht weiter“ zählen Termine, Befund, Kosten und Schadenfall der alten Runde nicht mehr', () => {
    const finding: Diagnosis = {
      id: 'e-1',
      caseId: 'GS-1',
      photoIds: [],
      mode: 'bauteil',
      errorPattern: 'ersatzgeraet_noetig',
      confidence: 'hoch',
      confidenceScore: 1,
      source: 'fachkraft',
      createdAt: NOW,
    };
    const repaired = makeCase({
      status: 'in_reparatur',
      quoteId: quote.id,
      claim: claim('freigegeben'),
      diagnosisIds: ['e-1'],
    });
    const bookings = [
      booking('t-1', { status: 'erledigt' }),
      booking('t-2', { kind: 'vor_ort_diagnose', status: 'erledigt' }),
    ];
    const before = factsOf(repaired, { bookings, diagnoses: [finding] });
    expect(before.bookings.reparatur?.id).toBe('t-1');
    expect(before.replacement).toBe(true);

    const reopened = closeRound(
      { ...repaired, status: 'eskaliert' },
      { bookings, diagnoses: [finding] },
      NOW,
    );
    expect(reopened.rounds).toEqual([
      {
        endedAt: NOW,
        quoteId: quote.id,
        claim: claim('freigegeben'),
        bookingIds: ['t-1', 't-2'],
        findingIds: ['e-1'],
      },
    ]);
    const f = factsOf(reopened, { bookings, diagnoses: [finding] });
    expect(f.quote).toBeUndefined();
    expect(f.claim).toBe('keiner');
    expect(f.bookings).toEqual({});
    expect(f.booking).toBeUndefined();
    expect(f.finding).toBeUndefined();
    expect(f.replacement).toBe(false);
    // Ein neuer Termin zählt in der neuen Runde
    const again = factsOf(reopened, { bookings: [...bookings, booking('t-3')] });
    expect(again.bookings.reparatur?.id).toBe('t-3');
    // Eine zweite Runde nimmt nur, was seit der ersten dazukam
    const second = closeRound(
      reopened,
      { bookings: [...bookings, booking('t-3')], diagnoses: [] },
      NOW,
    );
    expect(second.rounds?.[1]).toMatchObject({ bookingIds: ['t-3'], findingIds: [] });
  });

  test('Nachbesserung (Nr. 32): markierte Runde, Zahler Betrieb, kein Schadenfall, Weitergabe nötig', () => {
    const rework = {
      repairBookingId: 't-1',
      provider: { id: 'betrieb-1', kind: 'betrieb' as const, name: 'Betrieb', authorized: true },
      completedAt: NOW,
      until: '2028-11-03T09:00:00.000Z',
      claimedAt: NOW,
    };
    const repaired = makeCase({
      status: 'in_reparatur',
      quoteId: quote.id,
      claim: claim('freigegeben'),
    });
    const bookings = [booking('t-1', { status: 'erledigt', completedAt: NOW })];
    const reworking = {
      ...closeRound({ ...repaired, status: 'nachbesserung' }, { bookings, diagnoses: [] }, NOW),
      rework,
    };
    const shared = [consent('weitergabe_betrieb')];
    const f = factsOf(reworking, { bookings, consents: shared });
    expect(f).toMatchObject({ rework, payer: 'betrieb', claim: 'keiner', bookings: {} });
    expect(f.quote).toBeUndefined();
    expect(f.hold).toBeUndefined();
    // Ohne gültige Weitergabe an den Betrieb der Reparatur hält der Fall schon vor dem Termin
    expect(factsOf(reworking, { bookings }).hold).toBe('weitergabe_betrieb');
    const other = [
      consent('weitergabe_betrieb', { recipient: { id: 'x', kind: 'betrieb', name: 'X' } }),
    ];
    expect(factsOf(reworking, { bookings, consents: other }).hold).toBe('weitergabe_betrieb');
    // Der Termin zur Nachbesserung zählt in der neuen Runde und ist ein Auftrag
    const visit = booking('t-2', { reworkOf: 't-1' });
    const booked = factsOf(reworking, { bookings: [...bookings, visit], consents: shared });
    expect(booked.bookings.reparatur?.id).toBe('t-2');
    expect(booked.order?.id).toBe('t-2');
    // Endet die Nachbesserung mit „Problem besteht weiter“, steht sie an der Runde
    const next = closeRound(
      { ...reworking, status: 'eskaliert' },
      { bookings: [...bookings, visit], diagnoses: [] },
      NOW,
    );
    expect(next.rework).toBeUndefined();
    expect(next.rounds?.map((r) => r.rework)).toEqual([undefined, rework]);
    expect(factsOf(next, { bookings: [...bookings, visit] })).toMatchObject({
      payer: undefined,
      bookings: {},
    });
  });

  test('Auftrag beim Betrieb (Nr. 34): bestätigt, verbindlich oder in der Reparatur', () => {
    const order = (c: Partial<Case>, b: Partial<Booking>) =>
      factsOf(makeCase(c), { bookings: [booking('t-1', b)] }).order?.id;
    expect(order({}, {})).toBeUndefined();
    expect(order({}, { status: 'bestaetigt' })).toBe('t-1');
    expect(order({}, { binding: { at: NOW, amount: 7900 } })).toBe('t-1');
    expect(order({ status: 'in_reparatur' }, {})).toBe('t-1');
    expect(order({ status: 'in_reparatur' }, { status: 'erledigt' })).toBeUndefined();
  });

  test('Händler (Entscheidungen 28, 32): vom Gerät, beim Händler mit gültiger Weitergabe', () => {
    const soldBy = { id: 'fruend', kind: 'haendler' as const, name: 'Händler' };
    const device = { ...source(makeCase()).devices[0]!, soldBy };
    const dealer = (extra: Partial<Consent> = {}) =>
      consent('weitergabe_haendler', { recipient: soldBy, ...extra });
    const of = (extra: Partial<CaseFactsSource>) =>
      factsOf(makeCase(), { devices: [device], ...extra });
    expect(factsOf(makeCase())).toMatchObject({ soldBy: undefined, dealerShared: false });
    expect(of({})).toMatchObject({ soldBy, dealerShared: false });
    expect(of({ consents: [dealer()] }).dealerShared).toBe(true);
    // Widerrufen, für einen anderen Fall oder eine andere Person: nicht beim Händler
    expect(of({ consents: [dealer({ revokedAt: NOW })] }).dealerShared).toBe(false);
    expect(of({ consents: [dealer({ caseId: 'GS-2' })] }).dealerShared).toBe(false);
    expect(of({ consents: [dealer({ personId: 'person-2' })] }).dealerShared).toBe(false);
    // Die Weitergabe ist beendet und das Backend weiß es: nicht mehr beim Händler
    const shares = { 'GS-1': { revoked: true } };
    expect(of({ consents: [dealer()], shares }).dealerShared).toBe(false);
    expect(of({ consents: [dealer()], shares: { 'GS-1': {} } }).dealerShared).toBe(true);
    expect(of({ consents: [dealer()], shares: { 'GS-2': { revoked: true } } }).dealerShared).toBe(
      true,
    );
  });

  test('Händler: gesendet bleibt gesendet, auch mit Widerruf unterwegs und nach dem Widerruf', () => {
    const soldBy = { id: 'fruend', kind: 'haendler' as const, name: 'Händler' };
    const device = { ...source(makeCase()).devices[0]!, soldBy };
    const dealer = (extra: Partial<Consent> = {}) =>
      consent('weitergabe_haendler', { recipient: soldBy, ...extra });
    const of = (extra: Partial<CaseFactsSource>) =>
      factsOf(makeCase(), { devices: [device], ...extra });
    expect(factsOf(makeCase()).dealerSent).toBe(false);
    expect(of({}).dealerSent).toBe(false);
    // Weitergabe läuft
    expect(of({ consents: [dealer()], shares: { 'GS-1': {} } })).toMatchObject({
      dealerShared: true,
      dealerSent: true,
    });
    // In der App widerrufen, das Backend weiß es noch nicht: nicht mehr beim Händler, aber gesendet
    expect(of({ consents: [dealer({ revokedAt: NOW })], shares: { 'GS-1': {} } })).toMatchObject({
      dealerShared: false,
      dealerSent: true,
    });
    // Das Backend weiß vom Widerruf
    expect(
      of({ consents: [dealer({ revokedAt: NOW })], shares: { 'GS-1': { revoked: true } } }),
    ).toMatchObject({ dealerShared: false, dealerSent: true });
    // Ohne Angabe der Weitergaben zählt jede Bestätigung zu diesem Fall, auch widerrufen
    expect(of({ consents: [dealer({ revokedAt: NOW })] }).dealerSent).toBe(true);
    expect(of({ consents: [dealer({ personId: 'person-2' })] }).dealerSent).toBe(true);
    // Ein anderer Fall oder ein anderer Zweck zählt nicht
    expect(of({ consents: [dealer({ caseId: 'GS-2' })] }).dealerSent).toBe(false);
    expect(of({ shares: { 'GS-2': {} } }).dealerSent).toBe(false);
    expect(of({ consents: [consent('weitergabe_fachkraft')] }).dealerSent).toBe(false);
  });

  test('letzter Videocall', () => {
    const v = (id: string, caseId = 'GS-1'): VideoSession => ({
      id,
      caseId,
      expert: { name: 'Fachkraft', provider: { id: 'b', kind: 'betrieb', name: 'B' } },
      requestedAt: NOW,
      recording: false,
    });
    const f = factsOf(makeCase(), { videoSessions: [v('v-1'), v('v-2'), v('v-3', 'GS-2')] });
    expect(f.lastVideoSession?.id).toBe('v-2');
  });
});

describe('model/ ist der reine Kern', () => {
  const modelDir = path.join(__dirname, '..', '..', '..', 'model');
  const files = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))
      .filter((f) => /\.tsx?$/.test(f));
  const FORBIDDEN =
    /^(react|react-native|expo|expo-[\w-]+|@expo\/.+|@react-native[\w/-]*|zustand(\/.*)?)$|^@\/(i18n|config|store|lib|services|components|app|theme)(\/|$)/;

  test.each(files(modelDir).map((f) => path.relative(modelDir, f)))(
    'model/%s importiert nichts aus react, expo, i18n, config oder store',
    (file) => {
      const full = path.join(modelDir, file);
      const source = fs.readFileSync(full, 'utf8');
      const specifiers = [...source.matchAll(/from\s+'([^']+)'|import\(\s*'([^']+)'\s*\)/g)].map(
        (m) => m[1] ?? m[2]!,
      );
      for (const spec of specifiers) {
        expect([spec, FORBIDDEN.test(spec)]).toEqual([spec, false]);
        // Relative Importe bleiben in model/
        if (spec.startsWith('.')) {
          const target = path.resolve(path.dirname(full), spec);
          expect([spec, target.startsWith(modelDir + path.sep)]).toEqual([spec, true]);
        }
      }
    },
  );
});
