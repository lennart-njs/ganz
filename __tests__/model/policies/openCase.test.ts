import fs from 'fs';
import path from 'path';

import {
  findOpenCase,
  hasProgress,
  isEmptyCase,
  type OpenCaseSource,
} from '@/model/policies/openCase';
import type { Case, CaseStatus, ChatMessage, GuideRun, VideoSession } from '@/model/types';

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
});
