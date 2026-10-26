import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { createAppStore, useAppStore } from '@/store/appStore';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const ablauf = guides.ablauf;

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
  setup();
});

async function openGuide(guideIndex = 1) {
  const r = await renderRouter(APP, { initialUrl: '/' });
  await tap(new RegExp(`^${de.home.searchTitle}`));
  await tap(new RegExp(`^${de.problems[0]!.label}`));
  await tap(new RegExp(`^${de.displayMessages[guideIndex]!.code}`));
  return r;
}

const run = () => Object.values(useAppStore.getState().guideRuns)[0]!;

describe('Anleitung', () => {
  test('Schritt 4 übersteht den Neustart: ein frischer Store liest ihn aus dem Speicher', async () => {
    await openGuide();
    for (let i = 0; i < 3; i++) await tap(de.guide.done);
    expect(screen.getByText(ablauf.steps[3]!.t)).toBeTruthy();
    await act(async () => {});
    const fresh = createAppStore(AsyncStorage);
    await fresh.persist.rehydrate();
    const restored = Object.values(fresh.getState().guideRuns)[0];
    expect(restored).toMatchObject({
      guideId: 'ablauf',
      currentStep: 3,
      completedSteps: [0, 1, 2],
    });
    expect(fresh.getState().cases['GS-24817']?.status).toBe('selbsthilfe');
  });

  test('nach dem Neustart zeigt die Startseite den Fall, ein Tap führt zu Schritt 4', async () => {
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId: s.devices[0]!.id,
      entry: 'meldung',
      problemLabel: ablauf.title,
    });
    const g = s.startGuide(c.id, 'ablauf');
    for (let i = 0; i < 3; i++) s.moveGuideStep(g.id, 'next');
    s.pauseCase(c.id);
    const r = await renderRouter(APP, { initialUrl: '/' });
    expect(screen.getByText(de.a11y.stepOf(4, 7))).toBeTruthy();
    await tap(de.home.continueCase);
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    expect(screen.getByText(ablauf.steps[3]!.t)).toBeTruthy();
    expect(useAppStore.getState().cases['GS-24817']?.pausedAt).toBeUndefined();
  });

  test('Zurück geht einen Schritt zurück, in Schritt 1 aus der Anleitung heraus', async () => {
    const r = await openGuide();
    await tap(de.guide.done);
    await tap(de.guide.done);
    expect(screen.getByText(ablauf.steps[2]!.t)).toBeTruthy();
    await tap(de.a11y.back);
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    expect(screen.getByText(ablauf.steps[1]!.t)).toBeTruthy();
    expect(run().currentStep).toBe(1);
    await tap(de.a11y.back);
    expect(screen.getByText(ablauf.steps[0]!.t)).toBeTruthy();
    await tap(de.a11y.back);
    expect(r.getPathname()).toBe('/fall/GS-24817/meldungen');
    const types = useAppStore.getState().events.map((e) => e.type);
    expect(types.filter((x) => x === 'schritt_zurueck')).toHaveLength(2);
  });

  test('Android-Zurück geht ebenfalls einen Schritt zurück', async () => {
    type Handler = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: Handler[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, h) => {
      listeners.push(h);
      return { remove: () => listeners.splice(listeners.indexOf(h), 1) };
    });
    const r = await openGuide();
    await tap(de.guide.done);
    await act(async () => {
      [...listeners].reverse().some((l) => l({} as Parameters<Handler>[0]));
    });
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    expect(screen.getByText(ablauf.steps[0]!.t)).toBeTruthy();
    spy.mockRestore();
  });

  test('„Geht nicht“ speichert den Abbruchschritt und die Notiz', async () => {
    const r = await openGuide();
    for (let i = 0; i < 4; i++) await tap(de.guide.done);
    await tap(de.guide.notWorking);
    await fireEvent.changeText(
      screen.getByPlaceholderText(de.guide.notePlaceholder),
      'Pumpenflügel klemmt',
    );
    await tap(de.guide.getHelp);
    expect(r.getPathname()).toBe('/fall/GS-24817/hilfe');
    expect(run()).toMatchObject({
      outcome: 'geht_nicht',
      abortedAtStep: 4,
      abortNote: 'Pumpenflügel klemmt',
      completedSteps: [0, 1, 2, 3],
    });
    expect(useAppStore.getState().cases['GS-24817']?.status).toBe('eskaliert');
  });

  test('Störung endet mit „Läuft wieder“ oder „Läuft noch nicht“', async () => {
    const r = await openGuide();
    for (let i = 0; i < ablauf.steps.length - 1; i++) await tap(de.guide.done);
    expect(screen.getByText(de.guide.question)).toBeTruthy();
    expect(screen.queryByRole('button', { name: de.guide.finished })).toBeNull();
    await tap(de.guide.runsAgain);
    expect(r.getPathname()).toBe('/fall/GS-24817/abschluss');
    expect(useAppStore.getState().cases['GS-24817']).toMatchObject({
      status: 'erledigt',
      resolution: 'selbst_geloest',
    });
  });

  test('Pflege endet mit „Fertig“ und einem Eintrag im Fall', async () => {
    const device = useAppStore.getState().devices[0]!;
    const r = await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
    await tap(new RegExp(`^${de.maintenance[0]!.title}`));
    await tap(de.guide.done);
    expect(screen.queryByText(de.guide.question)).toBeNull();
    expect(screen.queryByRole('button', { name: de.guide.runsAgain })).toBeNull();
    await tap(de.guide.finished);
    expect(r.getPathname()).toBe('/');
    expect(useAppStore.getState().cases['GS-24817']).toMatchObject({
      status: 'erledigt',
      resolution: 'pflege_erledigt',
      entry: 'pflege',
    });
  });

  test('Warnhinweise stehen vor dem Schritttext', async () => {
    await openGuide();
    await tap(de.guide.done);
    const step = ablauf.steps[1]!;
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf(de.ds.attention)).toBeGreaterThan(-1);
    expect(json.indexOf(step.w!)).toBeLessThan(json.indexOf(step.d));
  });

  test('Waterproof: erst „Der Wasserhahn ist zu“ bestätigen, dann Hilfe holen', async () => {
    const r = await openGuide(2);
    const help = screen.getByRole('button', { name: de.guide.getHelp });
    expect(help).toBeDisabled();
    await tap(de.guide.getHelp);
    expect(screen.getByText(de.guide.confirmFirst(de.guide.confirm.waterproof))).toBeTruthy();
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    await fireEvent.press(screen.getByRole('checkbox', { name: de.guide.confirm.waterproof }));
    await tap(de.guide.getHelp);
    expect(r.getPathname()).toBe('/fall/GS-24817/hilfe');
    expect(useAppStore.getState().events.map((e) => e.type)).toContain('sicherheit_bestaetigt');
  });

  test('„Später weitermachen“ aus Schritt 3 verlässt den Fall und behält den Schritt', async () => {
    const r = await openGuide();
    await tap(de.guide.done);
    await tap(de.guide.done);
    await tap(de.a11y.close);
    await tap(de.closeCase.later);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(r.getPathname()).toBe('/');
    expect(run().currentStep).toBe(2);
    expect(useAppStore.getState().cases['GS-24817']?.pausedAt).toBeDefined();
  });
});
