import fs from 'fs';
import path from 'path';

import * as RN from 'react-native';
import { BackHandler, StyleSheet } from 'react-native';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import FallLayout from '@/app/fall/_layout';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { deviceTitle } from '@/lib/devices';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { colors } from '@/theme/colors';

// '' ist das Gespräch des Falls, die anderen sind Vollbild-Schritte und Details
const caseScreens = [
  '',
  'kamera',
  'analyse',
  'ergebnis',
  'anleitung',
  'warteraum',
  'videocall',
  'kosten',
  'termin',
  'status',
  'fallakte',
];

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
    expect(r.getPathname()).toBe('/geraet-anlegen');
    await fireEvent.press(screen.getByRole('button', { name: de.onboarding.skipDevice }));
    expect(r.getPathname()).toBe('/');
    expect(screen.getByRole('header', { name: de.home.myDevices })).toBeTruthy();
  });

  test('ohne Onboarding sind Fall-Screens gesperrt', async () => {
    const r = await renderRouter(APP, { initialUrl: '/fall/GS-24817/status' });
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

describe('Startseite (B-01)', () => {
  test('die Gerätekarte öffnet das Gerätedetail, die Suchpille „Problem melden“', async () => {
    finishOnboarding();
    const device = useAppStore.getState().devices[0]!;
    const r = await renderRouter(APP, { initialUrl: '/' });
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${deviceTitle(device)}`) }),
    );
    expect(r.getPathname()).toBe(`/geraet/${device.id}`);
    await act(async () => router.back());
    expect(r.getPathname()).toBe('/');
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${de.home.searchTitle}`) }),
    );
    expect(r.getPathname()).toBe('/fall/neu');
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
      router.push(`/fall/${c.id}`);
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

describe('Schließen-Sheet nach den Regeln (R-01)', () => {
  /** Ein selbst gelöster Fall und ein Fall in der Reparatur, beide ohne Schutz */
  function closedAndRepair() {
    finishOnboarding();
    const s = useAppStore.getState();
    const deviceId = s.devices[0]!.id;
    const done = s.createCase({ deviceId, entry: 'symptom', problemLabel: 'Tür geht nicht auf' });
    s.runCommand(done.id, 'anleitung_starten');
    s.runCommand(done.id, 'selbst_geloest');
    const repair = s.createCase({ deviceId, entry: 'foto', problemLabel: 'Wasserablauf' });
    s.escalate(repair.id);
    s.setFinding(repair.id, 'reparatur', 'fachkraft');
    s.requestBooking({
      caseId: repair.id,
      kind: 'reparatur',
      partnerId: demoConfig.partners[0]!.id,
      slotLabel: demoConfig.slots[0],
      selfPay: true,
    });
    return { done: done.id, repair: repair.id };
  }

  const openSheet = () => fireEvent.press(screen.getByRole('button', { name: de.a11y.close }));

  test('abgeschlossen: weder pausieren noch abbrechen, nur zur Übersicht', async () => {
    const { done } = closedAndRepair();
    const r = await renderRouter(APP, { initialUrl: `/fall/${done}/fallakte` });
    await openSheet();
    expect(screen.getByText(de.closeCase.closedText)).toBeTruthy();
    expect(screen.queryByRole('button', { name: de.closeCase.later })).toBeNull();
    expect(screen.queryByRole('button', { name: de.closeCase.cancel })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.leave }));
    expect(r.getPathname()).toBe('/');
    expect(useAppStore.getState().cases[done]).toMatchObject({ status: 'erledigt' });
    expect(useAppStore.getState().cases[done]?.pausedAt).toBeUndefined();
  });

  // Seit Entscheidung Nr. 34 geht auch Abbrechen. Später weitermachen bleibt, wie es war.
  test('in der Reparatur: später weitermachen ja, der Fall bleibt in der Reparatur', async () => {
    const { repair } = closedAndRepair();
    expect(useAppStore.getState().cases[repair]?.status).toBe('in_reparatur');
    const r = await renderRouter(APP, { initialUrl: `/fall/${repair}` });
    await openSheet();
    expect(screen.getByRole('button', { name: de.closeCase.cancel })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.later }));
    expect(r.getPathname()).toBe('/');
    expect(useAppStore.getState().cases[repair]).toMatchObject({ status: 'in_reparatur' });
    expect(useAppStore.getState().cases[repair]?.pausedAt).toBeDefined();
    expect(useAppStore.getState().bookings.find((b) => b.caseId === repair)?.status).toBe(
      'angefragt',
    );
  });

  test('in der Reparatur abbrechen (Nr. 34): erst die Absage an den Betrieb, dann mit Grund', async () => {
    const { repair } = closedAndRepair();
    const partner = demoConfig.partners[0]!.name;
    const r = await renderRouter(APP, { initialUrl: `/fall/${repair}` });
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.cancel }));
    expect(screen.getByText(de.closeCase.partnerNotice(partner))).toBeTruthy();
    expect(screen.getByText(de.closeCase.costsOpen(partner))).toBeTruthy();
    expect(screen.getByRole('button', { name: de.closeCase.confirmCancel })).toBeDisabled();
    // „Weitermachen“ lässt alles, wie es war
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.keep }));
    expect(useAppStore.getState().cases[repair]?.status).toBe('in_reparatur');
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.cancel }));
    await fireEvent.press(screen.getByRole('radio', { name: de.closeCase.reasons[0] }));
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.confirmCancel }));
    expect(r.getPathname()).toBe('/');
    const s = useAppStore.getState();
    expect(s.cases[repair]).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.closeCase.reasons[0],
    });
    expect(s.bookings.find((b) => b.caseId === repair)?.status).toBe('storniert');
    // Im Gespräch steht danach die Absage, ohne Zusage, dass es nichts kostet
    await act(async () => router.push(`/fall/${repair}`));
    expect(screen.getByText(de.thread.cancelled)).toBeTruthy();
    expect(screen.getByText(de.closeCase.partnerNotice(partner))).toBeTruthy();
    expect(screen.getByText(de.closeCase.costsOpen(partner))).toBeTruthy();
    expect(screen.queryByText(/kostenlos|kostenfrei/i)).toBeNull();
  });

  // Gegenprüfung Nr. 31 bis 34 (F4, R3): Ist der Betrieb fertig, gibt es nichts mehr abzusagen.
  // Das Sheet bietet nur „Später weitermachen“ und sagt, dass die Antwort ins Gespräch gehört.
  test('der Betrieb ist fertig: kein „Fall abbrechen“, die Antwort gehört ins Gespräch', async () => {
    const { repair } = closedAndRepair();
    await renderRouter(APP, { initialUrl: `/fall/${repair}` });
    await openSheet();
    // Solange der Betrieb noch nicht fertig ist: Abbrechen, ohne den Satz
    expect(screen.getByRole('button', { name: de.closeCase.cancel })).toBeTruthy();
    expect(screen.queryByText(de.closeCase.repairDone)).toBeNull();
    await act(async () => {
      while (useAppStore.getState().simulateNext(repair));
    });
    expect(useAppStore.getState().bookings.find((b) => b.caseId === repair)?.status).toBe(
      'erledigt',
    );
    expect(screen.queryByRole('button', { name: de.closeCase.cancel })).toBeNull();
    expect(screen.getByText(de.closeCase.repairDone)).toBeTruthy();
    expect(screen.getByRole('button', { name: de.closeCase.later })).toBeTruthy();
    expect(useAppStore.getState().cases[repair]?.status).toBe('in_reparatur');
  });

  test('ohne Termin: Abbrechen ohne Satz zum Betrieb', async () => {
    finishOnboarding();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId: s.devices[0]!.id,
      entry: 'foto',
      problemLabel: 'Wasserablauf',
    });
    s.escalate(c.id);
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.cancel }));
    expect(screen.queryByText(de.closeCase.partnerNotice(demoConfig.partners[0]!.name))).toBeNull();
    expect(screen.queryByText(de.closeCase.costsOpen(demoConfig.partners[0]!.name))).toBeNull();
  });

  test('dunkel und mit 200 % Schrift, Farben aus dem Theme, 44 pt', async () => {
    const scheme = jest.spyOn(RN, 'useColorScheme').mockReturnValue('dark');
    const size = jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 2 });
    const { done, repair } = closedAndRepair();
    await renderRouter(APP, { initialUrl: `/fall/${done}/fallakte` });
    await openSheet();
    expect(screen.getByText(de.closeCase.closedText)).toHaveStyle({
      color: colors.dark.textBody,
    });
    const leave = screen.getByRole('button', { name: de.closeCase.leave });
    expect(StyleSheet.flatten(leave.props.style).minHeight).toBeGreaterThanOrEqual(44);
    await fireEvent.press(leave);

    await act(async () => router.push(`/fall/${repair}`));
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: de.closeCase.cancel }));
    expect(screen.getByText(de.closeCase.costsOpen(demoConfig.partners[0]!.name))).toHaveStyle({
      color: colors.dark.textBody,
    });
    const sheet = screen.container.queryAll((x) => x.props.accessibilityViewIsModal === true)[0]!;
    for (const n of sheet.queryAll((x) => x.type === 'Text')) {
      expect(n.props.allowFontScaling).not.toBe(false);
      expect(n.props.maxFontSizeMultiplier ?? 2).toBeGreaterThanOrEqual(2);
    }
    scheme.mockRestore();
    size.mockRestore();
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

  /** Die Anleitung läuft im Gespräch, „Details“ am Schritt öffnet die Großansicht */
  async function openGuideDetails() {
    await fireEvent.press(
      screen.getByRole('button', { name: new RegExp(`^${de.result.startGuide}`) }),
    );
    expect(screen.getByRole('button', { name: de.guide.done })).toBeTruthy();
    const details = screen.getAllByRole('button', { name: de.thread.details });
    await fireEvent.press(details.at(-1)!);
  }

  test('Zurück aus der Großansicht der Anleitung führt ins Gespräch, aus dem Gespräch aus dem Fall heraus', async () => {
    const r = await openFlow();
    await openGuideDetails();
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
    await openGuideDetails();
    expect(r.getPathname()).toBe('/fall/GS-24817/anleitung');
    await pressBack();
    expect(r.getPathname()).toBe('/fall/GS-24817');
    await pressBack();
    expect(r.getPathname()).toBe('/');
    spy.mockRestore();
  });

  test('Wischgeste: Fall-Stack erlaubt die Zurück-Geste, das Modal lässt sich nicht wegwischen', () => {
    // Die Geste selbst ist nativ. Wir prüfen die Optionen, die sie steuern.
    const rootSource = fs.readFileSync(path.join(__dirname, '../app/_layout.tsx'), 'utf8');
    expect(FallLayout).toBeDefined();
    expect(rootSource).toMatch(/presentation: 'fullScreenModal', gestureEnabled: false/);
    const fallSource = fs.readFileSync(path.join(__dirname, '../app/fall/_layout.tsx'), 'utf8');
    expect(fallSource).toMatch(/gestureEnabled: true/);
  });
});
