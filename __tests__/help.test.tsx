import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { ConsentRequiredError } from '@/model/caseMachine';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const flush = async () => {
  for (let i = 0; i < 6; i++) await act(async () => {});
};

function setup() {
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
    entry: 'meldung',
    problemLabel: 'Wasserablauf gestört',
  });
  return c.id;
}

/** Fall mit Anleitung: 4 Schritte erledigt, „Geht nicht“ in Schritt 5 */
function caseWithAbort() {
  const id = setup();
  const s = useAppStore.getState();
  const run = s.startGuide(id, 'ablauf');
  for (let i = 0; i < 4; i++) s.moveGuideStep(run.id, 'next');
  s.finishGuide(run.id, 'geht_nicht', 'Pumpenflügel klemmt');
  return id;
}

describe('Ohne bestätigte Weitergabe startet kein Call', () => {
  test('der Store verweigert den Videocall', () => {
    const id = setup();
    useAppStore.getState().escalate(id);
    expect(() => useAppStore.getState().requestVideoCall(id)).toThrow(ConsentRequiredError);
  });

  test('Warteraum und Videocall leiten ohne Bestätigung zu „Hilfe holen“ um', async () => {
    const id = setup();
    useAppStore.getState().escalate(id);
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}/videocall?video=x` });
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(useAppStore.getState().videoSessions).toHaveLength(0);
  });

  test('ein Widerruf sperrt den Call wieder', () => {
    const id = setup();
    const s = useAppStore.getState();
    s.escalate(id);
    const consent = s.grantConsent({
      caseId: id,
      purpose: 'weitergabe_fachkraft',
      legalBasis: 'vertrag',
      recipient: { id: 'brandt', kind: 'betrieb', name: 'Hausgeräte Brandt' },
      dataCategories: [],
      textVersion: '1',
    });
    const session = s.requestVideoCall(id);
    s.revokeConsent(consent.id);
    expect(() => s.updateVideoCall(session.id, 'verbunden')).toThrow(ConsentRequiredError);
  });
});

describe('Hilfe holen', () => {
  test('zeigt, wer welche Daten sieht, und das echte Protokoll', async () => {
    const id = caseWithAbort();
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    const partner = demoConfig.partners[0]!.name;
    expect(screen.getByText(de.help.shareTitle(demoConfig.expert.name, partner))).toBeTruthy();
    expect(screen.getByText(de.help.noRecording)).toBeTruthy();
    expect(screen.getByText(de.help.stepsDone(4, 7))).toBeTruthy();
    expect(screen.getByText(de.help.abortedAt(5, 'Pumpe freimachen'))).toBeTruthy();
    // Keine Kostenzusage, kein Schadenfall
    expect(screen.getByText(de.help.costNote('Kranich', '0 €'))).toBeTruthy();
    expect(useAppStore.getState().cases[id]?.claim).toBeUndefined();
  });

  test('ohne Anleitung steht „Anleitung nicht gestartet“, nicht „1 Schritt“ (B-22)', async () => {
    const id = setup();
    useAppStore.getState().escalate(id);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(screen.getByText(de.help.notStarted)).toBeTruthy();
  });

  test('„Videocall starten“ bestätigt die Weitergabe, verbindet und zeigt „Keine Aufnahme“', async () => {
    const id = caseWithAbort();
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(new RegExp(`^${de.thread.callStart}`));
    await flush();
    expect(r.getPathname()).toBe(`/fall/${id}/videocall`);
    const s = useAppStore.getState();
    expect(s.consents).toHaveLength(1);
    expect(s.consents[0]).toMatchObject({
      purpose: 'weitergabe_fachkraft',
      legalBasis: 'vertrag',
      recipient: { kind: 'betrieb', name: demoConfig.partners[0]!.name },
    });
    expect(s.videoSessions[0]).toMatchObject({ outcome: 'verbunden', recording: false });
    expect(screen.getByText(de.call.noRecording)).toBeTruthy();
    expect(
      screen.getByText(de.call.sees('Wasserablauf gestört', de.call.stepsShort(4))),
    ).toBeTruthy();
    const types = s.events.filter((e) => e.caseId === id).map((e) => e.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'weitergabe_bestaetigt',
        'videocall_angefragt',
        'videocall_gestartet',
      ]),
    );
  });

  test('Screenshots nur mit eigener Einwilligung (lit. a)', async () => {
    const id = caseWithAbort();
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await fireEvent.press(screen.getByRole('checkbox', { name: de.help.screenshots }));
    await tap(new RegExp(`^${de.thread.callStart}`));
    await flush();
    const s = useAppStore.getState();
    const shot = s.consents.find((c) => c.purpose === 'screenshots_im_call');
    expect(shot?.legalBasis).toBe('einwilligung');
    expect(s.videoSessions[0]?.screenshotsConsentId).toBe(shot?.id);
  });

  test('Mikrofon und Kamera sind Umschalter mit Zustand (B-24)', async () => {
    const id = caseWithAbort();
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(new RegExp(`^${de.thread.callStart}`));
    await flush();
    const mic = screen.getByRole('switch', { name: de.call.mic });
    expect(mic).toBeChecked();
    await fireEvent.press(mic);
    expect(screen.getByRole('switch', { name: de.call.mic })).not.toBeChecked();
  });
});

describe('Keine Fachkraft frei', () => {
  test('Demo-Szenario zeigt den Rückruf, der Rückruf landet im Fall', async () => {
    const id = caseWithAbort();
    useAppStore.getState().setDemo({ videoScenario: 'keine_fachkraft' });
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(new RegExp(`^${de.thread.callStart}`));
    await flush();
    // Zurück im Gespräch: Rückruf oder Vor-Ort-Diagnose
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(screen.getByText(de.waiting.noExpertTitle)).toBeTruthy();
    await tap(de.waiting.callbackSlots[1]!);
    expect(screen.getByText(de.thread.callbackDone(de.waiting.callbackSlots[1]!))).toBeTruthy();
    const s = useAppStore.getState();
    expect(s.videoSessions[0]?.outcome).toBe('keine_fachkraft');
    expect(s.events.at(-1)).toMatchObject({
      type: 'videocall_angefragt',
      payload: { art: 'rueckruf', slot: de.waiting.callbackSlots[1] },
    });
  });
});

describe('Befund', () => {
  async function toFinding() {
    const id = caseWithAbort();
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(new RegExp(`^${de.thread.callStart}`));
    await flush();
    await tap(de.call.hangUp);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    // Der Befund der Fachkraft steht im Gespräch
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(useAppStore.getState().videoSessions[0]?.endedAt).toBeDefined();
    return { id, r };
  }

  test('Reparatur: die Fachkraft entscheidet, du bestätigst, dann die Kosten', async () => {
    const { id } = await toFinding();
    expect(screen.getByText(de.thread.findingFrom(demoConfig.expert.name))).toBeTruthy();
    expect(screen.getByText(de.appliance.waschmaschine.finding.title)).toBeTruthy();
    // Keine Auswahl für dich, nur bestätigen oder widersprechen
    expect(
      screen.queryByRole('radio', { name: new RegExp(de.finding.options.geloest) }),
    ).toBeNull();
    expect(useAppStore.getState().quotes).toHaveLength(0);
    await tap(de.thread.findingOk);
    expect(screen.getByText(de.costs.title)).toBeTruthy();
    const quote = useAppStore.getState().quotes[0]!;
    expect(quote.repair.total).toBe(18900);
    expect(quote.saving).toBe(89900 - 18900);
    expect(quote.payer).toEqual({ kind: 'versicherer', name: demoConfig.insurer.name });
    expect(useAppStore.getState().cases[id]?.status).toBe('eskaliert');
  });

  test('„Stimmt nicht“: kein Befund, Hilfe wird neu angeboten', async () => {
    const { id } = await toFinding();
    await tap(de.thread.findingWrong);
    expect(screen.getByText(de.thread.findingWrongText)).toBeTruthy();
    expect(useAppStore.getState().quotes).toHaveLength(0);
    expect(
      screen.getByRole('button', { name: new RegExp(`^${de.thread.callStart}`) }),
    ).toBeTruthy();
    expect(useAppStore.getState().cases[id]?.status).toBe('eskaliert');
  });

  test('Im Call gelöst: Fall erledigt', async () => {
    const spy = jest.spyOn(services.video, 'finding').mockReturnValue('geloest');
    const { id } = await toFinding();
    await tap(de.thread.findingOk);
    spy.mockRestore();
    expect(screen.getByText(de.thread.solvedInCall)).toBeTruthy();
    expect(useAppStore.getState().cases[id]).toMatchObject({
      status: 'erledigt',
      resolution: 'im_call_geloest',
    });
  });
});
