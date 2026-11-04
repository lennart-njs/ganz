import {
  ALL_COMMANDS,
  ALL_STATUSES,
  applyCommand,
  canStartVideoCall,
  ConsentRequiredError,
  createQuote,
  findActiveConsent,
  pauseCase,
  resumeCase,
  TRANSITIONS,
  TransitionError,
  tryApplyCommand,
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
  // Seit Nr. 32 mit Status nachbesserung und Befehl nachbesserung_verlangen
  test('deckt alle 10 Status und 13 Befehle ab', () => {
    expect(ALL_STATUSES).toHaveLength(10);
    expect(ALL_COMMANDS).toHaveLength(13);
    expect(allowed.length + forbidden.length).toBe(130);
  });

  test('Nachbesserung (Nr. 32): aus der Reparatur oder erledigt, danach wie eine Reparatur', () => {
    expect(TRANSITIONS.in_reparatur.nachbesserung_verlangen).toBe('nachbesserung');
    expect(TRANSITIONS.erledigt.nachbesserung_verlangen).toBe('nachbesserung');
    expect(TRANSITIONS.nachbesserung).toEqual({
      repariert: 'erledigt',
      problem_besteht_weiter: 'eskaliert',
      abbrechen: 'abgebrochen',
    });
    // Keine Nachbesserung einer Nachbesserung, kein Schadenfall, kein Selbstzahlen
    for (const status of ALL_STATUSES) {
      if (status !== 'in_reparatur' && status !== 'erledigt') {
        expect(TRANSITIONS[status].nachbesserung_verlangen).toBeUndefined();
      }
    }
    const done = applyCommand(makeCase('in_reparatur'), 'repariert', ctx()).case;
    const again = applyCommand(done, 'nachbesserung_verlangen', ctx());
    expect(again.case).toMatchObject({ status: 'nachbesserung' });
    expect(again.case.closedAt).toBeUndefined();
    expect(again.case.resolution).toBeUndefined();
    expect(again.events.map((e) => e.type)).toEqual(['nachbesserung_verlangt', 'status_geaendert']);
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

describe('Befehle ohne Exception (tryApplyCommand)', () => {
  test.each(allowed)('erlaubt: %s → %s liefert dasselbe wie applyCommand', (status, command) => {
    n = 0;
    const expected = applyCommand(caseFor(status), command as CaseCommand, ctx());
    n = 0;
    expect(tryApplyCommand(caseFor(status), command as CaseCommand, ctx())).toEqual({
      ok: true,
      value: expected,
    });
  });

  test.each(forbidden)('verboten: %s → %s wird abgelehnt', (status, command) => {
    expect(tryApplyCommand(caseFor(status), command as CaseCommand, ctx())).toEqual({
      ok: false,
      refusal: { code: 'uebergang', from: status, command },
    });
  });

  test('Schadenmeldung: ohne eigene Bestätigung, vom System und ohne Vertrag abgelehnt', () => {
    const missing = { code: 'bestaetigung', purpose: 'weitergabe_versicherer' };
    const revoked = consent('weitergabe_versicherer', { revokedAt: NOW });
    const other = consent('weitergabe_versicherer', { personId: 'p-2' });
    const attempt = (extra: Partial<CommandContext>) =>
      tryApplyCommand(makeCase('eskaliert'), 'schaden_melden', ctx(extra));
    expect(attempt({ consents: [] })).toEqual({ ok: false, refusal: missing });
    expect(attempt({ consents: [revoked] })).toEqual({ ok: false, refusal: missing });
    expect(attempt({ consents: [other] })).toEqual({ ok: false, refusal: missing });
    expect(attempt({ actor: { kind: 'system' } })).toEqual({ ok: false, refusal: missing });
    expect(attempt({ contractId: undefined })).toEqual({ ok: false, refusal: { code: 'vertrag' } });
    expect(() =>
      applyCommand(makeCase('eskaliert'), 'schaden_melden', ctx({ contractId: undefined })),
    ).toThrow('Schadenmeldung ohne Vertrag');
  });

  test('Freigabe ohne Schadenmeldung wird abgelehnt', () => {
    expect(tryApplyCommand(makeCase('freigabe_noetig'), 'freigabe_erteilt', ctx())).toEqual({
      ok: false,
      refusal: { code: 'schadenfall' },
    });
    expect(() => applyCommand(makeCase('freigabe_noetig'), 'freigabe_erteilt', ctx())).toThrow(
      'Freigabe ohne Schadenmeldung',
    );
  });

  // Bis Nr. 34 war das Beispiel „abbrechen“ in der Reparatur, das geht jetzt
  test('eine Ablehnung ändert den Fall nicht', () => {
    const c = makeCase('erledigt');
    const before = structuredClone(c);
    expect(tryApplyCommand(c, 'abbrechen', ctx())).toEqual({
      ok: false,
      refusal: { code: 'uebergang', from: 'erledigt', command: 'abbrechen' },
    });
    expect(c).toEqual(before);
  });

  test('abbrechen in der Reparatur (Nr. 34): abgebrochen, mit Grund und Ereignis', () => {
    const r = applyCommand(makeCase('in_reparatur'), 'abbrechen', ctx({ cancelReason: 'x' }));
    expect(r.case).toMatchObject({ status: 'abgebrochen', cancelReason: 'x', closedAt: NOW });
    expect(r.events.map((e) => e.type)).toEqual(['abgebrochen', 'status_geaendert']);
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

describe('Gültige Bestätigung', () => {
  const betrieb = (id: string, extra: Partial<Consent> = {}) =>
    consent('weitergabe_betrieb', {
      id: `c-${id}`,
      recipient: { id, kind: 'betrieb', name: id },
      ...extra,
    });

  test('mit Empfänger zählt nur eine Bestätigung für genau diesen Empfänger', () => {
    const consents = [betrieb('brandt', { revokedAt: NOW }), betrieb('neukoelln')];
    const find = (recipientId?: string) =>
      findActiveConsent(consents, PERSON, 'weitergabe_betrieb', 'GS-24817', recipientId)?.id;
    expect(find()).toBe('c-neukoelln');
    expect(find('neukoelln')).toBe('c-neukoelln');
    expect(find('brandt')).toBeUndefined();
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
