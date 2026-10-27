import * as Notifications from 'expo-notifications';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

/** Fall nach Befund, Schadenmeldung und Terminanfrage */
async function bookedCase(scenario: 'freigeben' | 'ablehnen' = 'freigeben') {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  s.setDemo({ claimScenario: scenario });
  s.linkContract('vertragsnummer');
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
  const c = s.createCase({
    deviceId: device.id,
    entry: 'foto',
    problemLabel: 'Wasserablauf gestört',
  });
  s.escalate(c.id);
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  const r = await renderRouter(APP, { initialUrl: `/fall/${c.id}/kosten` });
  await tap(de.costs.report);
  await fireEvent.press(screen.getByRole('radio', { name: demoConfig.slots[0] }));
  await tap(de.appointment.request);
  await act(async () => {});
  return { id: c.id, r };
}

const caseOf = (id: string) => useAppStore.getState().cases[id]!;
const bookingOf = (id: string) => useAppStore.getState().bookings.find((b) => b.caseId === id)!;

beforeEach(() => {
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
});

describe('Fall-Status', () => {
  test('der Mock-Timer schaltet Freigabe, Bestätigung, unterwegs und repariert', async () => {
    const { id, r } = await bookedCase();
    // Nach der Terminanfrage geht es im Gespräch des Falls weiter
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(screen.getByText(de.status.headline.pruefung('Kranich'))).toBeTruthy();
    expect(screen.getByText(de.status.caseNumber(id), { exact: false })).toBeTruthy();

    await advance(demoConfig.timers.claimMs + 1000);
    expect(caseOf(id).claim?.decision).toMatchObject({ result: 'freigegeben', actor: 'mensch' });

    await advance(demoConfig.timers.bookingStepMs + 1000);
    expect(caseOf(id).status).toBe('in_reparatur');
    expect(bookingOf(id).status).toBe('bestaetigt');

    await advance(demoConfig.timers.bookingStepMs + 1000);
    expect(bookingOf(id).status).toBe('unterwegs');

    await advance(demoConfig.timers.bookingStepMs + 1000);
    expect(bookingOf(id).status).toBe('erledigt');
    expect(bookingOf(id).completionPhotoId).toBeDefined();
    expect(screen.getByText(de.status.headline.repariert)).toBeTruthy();
    // Der Fall bleibt offen, bis die Nutzerin bestätigt
    expect(caseOf(id).status).toBe('in_reparatur');
  });

  test('im Demo-Modus geht es per Tap weiter', async () => {
    const { id } = await bookedCase();
    await tap(de.status.demoNext);
    expect(caseOf(id).status).toBe('freigegeben');
    await tap(de.status.demoNext);
    expect(bookingOf(id).status).toBe('bestaetigt');
  });

  test('lokale Mitteilung bei jedem Wechsel, nach Zustimmung', async () => {
    const { id } = await bookedCase();
    expect(useAppStore.getState().notifications).toBe('erlaubt');
    await tap(de.status.demoNext);
    await tap(de.status.demoNext);
    await act(async () => {});
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0]![0]).toMatchObject({
      content: de.notify.freigegeben('Kranich'),
    });
    expect(caseOf(id).status).toBe('in_reparatur');
  });

  test('ohne Zustimmung keine Mitteilung', async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
    await bookedCase();
    expect(useAppStore.getState().notifications).toBe('abgelehnt');
    await tap(de.status.demoNext);
    await act(async () => {});
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('abgelehnt: der Status sagt es und führt zur Entscheidung', async () => {
    const { id, r } = await bookedCase('ablehnen');
    await tap(de.status.demoNext);
    expect(caseOf(id).status).toBe('abgelehnt');
    expect(screen.getByText(de.status.headline.abgelehnt('Kranich'))).toBeTruthy();
    expect(r.getPathname()).toBe(`/fall/${id}`);
    // Du entscheidest neu: selbst zahlen, Kostenvoranschlag behalten oder Fall schließen
    expect(
      screen.getByRole('button', { name: de.thread.rejectedChoice.selfPay('189 €') }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: de.thread.rejectedChoice.keep })).toBeTruthy();
    await tap(de.thread.rejectedChoice.close);
    expect(caseOf(id).status).toBe('abgebrochen');
  });
});

describe('Abschluss', () => {
  async function repaired() {
    const res = await bookedCase();
    for (let i = 0; i < 4; i++) await tap(de.status.demoNext);
    expect(res.r.getPathname()).toBe(`/fall/${res.id}`);
    return res;
  }

  test('„Läuft wieder“ schließt den Fall, dann Bewertung', async () => {
    const { id } = await repaired();
    expect(screen.getByText(de.appliance.waschmaschine.runsAgain)).toBeTruthy();
    await tap(de.finish.runsAgain);
    expect(caseOf(id)).toMatchObject({ status: 'erledigt', resolution: 'repariert' });
    await fireEvent.press(screen.getByRole('radio', { name: de.a11y.starsOf(5) }));
    expect(bookingOf(id).rating?.stars).toBe(5);
    expect(useAppStore.getState().events.at(-1)?.type).toBe('bewertet');
  });

  test('„Problem besteht weiter“ öffnet den Fall wieder', async () => {
    const { id, r } = await repaired();
    await tap(de.finish.stillBroken);
    expect(caseOf(id).status).toBe('eskaliert');
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(
      screen.getByRole('button', { name: new RegExp(`^${de.thread.callStart}`) }),
    ).toBeTruthy();
  });

  test('auch nach „Läuft wieder“ lässt sich ein erledigter Fall wieder öffnen', async () => {
    const { id, r } = await repaired();
    await tap(de.finish.runsAgain);
    await tap(de.finish.stillBroken);
    expect(caseOf(id).status).toBe('eskaliert');
    expect(caseOf(id).closedAt).toBeUndefined();
    expect(r.getPathname()).toBe(`/fall/${id}`);
  });
});
