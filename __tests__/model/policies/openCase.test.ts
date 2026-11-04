import fs from 'fs';
import path from 'path';

import { canTransition } from '@/model/caseMachine';
import {
  findOpenCase,
  hasProgress,
  isEmptyCase,
  planOpenCase,
  type OpenCaseSource,
} from '@/model/policies/openCase';
import type {
  Booking,
  BookingStatus,
  Case,
  CaseStatus,
  ChatMessage,
  GuideRun,
  VideoSession,
} from '@/model/types';

const NOW = '2026-11-03T10:00:00+01:00';
const LATER = '2026-11-03T11:00:00+01:00';

function makeCase(extra: Partial<Case> = {}): Case {
  return {
    id: 'GS-1',
    householdId: 'haushalt-1',
    deviceId: 'geraet-1',
    reportedBy: 'person-1',
    status: 'offen',
    entry: 'symptom',
    problemLabel: 'Wäsche noch nass',
    diagnosisIds: [],
    guideRunIds: [],
    photoIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...extra,
  };
}

function run(extra: Partial<GuideRun> = {}): GuideRun {
  return {
    id: 'anleitung-1',
    caseId: 'GS-1',
    guideId: 'nass',
    startedAt: NOW,
    currentStep: 0,
    completedSteps: [],
    ...extra,
  };
}

function source(cases: Case[], extra: Partial<OpenCaseSource> = {}): OpenCaseSource {
  return {
    cases: Object.fromEntries(cases.map((c) => [c.id, c])),
    devices: [],
    contracts: [],
    quotes: [],
    bookings: [],
    videoSessions: [],
    consents: [],
    guideRuns: {},
    diagnoses: [],
    chatMessages: [],
    ...extra,
  };
}

const chat: ChatMessage = {
  id: 'chat-1',
  caseId: 'GS-1',
  role: 'haushalt',
  text: 'Hallo',
  at: NOW,
};
const video = { id: 'video-1', caseId: 'GS-1' } as VideoSession;

/** Reparaturtermin des Falls GS-1 */
function repairBooking(status: BookingStatus): Booking {
  return {
    id: 'termin-1',
    caseId: 'GS-1',
    kind: 'reparatur',
    provider: { id: 'brandt', kind: 'betrieb', name: 'Hausgeräte Brandt', authorized: true },
    slotLabel: 'Mo vormittags',
    status,
    subjectToApproval: false,
    createdAt: NOW,
  };
}

describe('findOpenCase', () => {
  test('ohne Fall für das Gerät: keiner', () => {
    expect(findOpenCase(source([makeCase({ deviceId: 'geraet-2' })]), 'geraet-1')).toBeUndefined();
  });

  test('abgeschlossene Fälle zählen nicht', () => {
    const s = source([
      makeCase({ id: 'GS-1', status: 'erledigt' }),
      makeCase({ id: 'GS-2', status: 'abgebrochen' }),
    ]);
    expect(findOpenCase(s, 'geraet-1')).toBeUndefined();
  });

  test('der offene Fall des Geräts, bei mehreren der zuletzt geänderte', () => {
    const s = source([
      makeCase({ id: 'GS-1', updatedAt: NOW }),
      makeCase({ id: 'GS-2', updatedAt: LATER, status: 'eskaliert' }),
      makeCase({ id: 'GS-3', updatedAt: LATER, deviceId: 'geraet-2' }),
      makeCase({ id: 'GS-4', updatedAt: LATER, status: 'erledigt' }),
    ]);
    expect(findOpenCase(s, 'geraet-1')?.id).toBe('GS-2');
  });
});

describe('hasProgress', () => {
  test('ein frisch gemeldeter Fall hat keinen Fortschritt', () => {
    const c = makeCase();
    expect(hasProgress(source([c]), c)).toBe(false);
  });

  test('eine gestartete Anleitung ohne erledigten Schritt ist noch kein Fortschritt', () => {
    const c = makeCase({ status: 'selbsthilfe', guideRunIds: ['anleitung-1'] });
    expect(hasProgress(source([c], { guideRuns: { 'anleitung-1': run() } }), c)).toBe(false);
  });

  const later: CaseStatus[] = [
    'eskaliert',
    'freigabe_noetig',
    'freigegeben',
    'abgelehnt',
    'in_reparatur',
    'erledigt',
    'abgebrochen',
  ];
  test.each(later)('Status %s ist Fortschritt', (status) => {
    const c = makeCase({ status });
    expect(hasProgress(source([c]), c)).toBe(true);
  });

  test.each<[string, Partial<Case>, Partial<OpenCaseSource>]>([
    ['Foto', { photoIds: ['foto-1'] }, {}],
    ['Kostenvoranschlag', { quoteId: 'angebot-1' }, {}],
    [
      'Schadenfall',
      { claim: { contractId: 'k', reportedAt: NOW, reportedBy: 'p', confirmationId: 'c' } },
      {},
    ],
    ['Chat', {}, { chatMessages: [chat] }],
    ['Videocall', {}, { videoSessions: [video] }],
    [
      'erledigter Schritt',
      { status: 'selbsthilfe', guideRunIds: ['anleitung-1'] },
      { guideRuns: { 'anleitung-1': run({ completedSteps: [0], currentStep: 1 }) } },
    ],
    [
      'beendete Anleitung',
      { status: 'selbsthilfe', guideRunIds: ['anleitung-1'] },
      { guideRuns: { 'anleitung-1': run({ endedAt: NOW, outcome: 'geht_nicht' }) } },
    ],
  ])('%s ist Fortschritt', (_name, patch, extra) => {
    const c = makeCase(patch);
    expect(hasProgress(source([c], extra), c)).toBe(true);
  });

  test('eine Anleitung, die ohne Schritt für ein anderes Problem endete, ist kein Fortschritt', () => {
    const c = makeCase({ status: 'selbsthilfe', guideRunIds: ['anleitung-1'] });
    const replaced = run({ endedAt: NOW });
    expect(hasProgress(source([c], { guideRuns: { 'anleitung-1': replaced } }), c)).toBe(false);
    const withStep = run({ endedAt: NOW, completedSteps: [0], currentStep: 1 });
    expect(hasProgress(source([c], { guideRuns: { 'anleitung-1': withStep } }), c)).toBe(true);
  });

  test('Chat und Videocall eines anderen Falls zählen nicht', () => {
    const c = makeCase();
    const s = source([c], {
      chatMessages: [{ ...chat, caseId: 'GS-2' }],
      videoSessions: [{ ...video, caseId: 'GS-2' }],
    });
    expect(hasProgress(s, c)).toBe(false);
  });
});

describe('isEmptyCase', () => {
  test('nur angelegt: leer', () => {
    const c = makeCase();
    expect(isEmptyCase(source([c]), c)).toBe(true);
  });

  test.each<[string, Partial<Case>, Partial<OpenCaseSource>]>([
    ['pausiert', { pausedAt: NOW }, {}],
    ['mit Ergebnis', { diagnosisIds: ['ergebnis-1'] }, {}],
    [
      'mit Anleitung',
      { status: 'selbsthilfe', guideRunIds: ['anleitung-1'] },
      { guideRuns: { 'anleitung-1': run() } },
    ],
    ['mit Foto', { photoIds: ['foto-1'] }, {}],
    ['mit Chat', {}, { chatMessages: [chat] }],
    ['eskaliert', { status: 'eskaliert' }, {}],
  ])('%s: nicht leer', (_name, patch, extra) => {
    const c = makeCase(patch);
    expect(isEmptyCase(source([c], extra), c)).toBe(false);
  });

  test('ein leerer Fall hat nie Fortschritt', () => {
    const c = makeCase();
    const s = source([c]);
    expect([isEmptyCase(s, c), hasProgress(s, c)]).toEqual([true, false]);
  });
});

describe('planOpenCase (Entscheidung Nr. 13)', () => {
  test('ohne offenen Fall: neu', () => {
    const s = source([makeCase({ status: 'erledigt' }), makeCase({ id: 'GS-2', deviceId: 'x' })]);
    expect(planOpenCase(s, 'geraet-1')).toEqual({ art: 'neu' });
  });

  test('ohne Fortschritt: der offene Fall bekommt das neue Problem', () => {
    const c = makeCase({ status: 'selbsthilfe', guideRunIds: ['anleitung-1'] });
    const s = source([c], { guideRuns: { 'anleitung-1': run() } });
    expect(planOpenCase(s, 'geraet-1')).toEqual({ art: 'ersetzt', caseId: 'GS-1' });
    expect(planOpenCase(s, 'geraet-1', { neuesProblem: true })).toEqual({
      art: 'ersetzt',
      caseId: 'GS-1',
    });
  });

  const withProgress: CaseStatus[] = [
    'offen',
    'selbsthilfe',
    'eskaliert',
    'freigabe_noetig',
    'freigegeben',
    'abgelehnt',
    'in_reparatur',
  ];

  test.each(withProgress)('mit Fortschritt in %s: ganz fragt', (status) => {
    const s = source([makeCase({ status, photoIds: ['foto-1'] })]);
    const canCancel = canTransition(status, 'abbrechen');
    expect(planOpenCase(s, 'geraet-1')).toEqual({
      art: 'frage_weitermachen',
      caseId: 'GS-1',
      canCancel,
    });
    // „Neues Problem melden“ bricht nur ab, wo die Regeln es erlauben, sonst bleibt die Frage
    expect(planOpenCase(s, 'geraet-1', { neuesProblem: true })).toEqual(
      canCancel
        ? { art: 'neu', cancel: 'GS-1' }
        : { art: 'frage_weitermachen', caseId: 'GS-1', canCancel: false },
    );
  });

  // Seit Nr. 34 lässt sich die Reparatur abbrechen. Mit Auftrag beim Betrieb geht das nur im Fall,
  // wo die Absage dabeisteht, nicht nebenbei über „Neues Problem melden“.
  test('ein Fall in der Reparatur mit Auftrag lässt sich nicht ersetzen, nur weitermachen', () => {
    const s = source([makeCase({ status: 'in_reparatur' })], {
      bookings: [repairBooking('angefragt')],
    });
    expect(planOpenCase(s, 'geraet-1', { neuesProblem: true, aendern: 'GS-1' })).toEqual({
      art: 'frage_weitermachen',
      caseId: 'GS-1',
      canCancel: false,
    });
  });

  test('ein bestätigter oder verbindlich gebuchter Termin ist ein Auftrag, eine Anfrage nicht', () => {
    const eskaliert = makeCase({ status: 'eskaliert', photoIds: ['foto-1'] });
    const visit = (extra: Partial<Booking>) =>
      source([eskaliert], {
        bookings: [{ ...repairBooking('angefragt'), kind: 'vor_ort_diagnose', ...extra }],
      });
    expect(planOpenCase(visit({}), 'geraet-1', { neuesProblem: true })).toEqual({
      art: 'neu',
      cancel: 'GS-1',
    });
    for (const extra of [
      { status: 'bestaetigt' as const },
      { binding: { at: NOW, amount: 7900 } },
    ]) {
      expect(planOpenCase(visit(extra), 'geraet-1', { neuesProblem: true })).toEqual({
        art: 'frage_weitermachen',
        caseId: 'GS-1',
        canCancel: false,
      });
    }
  });

  test('das Problem des offenen Falls ändern: derselbe Fall, auch mit Fortschritt', () => {
    const s = source([makeCase({ photoIds: ['foto-1'] })]);
    expect(planOpenCase(s, 'geraet-1', { aendern: 'GS-1' })).toEqual({
      art: 'ersetzt',
      caseId: 'GS-1',
    });
  });

  test('ändern gilt nur für den offenen Fall dieses Geräts und nur am Anfang', () => {
    const eskaliert = source([makeCase({ status: 'eskaliert' })]);
    expect(planOpenCase(eskaliert, 'geraet-1', { aendern: 'GS-1' }).art).toBe('frage_weitermachen');
    const other = source([makeCase({ photoIds: ['foto-1'] })]);
    expect(planOpenCase(other, 'geraet-1', { aendern: 'GS-2' }).art).toBe('frage_weitermachen');
  });
});

describe('Eine Definition je Regel', () => {
  const root = path.join(__dirname, '..', '..', '..');
  const SOURCE_DIRS = ['app', 'components', 'lib', 'model', 'services', 'store'];
  const files = (dir: string): string[] =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]))
      .filter((f) => /\.tsx?$/.test(f));
  const sources = SOURCE_DIRS.flatMap((d) => files(path.join(root, d))).map((f) => ({
    file: path.relative(root, f),
    text: fs.readFileSync(f, 'utf8'),
  }));

  test.each(['findOpenCase', 'hasProgress', 'isEmptyCase'])(
    '%s gibt es genau einmal, in model/policies/openCase.ts',
    (name) => {
      const definition = new RegExp(
        `function\\s+${name}\\b|\\b(const|let|var)\\s+${name}\\s*=|\\b${name}\\s*:\\s*\\(`,
      );
      const hits = sources.filter((s) => definition.test(s.text)).map((s) => s.file);
      expect(hits).toEqual([path.join('model', 'policies', 'openCase.ts')]);
    },
  );

  /** Anfang und Ende des Rumpfs von openCaseFor in store/appStore.ts */
  function openCaseForBody(text: string): [number, number] {
    // Die Umsetzung, nicht die Signatur in AppActions
    const head = /\bopenCaseFor:\s*\([^)]*\)\s*=>\s*\{/.exec(text);
    if (!head) return [-1, -1];
    const open = head.index + head[0].length - 1;
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === '{') depth++;
      if (text[i] === '}' && --depth === 0) return [open, i];
    }
    return [-1, -1];
  }

  test('createCase( steht in der App nur in openCaseFor', () => {
    const outside: string[] = [];
    for (const { file, text } of sources) {
      const [from, to] =
        file === path.join('store', 'appStore.ts') ? openCaseForBody(text) : [-1, -1];
      for (const m of text.matchAll(/\bcreateCase\(/g)) {
        if (m.index > from && m.index < to) continue;
        outside.push(`${file}:${text.slice(0, m.index).split('\n').length}`);
      }
    }
    expect(outside).toEqual([]);
    // Der Rumpf ist gefunden, und createCase( steht darin
    const store = sources.find((s) => s.file === path.join('store', 'appStore.ts'))!;
    const [from, to] = openCaseForBody(store.text);
    expect(store.text.slice(from, to)).toMatch(/\bcreateCase\(/);
  });
});
