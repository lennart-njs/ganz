import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const flush = async () => {
  for (let i = 0; i < 6; i++) await act(async () => {});
};

const SERVICE = 'Fründ Kundendienst (DEMO)';

/** Geschirrspüler aus dem Katalog, ohne Versicherung, gekauft bei Fründ (Entscheidung 16) */
function setup() {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'geschirrspueler',
    model: 'G 5833 SC',
    identifiedBy: 'katalog',
  });
  s.setDeviceDealer(device.id, 'fruend');
  return device.id;
}

const tree = () => JSON.stringify(screen.toJSON());

describe('Händler statt Versicherer (Fründ-Demo)', () => {
  test('Problem melden zeigt die Einstiege aus der Gebrauchsanweisung des Geräts', async () => {
    const deviceId = setup();
    const r = await renderRouter(APP, { initialUrl: `/fall/neu?geraet=${deviceId}` });
    expect(screen.queryByRole('button', { name: /^Maschine wackelt/ })).toBeNull();
    await tap(/^Wasser bleibt stehen/);
    await flush();
    const s = useAppStore.getState();
    const c = Object.values(s.cases)[0]!;
    const run = s.guideRuns[c.guideRunIds[0]!]!;
    expect(run.guideId).toBe('g5833_ablauf');
    expect(r.getPathname()).toBe(`/fall/${c.id}/anleitung`);
    expect(screen.getByText(/Gebrauchsanweisung Miele G 5833 SC.*Seite 72/)).toBeTruthy();
  });

  test('Fachkraft und Betrieb sind der Kundendienst des Händlers, kein Versicherer', async () => {
    const deviceId = setup();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId,
      entry: 'symptom',
      problemLabel: 'Wasser bleibt im Spülraum',
    });
    const run = s.startGuide(c.id, 'g5833_ablauf');
    s.finishGuide(run.id, 'geht_nicht', 'Laufrad klemmt');
    s.grantConsent({
      caseId: c.id,
      purpose: 'weitergabe_fachkraft',
      legalBasis: 'vertrag',
      recipient: { id: 'fruend-kundendienst', kind: 'betrieb', name: SERVICE },
      dataCategories: [],
      textVersion: '1',
    });
    const session = s.requestVideoCall(c.id);
    expect(session.expert.provider.name).toBe(SERVICE);
    expect(session.expert.name).toBe(demoConfig.dealers[0]!.service!.expert);

    s.setFinding(c.id, 'reparatur', 'fachkraft');
    const quote = useAppStore.getState().quotes[0]!;
    expect(quote.payer.kind).toBe('haushalt');
    expect(quote.deductible).toBe(0);

    const booking = s.requestBooking({
      caseId: c.id,
      kind: 'reparatur',
      partnerId: 'fruend-kundendienst',
      slotLabel: demoConfig.slots[0]!,
      selfPay: true,
    });
    expect(booking.provider).toMatchObject({ name: SERVICE, kind: 'betrieb' });
    expect(booking.subjectToApproval).toBe(false);
    expect(useAppStore.getState().cases[c.id]?.claim).toBeUndefined();

    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await flush();
    expect(tree()).toContain(SERVICE);
    expect(tree()).not.toContain(demoConfig.insurer.shortName);
  });

  test('Betriebswahl im Gespräch nennt nur den Kundendienst des Händlers', async () => {
    const deviceId = setup();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId,
      entry: 'symptom',
      problemLabel: 'Wasser bleibt im Spülraum',
    });
    s.escalate(c.id);
    s.setFinding(c.id, 'reparatur', 'betrieb');
    await renderRouter(APP, { initialUrl: `/fall/${c.id}/termin?zahlung=selbst` });
    await flush();
    const radios = screen.getAllByRole('radio').map((x) => x.props.accessibilityLabel as string);
    expect(radios.some((l) => l.startsWith(SERVICE))).toBe(true);
    expect(radios.some((l) => l.startsWith(demoConfig.partners[0]!.name))).toBe(false);
    expect(
      within(
        screen.getByRole('radio', { name: new RegExp(`^${SERVICE.replace(/[()]/g, '\\$&')}`) }),
      ).getByText(new RegExp(de.partner.dealerService)),
    ).toBeTruthy();
  });
});
