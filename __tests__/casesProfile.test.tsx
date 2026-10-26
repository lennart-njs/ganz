import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { eventLabel } from '@/lib/caseEvents';
import type { CaseEventType } from '@/model/types';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

/** Ein Fall auf dem ganzen Golden Path und ein offener Pflege-Fall */
function fullHistory() {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
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
  s.addPhoto({
    caseId: c.id,
    deviceId: device.id,
    purpose: 'display',
    source: 'in_app_camera',
    uri: '',
  });
  const run = s.startGuide(c.id, 'ablauf');
  s.moveGuideStep(run.id, 'next');
  s.finishGuide(run.id, 'geht_nicht', 'klemmt');
  s.grantConsent({
    caseId: c.id,
    purpose: 'weitergabe_fachkraft',
    legalBasis: 'vertrag',
    recipient: { id: 'brandt', kind: 'betrieb', name: 'Hausgeräte Brandt' },
    dataCategories: [],
    textVersion: '1',
  });
  const v = s.requestVideoCall(c.id);
  s.updateVideoCall(v.id, 'verbunden');
  s.updateVideoCall(v.id, 'beendet');
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  s.reportClaim(c.id, '1');
  s.requestBooking({
    caseId: c.id,
    kind: 'reparatur',
    partnerId: 'brandt',
    slotLabel: 'Mo vormittags',
    selfPay: false,
  });
  for (let i = 0; i < 4; i++) s.simulateNext(c.id);
  s.confirmRepair(c.id, true);
  s.rateBooking(useAppStore.getState().bookings[0]!.id, 5);
  const p = s.createCase({
    deviceId: device.id,
    entry: 'pflege',
    problemLabel: 'Hygienewäsche 75 °C',
  });
  s.startGuide(p.id, 'hygiene');
  return { done: c.id, open: p.id };
}

describe('Fälle', () => {
  test('offene oben, abgeschlossene darunter, ein Tap öffnet die Fallakte', async () => {
    const { done, open } = fullHistory();
    const r = await renderRouter(APP, { initialUrl: '/faelle' });
    const json = JSON.stringify(screen.toJSON());
    expect(json.indexOf('Hygienewäsche 75 °C')).toBeLessThan(json.indexOf('Wasserablauf gestört'));
    await tap(/^Wasserablauf gestört/);
    expect(r.getPathname()).toBe(`/fall/${done}/fallakte`);
    expect(open).toBeDefined();
  });

  test('ohne Fälle: Leerzustand mit Hinweis, wer sie sieht (B-37)', async () => {
    useAppStore.getState().reset();
    useAppStore.setState({ onboardingDone: true });
    await renderRouter(APP, { initialUrl: '/faelle' });
    expect(screen.getByText(de.cases.emptyText)).toBeTruthy();
  });
});

describe('Fallakte', () => {
  test('jeder Fall hat eine Fallakte aus CaseEvent', async () => {
    const { done } = fullHistory();
    const events = useAppStore.getState().events.filter((e) => e.caseId === done);
    const types = new Set(events.map((e) => e.type));
    const expected: CaseEventType[] = [
      'fall_angelegt',
      'foto_aufgenommen',
      'anleitung_gestartet',
      'schritt_erledigt',
      'schritt_geht_nicht',
      'anleitung_beendet',
      'weitergabe_bestaetigt',
      'videocall_angefragt',
      'videocall_gestartet',
      'videocall_beendet',
      'befund_erstellt',
      'angebot_erstellt',
      'schaden_gemeldet',
      'freigabe_entschieden',
      'termin_angefragt',
      'termin_bestaetigt',
      'betrieb_unterwegs',
      'reparatur_abgeschlossen',
      'abschluss_bestaetigt',
      'bewertet',
      'status_geaendert',
    ];
    expected.forEach((type) => expect(types).toContain(type));

    await renderRouter(APP, { initialUrl: `/fall/${done}/fallakte` });
    for (const e of events) {
      expect(screen.getAllByText(eventLabel(e)).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByText(
        de.file.event.detail(
          de.caseEvent.schritt_geht_nicht,
          'Schritt 2: Behälter unterstellen · Notiz: klemmt',
        ),
      ),
    ).toBeTruthy();
  });

  test('eine Freigabe zeigt Ergebnis und Akteur', () => {
    const { done } = fullHistory();
    const e = useAppStore
      .getState()
      .events.find((x) => x.caseId === done && x.type === 'freigabe_entschieden')!;
    expect(eventLabel(e)).toContain('von einem Menschen');
  });
});

describe('Profil', () => {
  test('Einwilligungen lassen sich widerrufen, der Widerruf erzeugt ein Ereignis', async () => {
    const { done } = fullHistory();
    await renderRouter(APP, { initialUrl: '/profil' });
    const before = useAppStore.getState().consents.filter((c) => !c.revokedAt).length;
    expect(before).toBeGreaterThanOrEqual(3);
    const buttons = screen.getAllByRole('button', { name: de.profile.revoke });
    expect(buttons).toHaveLength(before);
    await fireEvent.press(buttons[0]!);
    const s = useAppStore.getState();
    const revoked = s.consents.find((c) => c.revokedAt)!;
    expect(revoked).toBeDefined();
    expect(s.events.at(-1)).toMatchObject({
      caseId: done,
      type: 'einwilligung_widerrufen',
      payload: { consentId: revoked.id },
    });
    expect(screen.getAllByRole('button', { name: de.profile.revoke })).toHaveLength(before - 1);
  });

  test('Einzelfälle an den Hersteller nur mit eigener Einwilligung, widerrufbar', async () => {
    fullHistory();
    await renderRouter(APP, { initialUrl: '/profil' });
    const label = de.profile.manufacturerCase(demoConfig.manufacturer.name);
    const box = screen.getByRole('checkbox', { name: label });
    expect(box).not.toBeChecked();
    await fireEvent.press(box);
    const consent = useAppStore
      .getState()
      .consents.find((c) => c.purpose === 'hersteller_einzelfall');
    expect(consent).toMatchObject({
      legalBasis: 'einwilligung',
      recipient: { kind: 'hersteller' },
    });
    await fireEvent.press(screen.getByRole('checkbox', { name: label }));
    expect(
      useAppStore.getState().consents.find((c) => c.purpose === 'hersteller_einzelfall')?.revokedAt,
    ).toBeDefined();
  });

  test('zeigt Schutz und Datenschutz', async () => {
    fullHistory();
    await renderRouter(APP, { initialUrl: '/profil' });
    expect(screen.getAllByText(demoConfig.contract.number).length).toBeGreaterThan(0);
    await tap(de.profile.privacy);
    expect(screen.getByText(de.profile.privacyText)).toBeTruthy();
  });
});
