import * as fs from 'fs';
import * as path from 'path';
import { Linking } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';
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
