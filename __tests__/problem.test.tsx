import * as fs from 'fs';
import * as path from 'path';
import { Linking } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { latestGuideRun } from '@/lib/caseView';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { caseInRepair, photoCase } from '@/test/regressions';

let taps = 0;
const tap = async (name: string | RegExp) => {
  taps += 1;
  await fireEvent.press(screen.getByRole('button', { name }));
};

function setup() {
  useAppStore.getState().reset();
  useAppStore.setState({ onboardingDone: true });
  return useAppStore.getState().addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
  });
}

beforeEach(() => {
  taps = 0;
  setup();
});

const pill = new RegExp(`^${de.home.searchTitle}`);

describe('Taps bis zur ersten Hilfe (Review 5.1)', () => {
  test('Symptom → erster Schritt: 2 Taps', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await tap(pill);
    await tap(new RegExp(`^${de.problems[1]!.label}`));
    expect(taps).toBe(2);
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    const s = useAppStore.getState();
    expect(s.cases['GS-24817']?.status).toBe('selbsthilfe');
    expect(Object.values(s.guideRuns)[0]?.guideId).toBe('nass');
  });

  test('Meldung im Display → erster Schritt: 3 Taps', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await tap(pill);
    await tap(new RegExp(`^${de.problems[0]!.label}`));
    await tap(new RegExp(`^${de.displayMessages[1]!.code}`));
    expect(taps).toBe(3);
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    const s = useAppStore.getState();
    expect(s.cases['GS-24817']).toMatchObject({ entry: 'meldung', problemLabel: 'Wasserablauf' });
    expect(s.diagnoses[0]).toMatchObject({
      displayMessage: 'Wasserablauf',
      source: 'nutzerangabe',
    });
    expect(Object.values(s.guideRuns)[0]?.guideId).toBe('ablauf');
  });
});

describe('Eigene Worte (B-54)', () => {
  test('gehen an den Reparatur-Assistenten, ohne Einwilligung als Notiz an die Fachkraft', async () => {
    const r = await renderRouter(APP, { initialUrl: '/fall/neu' });
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.appliance.waschmaschine.otherPlaceholder),
      'Ja',
    );
    await tap(de.chat.send);
    expect(screen.getByText(de.problem.otherTooShort)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.appliance.waschmaschine.otherPlaceholder),
      'Die Maschine riecht verbrannt.',
    );
    await tap(de.chat.send);
    // Weiter im Gespräch des Falls, der Assistent fragt zuerst nach der Einwilligung
    expect(r.getPathname()).toBe('/fall/GS-24817');
    expect(screen.getByText(de.chat.consentTitle)).toBeTruthy();
    await tap(de.chat.consentDecline);
    expect(useAppStore.getState().cases['GS-24817']).toMatchObject({
      entry: 'freitext',
      status: 'eskaliert',
      problemLabel: 'Die Maschine riecht verbrannt.',
    });
    expect(useAppStore.getState().events.at(-1)?.type).not.toBe('assistent_gefragt');
    expect(
      useAppStore
        .getState()
        .events.some(
          (e) =>
            e.type === 'rueckfrage_beantwortet' &&
            e.payload.answer === 'Die Maschine riecht verbrannt.',
        ),
    ).toBe(true);
    expect(useAppStore.getState().chatMessages).toHaveLength(0);
  });
});

describe('Entwürfe', () => {
  test('wer den Fall ohne Inhalt verlässt, hinterlässt keinen Fall', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await tap(pill);
    await tap(new RegExp(`^${de.problem.photo}`));
    expect(Object.keys(useAppStore.getState().cases)).toHaveLength(1);
    await tap(de.a11y.back);
    await tap(de.a11y.back);
    expect(r.getPathname()).toBe('/');
    expect(Object.keys(useAppStore.getState().cases)).toHaveLength(0);
  });

  test('ein neuer Versuch ohne Fortschritt ersetzt den Fall (ein offener Fall pro Gerät)', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await tap(pill);
    await tap(new RegExp(`^${de.problems[1]!.label}`));
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    await tap(de.a11y.back);
    await tap(de.a11y.back);
    expect(r.getPathname()).toBe('/');
    await tap(pill);
    await tap(new RegExp(`^${de.problems[2]!.label}`));
    const open = Object.values(useAppStore.getState().cases).filter(
      (c) => c.status !== 'abgebrochen',
    );
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ entry: 'symptom', problemLabel: 'Tür geht nicht auf' });
  });

  test('mit Fortschritt fragt ganz: weitermachen oder neues Problem', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await tap(pill);
    await tap(new RegExp(`^${de.problems[1]!.label}`));
    await tap(de.guide.done);
    await tap(de.a11y.close);
    await tap(de.closeCase.later);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    await tap(pill);
    expect(screen.getByText(de.thread.runningCase('Wäsche noch nass'))).toBeTruthy();
    await tap(de.thread.continueCase);
    expect(r.getPathname()).toBe('/fall/GS-24817');
    await tap(de.a11y.back);
    await tap(pill);
    await tap(de.thread.newProblem);
    await tap(new RegExp(`^${de.problems[2]!.label}`));
    const s = useAppStore.getState();
    expect(s.cases['GS-24817']).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.thread.newProblemReason,
    });
    expect(s.cases['GS-24818']).toMatchObject({ status: 'selbsthilfe' });
  });
});

describe('Ein offener Fall pro Gerät (Entscheidung Nr. 13)', () => {
  test('in der Reparatur: nur „Weitermachen“ mit Satz dazu, das setzt auch eine Pause fort', async () => {
    const device = useAppStore.getState().devices[0]!;
    const id = caseInRepair(device.id);
    useAppStore.getState().pauseCase(id);
    const r = await renderRouter(APP, { initialUrl: '/fall/neu' });
    expect(screen.getByText(de.thread.runningCaseOnlyContinue)).toBeTruthy();
    expect(screen.queryByText(de.thread.runningCaseAsk)).toBeNull();
    expect(screen.queryByRole('button', { name: de.thread.newProblem })).toBeNull();
    // Kein Eingabefeld, solange die Frage offen ist
    expect(screen.queryByPlaceholderText(de.appliance.waschmaschine.otherPlaceholder)).toBeNull();
    await tap(de.thread.continueCase);
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(useAppStore.getState().cases[id]).toMatchObject({ status: 'in_reparatur' });
    expect(useAppStore.getState().cases[id]?.pausedAt).toBeUndefined();
  });

  test('„Passt nicht“: derselbe Fall mit Foto, das andere Symptom startet seine Anleitung', async () => {
    const device = useAppStore.getState().devices[0]!;
    const id = photoCase(device.id, 'ablauf');
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(de.result.doesNotFit);
    expect(r.getPathname()).toBe('/fall/neu');
    expect(screen.queryByText(de.thread.runningCase(guides.ablauf.title))).toBeNull();
    await tap(new RegExp(`^${de.problems[2]!.label}`));
    expect(r.getPathname()).toBe(`/fall/${id}/anleitung`);
    const s = useAppStore.getState();
    expect(Object.keys(s.cases)).toEqual([id]);
    expect(s.cases[id]).toMatchObject({
      status: 'selbsthilfe',
      entry: 'symptom',
      problemLabel: guides.tuer.title,
      photoIds: [expect.any(String)],
    });
    expect(latestGuideRun(s, s.cases[id]!)?.guideId).toBe('tuer');
  });
});

describe('Kein Link verlässt die App', () => {
  test('Problem melden und Meldungen öffnen nichts außerhalb', async () => {
    const spy = jest.spyOn(Linking, 'openURL');
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    await tap(new RegExp(`^${de.problems[0]!.label}`));
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(spy).not.toHaveBeenCalled();
  });

  // Der Chat ist seit dem Review nach Schritt 14 gewollt (docs/ENTSCHEIDUNGEN.md), Links bleiben verboten.
  test('der Code enthält keine Web-Adressen', () => {
    const root = path.resolve(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
      }
    };
    ['app', 'components', 'i18n', 'config'].forEach((d) => walk(path.join(root, d)));
    const hits = files.filter((f) => /https?:\/\/|claude\.ai/i.test(fs.readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});

test('Pflege aus dem Gerätedetail startet einen Pflege-Fall', async () => {
  const device = useAppStore.getState().devices[0]!;
  const r = await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
  await act(async () => {});
  await tap(new RegExp(`^${de.maintenance[0]!.title}`));
  expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
  expect(useAppStore.getState().cases['GS-24817']).toMatchObject({ entry: 'pflege' });
});

describe('Pflege aus dem Gerätedetail bei einem laufenden Fall (Entscheidung Nr. 13)', () => {
  const row = new RegExp(`^${de.maintenance[0]!.title}`);

  /** Ein Fall nach „Hilfe holen“, dann das Gerätedetail */
  async function withRunningCase() {
    const s = useAppStore.getState();
    const device = s.devices[0]!;
    const c = s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Tür klemmt' });
    s.escalate(c.id);
    const r = await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
    await act(async () => {});
    return { id: c.id, r };
  }

  test('ganz fragt zuerst, „Weitermachen“ führt ins Gespräch des laufenden Falls', async () => {
    const { id, r } = await withRunningCase();
    await tap(row);
    expect(r.getPathname()).toBe('/fall/neu');
    expect(screen.getByText(de.maintenance[0]!.title)).toBeTruthy();
    expect(screen.getByText(de.thread.runningCase('Tür klemmt'))).toBeTruthy();
    expect(screen.getByText(de.thread.runningCaseAsk)).toBeTruthy();
    await tap(de.thread.continueCase);
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(Object.keys(useAppStore.getState().cases)).toEqual([id]);
  });

  test('„Neues Problem melden“ bricht den Fall ab und startet die Pflege', async () => {
    const { id, r } = await withRunningCase();
    await tap(row);
    await tap(de.thread.newProblem);
    const s = useAppStore.getState();
    const pflege = Object.values(s.cases).find((c) => c.id !== id)!;
    expect(r.getPathname()).toBe(`/fall/${pflege.id}/anleitung`);
    expect(s.cases[id]).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.thread.newProblemReason,
    });
    expect(pflege).toMatchObject({ entry: 'pflege', status: 'selbsthilfe' });
    expect(latestGuideRun(s, pflege)?.guideId).toBe(de.maintenance[0]!.guideId);
  });
});

test('Fälle des Geräts: ein pausierter Fall geht beim Öffnen weiter', async () => {
  const s = useAppStore.getState();
  const device = s.devices[0]!;
  const c = s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Tür klemmt' });
  s.escalate(c.id);
  s.pauseCase(c.id);
  const r = await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
  await act(async () => {});
  await tap(new RegExp(`^Tür klemmt, ${de.caseStatus.eskaliert}`));
  expect(r.getPathname()).toBe(`/fall/${c.id}`);
  expect(useAppStore.getState().cases[c.id]?.pausedAt).toBeUndefined();
});

describe('Problem melden als Gespräch', () => {
  test('bei mehreren Geräten fragt ganz zuerst nach dem Gerät, der Stift ändert die Antwort', async () => {
    const s = useAppStore.getState();
    s.addDevice({
      manufacturerId: 'miele',
      category: 'kuehlschrank',
      model: 'K 7000',
      identifiedBy: 'manuell',
    });
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    expect(screen.getByText(de.talk.problem.whichDevice)).toBeTruthy();
    await tap(/^Miele K 7000/);
    // Kühlschrank: eigene Symptome, keine Display-Meldungen
    expect(
      screen.getByRole('button', {
        name: new RegExp(`^${de.appliance.kuehlschrank.symptoms[0]!.label}`),
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: new RegExp(`^${de.problems[0]!.label}`) }),
    ).toBeNull();
    await tap(de.talk.edit('Miele K 7000'));
    await tap(/^Miele WKB 130/);
    expect(
      screen.getByRole('button', { name: new RegExp(`^${de.problems[0]!.label}`) }),
    ).toBeTruthy();
  });

  test('Meldung im Display: Antwort steht im Gespräch und lässt sich ändern', async () => {
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    await tap(new RegExp(`^${de.problems[0]!.label}`));
    expect(screen.getByText(de.talk.problem.whichMessage)).toBeTruthy();
    await tap(de.talk.edit(de.problems[0]!.label));
    expect(screen.queryByText(de.talk.problem.whichMessage)).toBeNull();
    expect(screen.getByRole('button', { name: new RegExp(`^${de.problem.photo}`) })).toBeTruthy();
  });
});
