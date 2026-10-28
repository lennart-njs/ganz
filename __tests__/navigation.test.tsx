import { BackHandler } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';

// '' ist das Gespräch des Falls, die anderen sind Vollbild-Schritte und die Fallakte
const caseScreens = ['', 'kamera', 'analyse', 'anleitung', 'warteraum', 'videocall', 'fallakte'];

// Vor renderRouter ohne act(): Der Store wird direkt gesetzt.
function finishOnboarding() {
  useAppStore.setState({ onboardingDone: true });
  useAppStore.getState().addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'manuell',
  });
}

beforeEach(() => {
  useAppStore.getState().reset();
});

describe('Onboarding', () => {
  test('beim ersten Start kommt das Onboarding, danach die Tabs', async () => {
    const r = await renderRouter(APP, { initialUrl: '/' });
    expect(r.getPathname()).toBe('/willkommen');
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.start }));
    expect(r.getPathname()).toBe('/schutz');
    await fireEvent.press(screen.getByRole('button', { name: de.common.later }));
    expect(r.getPathname()).toBe('/geraet-bestaetigen');
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.skipDevice }));
    expect(r.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: de.home.myDevices })).toBeTruthy();
  });

  test('ohne Onboarding sind Fall-Screens gesperrt', async () => {
    const r = await renderRouter(APP, { initialUrl: '/fall/GS-24817/fallakte' });
    expect(r.getPathname()).toBe('/willkommen');
  });
});

describe('Tabs', () => {
  // Auf iOS haben Tabs die Rolle „button“ (Fix in React Navigation), auf Android „tab“.
  test('drei Tabs: Geräte, Fälle, Profil', async () => {
    finishOnboarding();
    const r = await renderRouter(APP, { initialUrl: '/' });
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${de.tabs.cases}`) }));
    expect(r.getPathname()).toBe('/faelle');
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${de.tabs.profile}`) }));
    expect(r.getPathname()).toBe('/profil');
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${de.tabs.devices}`) }));
    expect(r.getPathname()).toBe('/');
  });
});

describe('Jeder Screen hat einen Ausweg', () => {
  test.each(caseScreens)('Fall-Screen %s: Zurück und Schließen', async (name) => {
    finishOnboarding();
    const s = useAppStore.getState();
    s.createCase({ deviceId: s.devices[0]!.id, entry: 'foto', problemLabel: 'Wasserablauf' });
    await renderRouter(APP, { initialUrl: `/fall/GS-24817${name ? `/${name}` : ''}` });
    expect(screen.getByRole('button', { name: de.a11y.back })).toBeTruthy();
    expect(screen.getByRole('button', { name: de.a11y.close })).toBeTruthy();
  });

  test.each(['/fall/neu', '/geraet/geraet-demo', '/geraet/neu', '/galerie'])(
    '%s: Zurück',
    async (url) => {
      finishOnboarding();
      await renderRouter(APP, { initialUrl: url });
      expect(screen.getAllByRole('button', { name: de.a11y.back }).length).toBeGreaterThan(0);
    },
  );

  test('Schließen-Sheet: „Später weitermachen“ pausiert den Fall und führt zu den Tabs', async () => {
    finishOnboarding();
    const c = useAppStore
      .getState()
      .createCase({ deviceId: 'd', entry: 'foto', problemLabel: 'Wasserablauf' });
    const r = await renderRouter(APP, { initialUrl: '/' });
    await act(async () => {
      require('expo-router').router.push(`/fall/${c.id}`);
    });
    expect(r.getPathname()).toBe(`/fall/${c.id}`);
    await fireEvent.press(screen.getByRole('button', { name: de.a11y.close }));
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.later }));
    expect(r.getPathname()).toBe('/');
    expect(useAppStore.getState().cases[c.id]?.pausedAt).toBeDefined();
  });

  test('Schließen-Sheet: Abbrechen braucht einen Grund', async () => {
    finishOnboarding();
    const c = useAppStore
      .getState()
      .createCase({ deviceId: 'd', entry: 'foto', problemLabel: 'Wasserablauf' });
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await fireEvent.press(screen.getByRole('button', { name: de.a11y.close }));
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.cancel }));
    const confirm = screen.getByRole('button', { name: de.closeCase.confirmCancel });
    expect(confirm).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: de.closeCase.reasons[0] }));
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.confirmCancel }));
    expect(useAppStore.getState().cases[c.id]?.status).toBe('abgebrochen');
    expect(useAppStore.getState().cases[c.id]?.cancelReason).toBe(de.closeCase.reasons[0]);
  });
});

describe('Zurück', () => {
  async function openFlow() {
    finishOnboarding();
    const r = await renderRouter(APP, { initialUrl: '/' });
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${de.home.searchTitle}`) }),
    );
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${de.problem.photo}`) }));
    await fireEvent.press(screen.getByRole('button', { name: de.camera.shutter }));
    for (let i = 0; i < 10; i++) await act(async () => {});
    // Nach der Analyse geht es im Gespräch des Falls weiter
    expect(r.getPathname()).toBe('/fall/GS-24817');
    expect(screen.getByText(de.result.headline.wasserablauf)).toBeTruthy();
    return r;
  }

  test('Zurück aus der Anleitung führt ins Gespräch, aus dem Gespräch aus dem Fall heraus', async () => {
    const r = await openFlow();
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${de.result.startGuide}`) }),
    );
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    await fireEvent.press(screen.getByRole('button', { name: de.a11y.back }));
    expect(r.getPathname()).toBe('/fall/GS-24817');
    await fireEvent.press(screen.getByRole('button', { name: de.a11y.back }));
    expect(r.getPathname()).toBe('/');
  });

  test('Android-Zurück verhält sich gleich wie der Zurück-Button', async () => {
    type Handler = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: Handler[] = [];
    const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, handler) => {
      listeners.push(handler);
      return { remove: () => listeners.splice(listeners.indexOf(handler), 1) };
    });
    const pressBack = () =>
      act(async () => {
        [...listeners].reverse().some((l) => l({} as Parameters<Handler>[0]));
      });

    const r = await openFlow();
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${de.result.startGuide}`) }),
    );
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    await pressBack();
    expect(r.getPathname()).toBe('/fall/GS-24817');
    await pressBack();
    expect(r.getPathname()).toBe('/');
    spy.mockRestore();
  });

  test('Wischgeste: Fall-Stack erlaubt die Zurück-Geste, das Modal lässt sich nicht wegwischen', () => {
    // Die Geste selbst ist nativ. Wir prüfen die Optionen, die sie steuern.
    const fallLayout = require('../app/fall/_layout').default;
    const rootSource = require('fs').readFileSync(require.resolve('../app/_layout.tsx'), 'utf8');
    expect(fallLayout).toBeDefined();
    expect(rootSource).toMatch(/presentation: 'fullScreenModal', gestureEnabled: false/);
    const fallSource = require('fs').readFileSync(
      require.resolve('../app/fall/_layout.tsx'),
      'utf8',
    );
    expect(fallSource).toMatch(/gestureEnabled: true/);
  });
});
