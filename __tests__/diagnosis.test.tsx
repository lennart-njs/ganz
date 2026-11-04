import { Linking } from 'react-native';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { CASE_FILE_CARD } from '@/components/app/CaseFileCard';
import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { latestDiagnosis } from '@/lib/caseView';
import { chatContext } from '@/lib/chat/context';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import * as regressions from '@/test/regressions';
import { unwrap } from '@/test/result';

const cameraMock = jest.requireMock('expo-camera').__permission;
let taps = 0;
const tap = async (name: string | RegExp) => {
  taps += 1;
  await fireEvent.press(screen.getByRole('button', { name }));
};
const flush = async () => {
  for (let i = 0; i < 10; i++) await act(async () => {});
};

beforeEach(() => {
  taps = 0;
  cameraMock.current = { granted: true, canAskAgain: true, status: 'granted' };
  useAppStore.getState().reset();
  useAppStore.setState({ onboardingDone: true });
  useAppStore.getState().linkContract('vertragsnummer');
  useAppStore.getState().addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
});

async function photoFlow(mode: 'display' | 'typenschild' | 'bauteil' = 'display') {
  const r = await renderRouter(APP, { initialUrl: '/' });
  await tap(new RegExp(`^${de.home.searchTitle}`));
  await tap(new RegExp(`^${de.problem.photo}`));
  if (mode !== 'display') {
    await fireEvent.press(screen.getByRole('radio', { name: de.camera.modes[mode] }));
  }
  await tap(de.camera.shutter);
  await flush();
  return r;
}

describe('Mock der Fehlererkennung', () => {
  test('die drei Modi liefern verschiedene Ergebnisse', async () => {
    const display = await services.diagnosis.analyze({ mode: 'display', scenario: 'standard' });
    const bauteil = await services.diagnosis.analyze({ mode: 'bauteil', scenario: 'standard' });
    const typenschild = await services.diagnosis.analyze({
      mode: 'typenschild',
      scenario: 'standard',
    });
    expect(display).toMatchObject({ errorPattern: 'wasserablauf', confidence: 'hoch' });
    expect(bauteil).toMatchObject({ errorPattern: 'laugenpumpe_blockiert', confidence: 'mittel' });
    expect(typenschild).toEqual({ kind: 'geraet' });
  });

  test('Szenarien „unsicher“ und „unscharf“', async () => {
    expect(await services.diagnosis.analyze({ mode: 'display', scenario: 'unsicher' })).toEqual({
      kind: 'rueckfrage',
      question: 'wasser',
    });
    expect(await services.diagnosis.analyze({ mode: 'bauteil', scenario: 'unscharf' })).toEqual({
      kind: 'fehler',
      reason: 'unscharf',
    });
  });
});

describe('Foto → Ergebnis', () => {
  test('Display: Laugenfilter, Sicherheit hoch, 4 Taps bis zum ersten Schritt', async () => {
    const r = await photoFlow('display');
    // Das Ergebnis steht im Gespräch des Falls
    expect(r.getPathname()).toBe('/fall/GS-24817');
    expect(screen.getByText(de.result.headline.wasserablauf)).toBeTruthy();
    expect(screen.getByText(de.ds.confidenceLabel('hoch'))).toBeTruthy();
    await tap(new RegExp(`^${de.result.startGuide}`));
    expect(taps).toBe(4);
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
  });

  test('Bauteil: Laugenpumpe, Sicherheit mittel', async () => {
    await photoFlow('bauteil');
    expect(screen.getByText(de.result.headline.laugenpumpe_blockiert)).toBeTruthy();
    expect(screen.getByText(de.ds.confidenceLabel('mittel'))).toBeTruthy();
  });

  test('Typenschild: Gerät erkannt, keine Diagnose', async () => {
    await photoFlow('typenschild');
    expect(screen.getByText(de.result.deviceTitle)).toBeTruthy();
    expect(screen.queryByText(de.result.headline.wasserablauf)).toBeNull();
  });

  test('jedes Foto hat Zeitstempel, Gerät, Zweck und Fall', async () => {
    await photoFlow('bauteil');
    const s = useAppStore.getState();
    const photo = s.photos[0]!;
    expect(photo).toMatchObject({
      caseId: 'GS-24817',
      deviceId: s.devices[0]!.id,
      purpose: 'bauteil',
      source: 'in_app_camera',
      uri: 'file:///test.jpg',
    });
    expect(new Date(photo.takenAt).toString()).not.toBe('Invalid Date');
    expect(s.events.find((e) => e.type === 'foto_aufgenommen')?.payload.photoId).toBe(photo.id);
  });

  test('„unsicher“ zeigt die Rückfrage, die Antwort wählt die Anleitung', async () => {
    useAppStore.getState().setDemo({ diagnosisScenario: 'unsicher' });
    const r = await photoFlow('display');
    // ganz fragt im Gespräch nach
    expect(r.getPathname()).toBe('/fall/GS-24817');
    expect(screen.getByText(de.question.wasser)).toBeTruthy();
    await tap(de.question.answers.zulauf);
    expect(screen.getByText(de.result.headline.wasserzulauf)).toBeTruthy();
    expect(useAppStore.getState().diagnoses.at(-1)?.guideId).toBe('zulauf');
  });

  test('„Weiß ich nicht“ führt zu „Hilfe holen“', async () => {
    useAppStore.getState().setDemo({ diagnosisScenario: 'unsicher' });
    const r = await photoFlow('display');
    await tap(de.question.answers.unklar);
    expect(r.getPathname()).toBe('/fall/GS-24817');
    expect(screen.getByText(de.thread.helpIntro)).toBeTruthy();
    expect(useAppStore.getState().cases['GS-24817']?.status).toBe('eskaliert');
  });

  test('„unscharf“: Fehler und neues Foto', async () => {
    useAppStore.getState().setDemo({ diagnosisScenario: 'unscharf' });
    const r = await photoFlow('display');
    expect(screen.getByText(de.analysis.blurryTitle)).toBeTruthy();
    await tap(de.analysis.newPhoto);
    expect(r.getPathname()).toBe('/fall/GS-24817/kamera');
  });

  test('„Passt nicht“ führt zurück zu „Problem melden“', async () => {
    const r = await photoFlow('display');
    await tap(de.result.doesNotFit);
    expect(r.getPathname()).toBe('/fall/neu');
  });

  test('Details: Anleitung, „Passt nicht“ und Hilfe nur, solange die Regeln sie erlauben', async () => {
    await photoFlow('display');
    await act(async () => router.push('/fall/GS-24817/ergebnis'));
    expect(screen.getByRole('button', { name: de.result.startGuide })).toBeTruthy();
    expect(screen.getByRole('button', { name: de.result.doesNotFit })).toBeTruthy();
    expect(screen.getByRole('button', { name: de.result.helpInstead })).toBeTruthy();
    // Nach „Hilfe holen“ bleibt das Ergebnis lesbar, ohne die Wege der Selbsthilfe
    await act(async () => useAppStore.getState().escalate('GS-24817'));
    expect(screen.getByText(de.result.headline.wasserablauf)).toBeTruthy();
    for (const name of [de.result.startGuide, de.result.doesNotFit, de.result.helpInstead]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  test('Details → „Anleitung starten“ geht in der laufenden Anleitung weiter (B-05)', async () => {
    const r = await photoFlow('display');
    const s = useAppStore.getState();
    const run = unwrap(s.startGuide('GS-24817', 'ablauf'));
    s.moveGuideStep(run.id, 'next');
    s.moveGuideStep(run.id, 'next');
    await act(async () => router.push('/fall/GS-24817/ergebnis'));
    // Die Leiste sagt, wo es weitergeht
    expect(screen.getByText(de.a11y.stepOf(3, guides.ablauf.steps.length))).toBeTruthy();
    await tap(de.result.startGuide);
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    const after = useAppStore.getState();
    expect(after.cases['GS-24817']?.guideRunIds).toEqual([run.id]);
    expect(after.guideRuns[run.id]).toMatchObject({ currentStep: 2, completedSteps: [0, 1] });
  });

  test('Kamera abgelehnt: Hinweis und Link zu den Einstellungen', async () => {
    cameraMock.current = { granted: false, canAskAgain: false, status: 'denied' };
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderRouter(APP, { initialUrl: '/' });
    await tap(new RegExp(`^${de.home.searchTitle}`));
    await tap(new RegExp(`^${de.problem.photo}`));
    expect(screen.getByText(de.camera.deniedTitle)).toBeTruthy();
    await tap(de.camera.openSettings);
    expect(spy).toHaveBeenCalled();
  });
});

describe('Kein Text sagt Kosten zu', () => {
  const forbidden =
    /übernimmt die Kosten(?! nicht)|kostet dich (das )?nichts|trägt alles|fallen keine Kosten|keine Kosten an|kostenlos repariert/i;

  function strings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (typeof value === 'function') {
      const out = (value as (...a: string[]) => unknown)('X', 'Y', 'Z');
      return typeof out === 'string' ? [out] : [];
    }
    if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
    return [];
  }

  test('in i18n/de.ts steht keine Kostenzusage', () => {
    expect(strings(de).filter((s) => forbidden.test(s))).toEqual([]);
  });

  test('das Ergebnis nennt Prüfung und Selbstbeteiligung', async () => {
    await photoFlow('display');
    expect(screen.getByText(de.result.costNote('Kranich', '0 €'))).toBeTruthy();
  });
});

describe('„Passt nicht“ verwirft das Ergebnis', () => {
  /** Startseite → Foto → Ergebnis → „Passt nicht“ → anderes Symptom, wie R-04 */
  async function rejectedResult() {
    regressions.start();
    regressions.addWasher();
    const r = await renderRouter(APP, { initialUrl: '/' });
    await regressions.tap(new RegExp(`^${de.home.searchTitle}`));
    await regressions.tap(new RegExp(`^${de.problem.photo}`));
    await regressions.tap(de.camera.shutter);
    await regressions.flush(10);
    const id = 'GS-24817';
    expect(r.getPathname()).toBe(`/fall/${id}`);
    await regressions.tap(de.result.doesNotFit);
    await regressions.tap(new RegExp(`^${de.problems[2]!.label}`));
    await regressions.flush();
    return { id, r };
  }

  test('Assistent, Fachkraft und Versicherer bekommen das abgelehnte Ergebnis nicht mehr', async () => {
    const { id } = await rejectedResult();
    const s = useAppStore.getState();
    const c = s.cases[id]!;
    expect(c.problemLabel).toBe(de.problems[2]!.label);
    // Das Ergebnis bleibt im Verlauf, gilt aber nicht mehr
    const old = s.diagnoses.find((d) => d.caseId === id && d.source === 'fehlererkennung');
    expect(old?.discardedAt).toBeDefined();
    expect(latestDiagnosis(s, c, 'fehlererkennung')).toBeUndefined();
    expect(chatContext(s, id)).toMatchObject({
      problem: de.problems[2]!.label,
      errorPattern: undefined,
      displayMessage: undefined,
    });
    // Vorschau für die Fachkraft im Gespräch: ohne Zeile „Ergebnis“
    await act(async () => {
      unwrap(useAppStore.getState().escalate(id));
      router.replace(`/fall/${id}`);
    });
    const card = within(screen.getByTestId(CASE_FILE_CARD));
    expect(card.getByText(de.help.facts.problem)).toBeTruthy();
    expect(card.queryByText(de.help.facts.result)).toBeNull();
  });

  test('im Gespräch bleibt das verworfene Ergebnis stehen, aber ohne „Details“', async () => {
    const { id, r } = await rejectedResult();
    await act(async () => router.replace(`/fall/${id}`));
    await regressions.flush();
    expect(r.getPathname()).toBe(`/fall/${id}`);
    // Die Überschrift des Ergebnisses steht noch im Verlauf
    expect(screen.getAllByText(de.result.headline.wasserablauf).length).toBeGreaterThan(0);
    // „Details“ öffnete sonst „Noch kein Ergebnis.“
    expect(screen.queryByTestId('details-ergebnis')).toBeNull();
  });

  test('ein neues Foto im selben Fall ist wieder das Ergebnis', async () => {
    const { id } = await rejectedResult();
    await act(async () => {
      unwrap(
        useAppStore.getState().addDiagnosis({
          caseId: id,
          photoIds: [],
          mode: 'display',
          errorPattern: 'wasserablauf',
          confidence: 'hoch',
          confidenceScore: 1,
          source: 'fehlererkennung',
        }),
      );
    });
    const s = useAppStore.getState();
    expect(latestDiagnosis(s, s.cases[id]!, 'fehlererkennung')?.discardedAt).toBeUndefined();
    expect(chatContext(s, id)?.errorPattern).toBe('wasserablauf');
  });
});
