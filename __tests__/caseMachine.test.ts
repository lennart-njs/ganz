import {
  ALL_COMMANDS,
  ALL_STATUSES,
  applyCommand,
  canStartVideoCall,
  ConsentRequiredError,
  createQuote,
  pauseCase,
  resumeCase,
  TRANSITIONS,
  TransitionError,
  type CaseCommand,
  type CommandContext,
} from '@/model/caseMachine';
import type { Case, CaseStatus, Consent } from '@/model/types';

const NOW = '2026-10-26T19:42:00+01:00';
const PERSON = 'p-1';

function makeCase(status: CaseStatus, extra: Partial<Case> = {}): Case {
  return {
    id: 'GS-24817',
    householdId: 'h-1',
    deviceId: 'd-1',
    reportedBy: PERSON,
    status,
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

function consent(purpose: Consent['purpose'], extra: Partial<Consent> = {}): Consent {
  return {
    id: `c-${purpose}`,
    personId: PERSON,
    caseId: 'GS-24817',
    purpose,
    legalBasis: 'vertrag',
    recipient: { id: 'v-1', kind: 'versicherer', name: 'Kranich Versicherung' },
    dataCategories: ['Fotos', 'Protokoll'],
    textVersion: '1',
    grantedAt: NOW,
    ...extra,
  };
}

let n = 0;
function ctx(extra: Partial<CommandContext> = {}): CommandContext {
  return {
    now: NOW,
    actor: { kind: 'haushalt', id: PERSON },
    newId: (p) => `${p}-${++n}`,
    consents: [consent('weitergabe_versicherer')],
    contractId: 'k-1',
    ...extra,
  };
}

/** Fall in einem Status, der für Freigabe-Befehle eine Meldung braucht */
function caseFor(status: CaseStatus): Case {
  const needsClaim = status === 'freigabe_noetig';
  return makeCase(
    status,
    needsClaim
      ? { claim: { contractId: 'k-1', reportedAt: NOW, reportedBy: PERSON, confirmationId: 'c' } }
      : {},
  );
}

const pairs = ALL_STATUSES.flatMap((s) => ALL_COMMANDS.map((c) => [s, c] as const));
const allowed = pairs.filter(([s, c]) => TRANSITIONS[s][c] !== undefined);
const forbidden = pairs.filter(([s, c]) => TRANSITIONS[s][c] === undefined);

describe('Status-Maschine', () => {
  test('deckt alle 9 Status und 12 Befehle ab', () => {
    expect(ALL_STATUSES).toHaveLength(9);
    expect(ALL_COMMANDS).toHaveLength(12);
    expect(allowed.length + forbidden.length).toBe(108);
  });

  test.each(allowed)('erlaubt: %s → %s', (status, command) => {
    const result = applyCommand(caseFor(status), command as CaseCommand, ctx());
    expect(result.case.status).toBe(TRANSITIONS[status][command]);
    const change = result.events.filter((e) => e.type === 'status_geaendert');
    expect(change).toHaveLength(1);
    expect(change[0]?.payload).toEqual({ from: status, to: result.case.status, command });
  });

  test.each(forbidden)('verboten: %s → %s', (status, command) => {
    expect(() => applyCommand(caseFor(status), command as CaseCommand, ctx())).toThrow(
      TransitionError,
    );
  });

  test('abgebrochen ist endgültig', () => {
    expect(Object.keys(TRANSITIONS.abgebrochen)).toHaveLength(0);
  });
});

describe('Schadenmeldung', () => {
  test('ohne Bestätigung keine Meldung', () => {
    expect(() =>
      applyCommand(makeCase('eskaliert'), 'schaden_melden', ctx({ consents: [] })),
    ).toThrow(ConsentRequiredError);
  });

  test('widerrufene Bestätigung zählt nicht', () => {
    const revoked = consent('weitergabe_versicherer', { revokedAt: NOW });
    expect(() =>
      applyCommand(makeCase('eskaliert'), 'schaden_melden', ctx({ consents: [revoked] })),
    ).toThrow(ConsentRequiredError);
  });

  test('Bestätigung einer anderen Person zählt nicht', () => {
    const other = consent('weitergabe_versicherer', { personId: 'p-2' });
    expect(() =>
      applyCommand(makeCase('eskaliert'), 'schaden_melden', ctx({ consents: [other] })),
    ).toThrow(ConsentRequiredError);
  });

  test('das System kann keinen Schadenfall anlegen', () => {
    expect(() =>
      applyCommand(makeCase('eskaliert'), 'schaden_melden', ctx({ actor: { kind: 'system' } })),
    ).toThrow(ConsentRequiredError);
  });

  test('mit Bestätigung: Claim mit Verweis auf die Bestätigung', () => {
    const { case: c, events } = applyCommand(makeCase('eskaliert'), 'schaden_melden', ctx());
    expect(c.status).toBe('freigabe_noetig');
    expect(c.claim).toMatchObject({
      contractId: 'k-1',
      reportedBy: PERSON,
      confirmationId: 'c-weitergabe_versicherer',
    });
    expect(events.map((e) => e.type)).toEqual(['schaden_gemeldet', 'status_geaendert']);
  });

  test('die Freigabe speichert den Akteur (Art. 22 DSGVO)', () => {
    const reported = applyCommand(makeCase('eskaliert'), 'schaden_melden', ctx()).case;
    const decided = applyCommand(
      reported,
      'freigabe_abgelehnt',
      ctx({ actor: { kind: 'versicherer' }, decisionActor: 'mensch' }),
    ).case;
    expect(decided.status).toBe('abgelehnt');
    expect(decided.claim?.decision).toMatchObject({ result: 'abgelehnt', actor: 'mensch' });
  });
});

describe('Videocall', () => {
  test('startet nur mit bestätigter Weitergabe an die Fachkraft', () => {
    expect(canStartVideoCall([], PERSON, 'GS-24817')).toBe(false);
    expect(canStartVideoCall([consent('weitergabe_versicherer')], PERSON, 'GS-24817')).toBe(false);
    expect(canStartVideoCall([consent('weitergabe_fachkraft')], PERSON, 'GS-24817')).toBe(true);
    expect(
      canStartVideoCall([consent('weitergabe_fachkraft', { revokedAt: NOW })], PERSON, 'GS-24817'),
    ).toBe(false);
    expect(canStartVideoCall([consent('weitergabe_fachkraft')], PERSON, 'GS-99999')).toBe(false);
  });
});

describe('Pausieren', () => {
  test('ist kein Status, setzt nur pausedAt', () => {
    const paused = pauseCase(makeCase('selbsthilfe'), ctx());
    expect(paused.case.status).toBe('selbsthilfe');
    expect(paused.case.pausedAt).toBe(NOW);
    expect(paused.events.map((e) => e.type)).toEqual(['pausiert']);
    const resumed = resumeCase(paused.case, ctx());
    expect(resumed.case.pausedAt).toBeUndefined();
    expect(resumed.events.map((e) => e.type)).toEqual(['fortgesetzt']);
  });
});

describe('Abschluss', () => {
  test('erledigt setzt closedAt und die Lösung, „Problem besteht weiter“ öffnet wieder', () => {
    const done = applyCommand(makeCase('in_reparatur'), 'repariert', ctx()).case;
    expect(done.closedAt).toBe(NOW);
    expect(done.resolution).toBe('repariert');
    const again = applyCommand(done, 'problem_besteht_weiter', ctx()).case;
    expect(again.status).toBe('eskaliert');
    expect(again.closedAt).toBeUndefined();
    expect(again.resolution).toBeUndefined();
  });

  test('abbrechen speichert den Grund', () => {
    const c = applyCommand(
      makeCase('offen'),
      'abbrechen',
      ctx({ cancelReason: 'Hat sich erledigt' }),
    ).case;
    expect(c.cancelReason).toBe('Hat sich erledigt');
  });
});

describe('Kostenvoranschlag', () => {
  test('die Ersparnis wird berechnet', () => {
    const q = createQuote({
      id: 'q-1',
      caseId: 'GS-24817',
      createdBy: { kind: 'fachkraft', name: 'Jonas K.' },
      repair: { partName: 'Laugenpumpe', originalPart: true, parts: 11900, labor: 7000 },
      replacement: { total: 89900, note: 'Ersatzgerät' },
      payer: { kind: 'versicherer', name: 'Kranich Versicherung' },
      deductible: 0,
      isExample: true,
      createdAt: NOW,
    });
    expect(q.repair.total).toBe(18900);
    expect(q.saving).toBe(71000);
  });
});
