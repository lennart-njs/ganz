import fs from 'fs';
import path from 'path';

import { selectCaseFacts, type CaseFactsSource } from '@/model/policies/caseFacts';
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
