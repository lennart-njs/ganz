import * as Notifications from 'expo-notifications';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { eventLabel } from '@/lib/caseEvents';
import type { CaseEventType } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { unwrap } from '@/test/result';

const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

/**
 * Ein Fall auf dem ganzen Golden Path und ein offener Pflege-Fall. Mit Selbstbeteiligung bucht der
 * Haushalt nach der Freigabe zahlungspflichtig (Entscheidung Nr. 31).
 */
function fullHistory(deductible = 0) {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  s.setDemo({ deductible });
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
  const run = unwrap(s.startGuide(c.id, 'ablauf'));
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
  const v = unwrap(s.requestVideoCall(c.id));
  s.updateVideoCall(v.id, 'verbunden');
  s.updateVideoCall(v.id, 'beendet');
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  s.reportClaim(c.id);
  s.requestBooking({
    caseId: c.id,
    kind: 'reparatur',
    partnerId: 'brandt',
    slotLabel: 'Mo vormittags',
    selfPay: false,
  });
  s.simulateNext(c.id);
  if (deductible) unwrap(s.bookBinding(c.id, deductible));
  for (let i = 0; i < 3; i++) s.simulateNext(c.id);
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

  test('„Zahlungspflichtig gebucht“ steht mit Betrieb, Zeitfenster und Betrag in der Fallakte (Nr. 31)', async () => {
    const { done } = fullHistory(5000);
    expect(useAppStore.getState().cases[done]?.status).toBe('erledigt');
    await renderRouter(APP, { initialUrl: `/fall/${done}/fallakte` });
    const line = de.file.event.detail(
      de.caseEvent.zahlungspflichtig_gebucht,
      de.file.event.binding('Hausgeräte Brandt', 'Mo vormittags', '50 €'),
    );
    expect(screen.getByText(line)).toBeTruthy();
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

  test('Mitteilungen: der Schalter folgt der Einwilligung, nicht nur dem System (R-13)', async () => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: true,
      canAskAgain: true,
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
    fullHistory();
    // Ein Stand von früher: erlaubt, aber ohne gespeicherte Einwilligung
    useAppStore.setState({ notifications: 'erlaubt' });
    await renderRouter(APP, { initialUrl: '/profil' });
    const box = () => screen.getByRole('checkbox', { name: de.profile.notifications });
    const active = () =>
      useAppStore.getState().consents.filter((c) => c.purpose === 'mitteilungen' && !c.revokedAt);
    expect(box()).not.toBeChecked();
    const rows = screen.getAllByRole('button', { name: de.profile.revoke }).length;
    await fireEvent.press(box());
    await act(async () => {});
    expect(box()).toBeChecked();
    expect(active()).toHaveLength(1);
    // Eigener Schalter unter „Freiwillig“, keine zweite Zeile unter den Weitergaben
    expect(screen.getAllByRole('button', { name: de.profile.revoke })).toHaveLength(rows);
    await fireEvent.press(box());
    expect(box()).not.toBeChecked();
    expect(active()).toHaveLength(0);
  });

  test('zeigt Schutz und Datenschutz', async () => {
    fullHistory();
    await renderRouter(APP, { initialUrl: '/profil' });
    expect(screen.getAllByText(demoConfig.contract.number).length).toBeGreaterThan(0);
    await tap(de.profile.privacy);
    expect(screen.getByText(de.profile.privacyText)).toBeTruthy();
  });
});
