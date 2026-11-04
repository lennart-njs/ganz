import { ALL_STATUSES, canTransition } from '@/model/caseMachine';
import {
  ACTION_COMMANDS,
  ALL_ACTIONS,
  availableActions,
  can,
  type ActionKey,
} from '@/model/policies/actions';
import type { CaseFacts } from '@/model/policies/caseFacts';
import type { Booking, BookingStatus, CaseStatus, Quote, Rework } from '@/model/types';

const NOW = '2026-11-03T10:00:00+01:00';

const quote: Quote = {
  id: 'angebot-1',
  caseId: 'GS-1',
  createdBy: { kind: 'fachkraft', name: 'Fachkraft' },
  repair: { partName: 'Pumpe', originalPart: true, parts: 9000, labor: 9900, total: 18900 },
  replacement: { total: 89900, note: '' },
  saving: 71000,
  payer: { kind: 'versicherer', name: 'Versicherer' },
  deductible: 0,
  isExample: true,
  createdAt: NOW,
};

/** Nachbesserung in der Gewährleistung (Nr. 32) zum Reparaturtermin termin-erledigt */
const rework: Rework = {
  repairBookingId: 'termin-erledigt',
  provider: { id: 'betrieb-1', kind: 'betrieb', name: 'Betrieb', authorized: true },
  completedAt: NOW,
  until: '2028-11-03T09:00:00.000Z',
  claimedAt: NOW,
};

function booking(status: BookingStatus, extra: Partial<Booking> = {}): Booking {
  return {
    id: `termin-${status}`,
    caseId: 'GS-1',
    kind: 'reparatur',
    provider: { id: 'betrieb-1', kind: 'betrieb', name: 'Betrieb', authorized: true },
    slotLabel: 'Mo vormittags',
    status,
    subjectToApproval: false,
    createdAt: NOW,
    ...extra,
  };
}

/** Fakten eines Falls ohne Schutz, Angebot, Termin und Bestätigung */
function facts(status: CaseStatus, extra: Partial<CaseFacts> = {}): CaseFacts {
  return {
    caseId: 'GS-1',
    status,
    closed: status === 'erledigt' || status === 'abgebrochen',
    paused: false,
    hasContract: false,
    deductible: 0,
    claim: 'keiner',
    bookings: {},
    bookingOpen: false,
    activeConsents: [],
    replacement: false,
    ...extra,
  };
}

/** Mit Schutz und Kostenvoranschlag, der Schadenfall passend zum Status */
const withContract = { hasContract: true, quote };
const repair = (status: BookingStatus, extra: Partial<Booking> = {}): Partial<CaseFacts> => {
  const b = booking(status, extra);
  return { bookings: { reparatur: b }, booking: b, bookingOpen: status !== 'erledigt' };
};

// Ein typischer Stand je Status. Die Tabelle ist die Regel, die Screens fragen nur nach.
const table: [CaseStatus, Partial<CaseFacts>, ActionKey[]][] = [
  [
    'offen',
    { hasContract: true },
    ['problem_aendern', 'anleitung_starten', 'hilfe_holen', 'pausieren', 'abbrechen'],
  ],
  [
    'selbsthilfe',
    {
      hasContract: true,
      guideRun: {
        id: 'anleitung-1',
        caseId: 'GS-1',
        guideId: 'ablauf',
        startedAt: NOW,
        currentStep: 3,
        completedSteps: [0, 1, 2],
      },
    },
    [
      'problem_aendern',
      'anleitung_starten',
      'anleitung_fortsetzen',
      'hilfe_holen',
      'pausieren',
      'abbrechen',
    ],
  ],
  [
    'eskaliert',
    withContract,
    [
      'videocall_anfragen',
      'schaden_melden',
      'selbst_zahlen',
      'termin_selbst',
      'pausieren',
      'abbrechen',
    ],
  ],
  [
    'freigabe_noetig',
    { ...withContract, claim: 'in_pruefung' },
    ['termin_versicherer', 'pausieren', 'abbrechen'],
  ],
  [
    'freigegeben',
    { ...withContract, claim: 'freigegeben', payer: 'versicherer' },
    ['termin_versicherer', 'pausieren', 'abbrechen'],
  ],
  [
    'abgelehnt',
    { ...withContract, claim: 'abgelehnt' },
    ['selbst_zahlen_nach_ablehnung', 'termin_selbst', 'pausieren', 'abbrechen'],
  ],
  // Seit Nr. 34 auch abbrechen: Der Betrieb bekommt die Absage
  [
    'in_reparatur',
    { quote, payer: 'haushalt', ...repair('bestaetigt') },
    ['pausieren', 'abbrechen'],
  ],
  // Nachbesserung in der Gewährleistung (Nr. 32): nur der Termin beim Betrieb der Reparatur
  [
    'nachbesserung',
    { rework, payer: 'betrieb' },
    ['nachbesserung_anfragen', 'pausieren', 'abbrechen'],
  ],
  ['erledigt', {}, ['problem_besteht_weiter']],
  ['abgebrochen', { ...withContract }, []],
];

describe('availableActions: Tabelle je Status', () => {
  test('die Tabelle deckt jeden Status ab', () => {
    expect(table.map(([status]) => status).sort()).toEqual([...ALL_STATUSES].sort());
  });

  test.each(table)('%s', (status, extra, expected) => {
    expect(availableActions(facts(status, extra))).toEqual(expected);
  });
});

describe('Status-Maschine', () => {
  // Alle Fakten, die eine Aktion möglich machen, gleichzeitig. Auch dann gilt TRANSITIONS.
  const generous = (status: CaseStatus) =>
    facts(status, {
      ...withContract,
      ...repair('erledigt'),
      activeConsents: ['weitergabe_fachkraft'],
      bindingDue: { booking: booking('angefragt'), amount: 5000, reason: 'selbstbeteiligung' },
    });

  test.each(ALL_STATUSES)('%s: jede Aktion mit Befehl ist ein erlaubter Übergang', (status) => {
    for (const key of ALL_ACTIONS) {
      const command = ACTION_COMMANDS[key];
      if (!command) continue;
      for (const claim of ['keiner', 'in_pruefung', 'freigegeben', 'abgelehnt'] as const) {
        const f = { ...generous(status), claim };
        if (can(f, key)) expect([key, canTransition(status, command)]).toEqual([key, true]);
      }
    }
  });

  test('abgebrochen: nichts mehr möglich, auch mit allen Fakten', () => {
    expect(availableActions(generous('abgebrochen'))).toEqual([]);
  });

  test('ohne Fall: nichts möglich', () => {
    expect(availableActions(undefined)).toEqual([]);
    for (const key of ALL_ACTIONS) expect(can(undefined, key)).toBe(false);
  });
});

describe('Abbrechen und Später weitermachen (R-01)', () => {
  test.each(['erledigt', 'abgebrochen'] as const)('%s: kein Abbrechen', (status) => {
    expect(can(facts(status), 'abbrechen')).toBe(false);
  });

  // Entscheidung Nr. 34: Abbrechen geht auch in der Reparatur, mit jedem laufenden Termin und ohne
  // gültige Weitergabe. Der Betrieb bekommt nur die Absage.
  test.each(['angefragt', 'bestaetigt', 'unterwegs'] as const)(
    'in der Reparatur mit Termin %s: Abbrechen geht',
    (status) => {
      const f = facts('in_reparatur', { quote, payer: 'haushalt', ...repair(status) });
      expect(can(f, 'abbrechen')).toBe(true);
      expect(can({ ...f, hold: 'weitergabe_betrieb' }, 'abbrechen')).toBe(true);
    },
  );

  // Gegenprüfung Nr. 31 bis 34 (F4, R3): Ist der Betrieb fertig, gibt es nichts mehr abzusagen.
  // Dann sagst du „Läuft wieder“ oder „Problem besteht weiter“, und die Gewährleistung bleibt.
  test.each([
    ['in_reparatur', { quote, payer: 'haushalt', ...repair('erledigt') }],
    [
      'nachbesserung',
      { rework, payer: 'betrieb', ...repair('erledigt', { reworkOf: 'termin-x' }) },
    ],
  ] as [CaseStatus, Partial<CaseFacts>][])(
    '%s, der Betrieb ist fertig: kein Abbrechen, aber Läuft wieder und Problem besteht weiter',
    (status, extra) => {
      const f = facts(status, extra);
      expect(can(f, 'abbrechen')).toBe(false);
      expect(can({ ...f, hold: 'weitergabe_betrieb' }, 'abbrechen')).toBe(false);
      expect(availableActions(f)).toEqual([
        'reparatur_bestaetigen',
        'problem_besteht_weiter',
        'bewerten',
        'pausieren',
      ]);
    },
  );

  test('geschlossene Fälle lassen sich nicht pausieren, die Reparatur schon', () => {
    expect(can(facts('erledigt'), 'pausieren')).toBe(false);
    expect(can(facts('abgebrochen'), 'pausieren')).toBe(false);
    expect(can(facts('in_reparatur'), 'pausieren')).toBe(true);
  });
});

describe('Wieder öffnen (Entscheidung Nr. 13)', () => {
  test('ein erledigter Fall öffnet sich nur, wenn für das Gerät kein anderer offen ist', () => {
    expect(can(facts('erledigt'), 'problem_besteht_weiter')).toBe(true);
    expect(can(facts('erledigt', { otherOpenCase: 'GS-2' }), 'problem_besteht_weiter')).toBe(false);
    // Auch nach einer Reparatur, die erledigt ist
    const repaired = facts('erledigt', { quote, ...repair('erledigt'), otherOpenCase: 'GS-2' });
    expect(can(repaired, 'problem_besteht_weiter')).toBe(false);
  });

  test('in der Reparatur bleibt „Problem besteht weiter“, der Fall ist ja offen', () => {
    const f = facts('in_reparatur', { quote, ...repair('erledigt'), otherOpenCase: 'GS-2' });
    expect(can(f, 'problem_besteht_weiter')).toBe(true);
  });
});

describe('Freigabe', () => {
  test('Schadenfall nur einmal, nur mit Schutz und Kostenvoranschlag (R-02)', () => {
    expect(can(facts('eskaliert', withContract), 'schaden_melden')).toBe(true);
    expect(can(facts('eskaliert', { quote }), 'schaden_melden')).toBe(false);
    expect(can(facts('eskaliert', { hasContract: true }), 'schaden_melden')).toBe(false);
    for (const claim of ['in_pruefung', 'freigegeben', 'abgelehnt'] as const) {
      expect(can(facts('eskaliert', { ...withContract, claim }), 'schaden_melden')).toBe(false);
    }
    expect(
      can(facts('freigabe_noetig', { ...withContract, claim: 'in_pruefung' }), 'schaden_melden'),
    ).toBe(false);
  });

  test('während der Prüfung kein Selbstzahlen (R-07)', () => {
    const f = facts('freigabe_noetig', { ...withContract, claim: 'in_pruefung' });
    expect(can(f, 'selbst_zahlen')).toBe(false);
    expect(can(f, 'termin_selbst')).toBe(false);
  });

  test('nach der Ablehnung kein Termin auf Kosten des Versicherers (R-09)', () => {
    const f = facts('abgelehnt', { ...withContract, claim: 'abgelehnt' });
    expect(can(f, 'termin_versicherer')).toBe(false);
    expect(can(f, 'selbst_zahlen')).toBe(false);
    expect(can(f, 'selbst_zahlen_nach_ablehnung')).toBe(true);
  });

  test('für ein Ersatzgerät gibt es keinen Reparaturtermin', () => {
    const f = facts('freigegeben', { ...withContract, claim: 'freigegeben', replacement: true });
    expect(can(f, 'termin_versicherer')).toBe(false);
  });
});

describe('Termine', () => {
  test('höchstens ein Termin je Art: kein zweiter Reparaturtermin (R-08)', () => {
    for (const status of ['angefragt', 'bestaetigt', 'unterwegs', 'erledigt'] as const) {
      const selfPaid = facts('in_reparatur', { quote, payer: 'haushalt', ...repair(status) });
      expect(can(selfPaid, 'termin_selbst')).toBe(false);
      const claim = facts('freigabe_noetig', {
        ...withContract,
        claim: 'in_pruefung',
        ...repair(status, { subjectToApproval: true }),
      });
      expect(can(claim, 'termin_versicherer')).toBe(false);
    }
  });

  test('erst nach der Reparatur: bestätigen, bewerten oder „Problem besteht weiter“', () => {
    const before = facts('in_reparatur', { quote, ...repair('unterwegs') });
    const after = facts('in_reparatur', { quote, ...repair('erledigt') });
    for (const key of ['reparatur_bestaetigen', 'bewerten', 'problem_besteht_weiter'] as const) {
      expect([key, can(before, key)]).toEqual([key, false]);
      expect([key, can(after, key)]).toEqual([key, true]);
    }
  });

  test('Vor-Ort-Diagnose nach „Hilfe holen“, ohne Kostenvoranschlag und ohne Termin', () => {
    expect(can(facts('offen'), 'termin_diagnose')).toBe(false);
    expect(can(facts('eskaliert'), 'termin_diagnose')).toBe(true);
    expect(can(facts('eskaliert', { quote }), 'termin_diagnose')).toBe(false);
    const diagnosis = booking('angefragt', { kind: 'vor_ort_diagnose' });
    expect(
      can(facts('eskaliert', { bookings: { vor_ort_diagnose: diagnosis } }), 'termin_diagnose'),
    ).toBe(false);
  });
});

describe('Verbindlich buchen nach der Freigabe (Entscheidung Nr. 31)', () => {
  const waiting = booking('angefragt', { subjectToApproval: true });
  const due = { booking: waiting, amount: 5000, reason: 'selbstbeteiligung' as const };
  const approved = (extra: Partial<CaseFacts> = {}) =>
    facts('freigegeben', {
      ...withContract,
      claim: 'freigegeben',
      payer: 'versicherer',
      deductible: 5000,
      bookings: { reparatur: waiting },
      booking: waiting,
      bookingOpen: true,
      ...extra,
    });

  test('der Termin wartet auf den Tap: „Zahlungspflichtig buchen“, sonst kein Termin', () => {
    // Seit Nr. 33 auch „Nicht buchen“: Die unverbindliche Anfrage endet ohne Kosten
    expect(availableActions(approved({ bindingDue: due }))).toEqual([
      'zahlungspflichtig_buchen',
      'nicht_buchen',
      'pausieren',
      'abbrechen',
    ]);
  });

  test('ohne gültige Weitergabe an den Betrieb erst erneut bestätigen (R-12)', () => {
    const held = approved({ bindingDue: due, hold: 'weitergabe_betrieb' });
    expect(can(held, 'zahlungspflichtig_buchen')).toBe(false);
    expect(can(held, 'weitergabe_erneuern')).toBe(true);
  });

  test('ohne wartenden Termin gibt es den Tap in keinem Status, auch nicht während der Prüfung', () => {
    expect(can(approved(), 'zahlungspflichtig_buchen')).toBe(false);
    for (const status of ALL_STATUSES) {
      for (const claim of ['keiner', 'in_pruefung', 'freigegeben', 'abgelehnt'] as const) {
        const f = facts(status, {
          ...withContract,
          claim,
          deductible: 5000,
          ...repair('angefragt'),
        });
        expect([status, claim, can(f, 'zahlungspflichtig_buchen')]).toEqual([status, claim, false]);
      }
    }
  });

  test('ein geschlossener Fall bucht nichts mehr, auch wenn ein Termin wartet', () => {
    for (const status of ['erledigt', 'abgebrochen'] as const) {
      expect(can(facts(status, { bindingDue: due }), 'zahlungspflichtig_buchen')).toBe(false);
      expect(can(facts(status, { bindingDue: due }), 'nicht_buchen')).toBe(false);
    }
  });

  test('„Nicht buchen“ (Nr. 33) nur, wo ein Termin wartet, auch ohne gültige Weitergabe', () => {
    expect(can(approved(), 'nicht_buchen')).toBe(false);
    expect(can(approved({ bindingDue: due, hold: 'weitergabe_betrieb' }), 'nicht_buchen')).toBe(
      true,
    );
    const visit = booking('angefragt', { kind: 'vor_ort_diagnose', price: 7900 });
    const priced = facts('eskaliert', {
      bookings: { vor_ort_diagnose: visit },
      booking: visit,
      bookingOpen: true,
      bindingDue: { booking: visit, amount: 7900, reason: 'preis' },
    });
    expect(availableActions(priced)).toEqual(
      expect.arrayContaining(['zahlungspflichtig_buchen', 'nicht_buchen']),
    );
    expect(can(priced, 'termin_diagnose')).toBe(false);
  });
});

describe('Bestätigungen', () => {
  test('Rückruf nur mit gültiger Weitergabe an die Fachkraft (R-16)', () => {
    expect(can(facts('eskaliert'), 'rueckruf_anfragen')).toBe(false);
    expect(
      can(facts('eskaliert', { activeConsents: ['weitergabe_fachkraft'] }), 'rueckruf_anfragen'),
    ).toBe(true);
    expect(
      can(facts('eskaliert', { activeConsents: ['weitergabe_versicherer'] }), 'rueckruf_anfragen'),
    ).toBe(false);
  });
});

describe('Selbsthilfe', () => {
  test('Hilfe ist auch nach einer Anleitung angefragt, die nicht ging', () => {
    expect(can(facts('selbsthilfe'), 'videocall_anfragen')).toBe(false);
    for (const outcome of ['geht_nicht', 'laeuft_nicht'] as const) {
      expect(can(facts('selbsthilfe', { guideOutcome: outcome }), 'videocall_anfragen')).toBe(true);
    }
    expect(can(facts('selbsthilfe', { guideOutcome: 'fertig' }), 'videocall_anfragen')).toBe(false);
  });

  test('eine Anleitung geht nur in der Selbsthilfe weiter', () => {
    const guideRun = {
      id: 'anleitung-1',
      caseId: 'GS-1',
      guideId: 'ablauf',
      startedAt: NOW,
      currentStep: 0,
      completedSteps: [],
    };
    expect(can(facts('selbsthilfe', { guideRun }), 'anleitung_fortsetzen')).toBe(true);
    expect(can(facts('eskaliert', { guideRun }), 'anleitung_fortsetzen')).toBe(false);
    expect(can(facts('selbsthilfe'), 'anleitung_fortsetzen')).toBe(false);
  });
});

describe('Nach einem Widerruf (R-12)', () => {
  test('ein gehaltener Fall lässt sich erneut bestätigen, auch in der Reparatur', () => {
    const repairing = facts('in_reparatur', {
      quote,
      payer: 'haushalt',
      ...repair('bestaetigt'),
      hold: 'weitergabe_betrieb',
    });
    // Seit Nr. 34 auch abbrechen: Der Betrieb bekommt nur die Absage
    expect(availableActions(repairing)).toEqual(['weitergabe_erneuern', 'pausieren', 'abbrechen']);
    const reviewing = facts('freigabe_noetig', {
      ...withContract,
      claim: 'in_pruefung',
      hold: 'weitergabe_versicherer',
    });
    expect(can(reviewing, 'weitergabe_erneuern')).toBe(true);
  });

  test('ohne Halt gibt es nichts zu erneuern', () => {
    for (const status of ALL_STATUSES) {
      expect(can(facts(status, withContract), 'weitergabe_erneuern')).toBe(false);
    }
  });
});

describe('Nachbesserung in der Gewährleistung (Nr. 32)', () => {
  const reworkBooking = (status: BookingStatus) =>
    repair(status, { id: 'termin-nach', reworkOf: rework.repairBookingId });

  test('der Termin geht nur in einer Nachbesserung, ohne Halt und nur einmal je Runde', () => {
    expect(can(facts('nachbesserung', { rework }), 'nachbesserung_anfragen')).toBe(true);
    expect(can(facts('nachbesserung'), 'nachbesserung_anfragen')).toBe(false);
    expect(
      can(facts('nachbesserung', { rework, hold: 'weitergabe_betrieb' }), 'nachbesserung_anfragen'),
    ).toBe(false);
    expect(
      can(
        facts('nachbesserung', { rework, ...reworkBooking('angefragt') }),
        'nachbesserung_anfragen',
      ),
    ).toBe(false);
    for (const status of ALL_STATUSES) {
      if (status === 'nachbesserung') continue;
      expect([status, can(facts(status, { rework }), 'nachbesserung_anfragen')]).toEqual([
        status,
        false,
      ]);
    }
  });

  test('ohne gültige Weitergabe: erst erneut bestätigen, abbrechen geht', () => {
    const held = facts('nachbesserung', { rework, hold: 'weitergabe_betrieb' });
    expect(availableActions(held)).toEqual(['weitergabe_erneuern', 'pausieren', 'abbrechen']);
  });

  test('keine Kosten, kein Schadenfall, kein Tap: nur Termin, Abschluss und Bewertung', () => {
    const forbidden: ActionKey[] = [
      'schaden_melden',
      'selbst_zahlen',
      'selbst_zahlen_nach_ablehnung',
      'termin_versicherer',
      'termin_selbst',
      'zahlungspflichtig_buchen',
      'nicht_buchen',
      'termin_diagnose',
      'videocall_anfragen',
      'hilfe_holen',
    ];
    for (const status of ['angefragt', 'bestaetigt', 'unterwegs', 'erledigt'] as const) {
      const f = facts('nachbesserung', {
        rework,
        payer: 'betrieb',
        hasContract: true,
        deductible: 5000,
        ...reworkBooking(status),
      });
      for (const key of forbidden) expect([key, can(f, key)]).toEqual([key, false]);
    }
    // Ist der Betrieb fertig, gibt es kein Abbrechen mehr (Gegenprüfung Nr. 31 bis 34, F4)
    const done = facts('nachbesserung', { rework, ...reworkBooking('erledigt') });
    expect(availableActions(done)).toEqual([
      'reparatur_bestaetigen',
      'problem_besteht_weiter',
      'bewerten',
      'pausieren',
    ]);
    expect(can(done, 'abbrechen')).toBe(false);
  });
});
