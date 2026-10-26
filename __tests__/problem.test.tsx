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

describe('Etwas anderes (B-54)', () => {
  test('Freitext führt zu „Hilfe holen“', async () => {
    const r = await renderRouter(APP, { initialUrl: '/fall/neu' });
    await tap(new RegExp(`^${de.problem.other}`));
    await tap(de.problem.getHelp);
    expect(screen.getByText(de.problem.otherTooShort)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.problem.otherPlaceholder),
      'Die Maschine riecht verbrannt.',
    );
    await tap(de.problem.getHelp);
    expect(r.getPathname()).toBe('/fall/GS-24817/hilfe');
    expect(useAppStore.getState().cases['GS-24817']).toMatchObject({
      entry: 'freitext',
      status: 'eskaliert',
      problemLabel: 'Die Maschine riecht verbrannt.',
    });
  });
});

describe('Entwürfe', () => {
  test('wer „Problem melden“ ohne Inhalt verlässt, hinterlässt keinen Fall', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    await tap(pill);
    await tap(new RegExp(`^${de.problems[0]!.label}`));
    expect(Object.keys(useAppStore.getState().cases)).toHaveLength(1);
    await tap(de.a11y.back);
    await tap(de.a11y.back);
    expect(r.getPathname()).toBe('/');
    expect(Object.keys(useAppStore.getState().cases)).toHaveLength(0);
  });

  test('ein zweiter Versuch nutzt denselben Entwurf', async () => {
    await renderRouter(APP, { initialUrl: '/' });
    await tap(pill);
    await tap(new RegExp(`^${de.problems[0]!.label}`));
    await tap(de.a11y.back);
    await tap(new RegExp(`^${de.problems[2]!.label}`));
    const cases = Object.values(useAppStore.getState().cases);
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({ entry: 'symptom', status: 'selbsthilfe' });
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

  test('der Code enthält keine Web-Adressen und keinen Chat', () => {
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
    const hits = files.filter((f) =>
      /https?:\/\/|claude\.ai|chatten/i.test(fs.readFileSync(f, 'utf8')),
    );
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
