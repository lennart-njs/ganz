import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { scopeList } from '@/lib/consent';
import { caseNames, legalText, textStamp } from '@/lib/legalTexts';
import { scopedConsent } from '@/model/policies/consentScopes';
import { useAppStore } from '@/store/appStore';
import { unwrap } from '@/test/result';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const flush = async () => {
  for (let i = 0; i < 6; i++) await act(async () => {});
};

const SERVICE = 'Fründ Kundendienst';

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
    // Die Anleitung läuft im Gespräch (Entscheidung 25)
    expect(r.getPathname()).toBe(`/fall/${c.id}`);
    expect(screen.getByText(/^Aus der Gebrauchsanweisung Miele G 5833 SC$/)).toBeTruthy();
  });

  test('Fachkraft und Betrieb sind der Kundendienst des Händlers, kein Versicherer', async () => {
    const deviceId = setup();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId,
      entry: 'symptom',
      problemLabel: 'Wasser bleibt im Spülraum',
    });
    const run = unwrap(s.startGuide(c.id, 'g5833_ablauf'));
    s.finishGuide(run.id, 'geht_nicht', 'Laufrad klemmt');
    s.grantConsent({
      caseId: c.id,
      purpose: 'weitergabe_fachkraft',
      legalBasis: 'vertrag',
      recipient: { id: 'fruend-kundendienst', kind: 'betrieb', name: SERVICE },
      dataCategories: [],
      textVersion: '1',
    });
    const session = unwrap(s.requestVideoCall(c.id));
    expect(session.expert.provider.name).toBe(SERVICE);
    expect(session.expert.name).toBe(demoConfig.dealers[0]!.service!.expert);

    unwrap(s.setFinding(c.id, 'reparatur', 'fachkraft'));
    const quote = useAppStore.getState().quotes[0]!;
    expect(quote.payer.kind).toBe('haushalt');
    expect(quote.deductible).toBe(0);

    const booking = unwrap(
      s.requestBooking({
        caseId: c.id,
        kind: 'reparatur',
        partnerId: 'fruend-kundendienst',
        slotLabel: demoConfig.slots[0]!,
        selfPay: true,
      }),
    );
    expect(booking.provider).toMatchObject({ name: SERVICE, kind: 'betrieb' });
    expect(booking.subjectToApproval).toBe(false);
    expect(useAppStore.getState().cases[c.id]?.claim).toBeUndefined();

    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await flush();
    expect(tree()).toContain(SERVICE);
    expect(tree()).not.toContain(demoConfig.insurer.shortName);
  });

  test('Hilfe holen: Vor-Ort-Diagnose durch den Händler, keine Hotline des Herstellers', async () => {
    const deviceId = setup();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId,
      entry: 'symptom',
      problemLabel: 'Wasser bleibt im Spülraum',
    });
    s.escalate(c.id);
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await flush();
    expect(screen.getByText(de.thread.onSiteSubDealer(SERVICE))).toBeTruthy();
    expect(screen.queryByText(demoConfig.manufacturer.serviceContact.label)).toBeNull();
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
    // Den Befund vor Ort schreibt nur ein gebuchter Betrieb (R-10): erst die Vor-Ort-Diagnose
    unwrap(
      s.requestBooking({
        caseId: c.id,
        kind: 'vor_ort_diagnose',
        partnerId: 'fruend-kundendienst',
        slotLabel: demoConfig.slots[0]!,
        selfPay: false,
      }),
    );
    unwrap(s.setFinding(c.id, 'reparatur', 'betrieb'));
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

describe('Videocall und Rückruf beim Händler-Gerät', () => {
  const EXPERT = demoConfig.dealers[0]!.service!.expert;
  const configPartner = demoConfig.partners.find((p) => p.id === demoConfig.expert.partnerId)!;
  const expertConsents = (id: string) =>
    useAppStore
      .getState()
      .consents.filter((k) => k.purpose === 'weitergabe_fachkraft' && k.caseId === id);

  function escalatedCase() {
    const deviceId = setup();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId,
      entry: 'symptom',
      problemLabel: 'Wasser bleibt im Spülraum',
    });
    const run = unwrap(s.startGuide(c.id, 'g5833_ablauf'));
    // „Geht nicht“ holt Hilfe: der Fall ist danach eskaliert
    unwrap(s.finishGuide(run.id, 'geht_nicht', 'Laufrad klemmt'));
    return c.id;
  }

  test('keine Fachkraft frei: Sheet, Bestätigung und Stempel nennen den Kundendienst des Händlers', async () => {
    const id = escalatedCase();
    useAppStore.getState().setDemo({ videoScenario: 'keine_fachkraft' });
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await flush();
    // Der Satz vor dem Call nennt den Kundendienst, der Stempel belegt genau diesen Satz
    const summary = de.help.shareSummary(EXPERT, SERVICE, scopeList('weitergabe_fachkraft'));
    expect(screen.getByText(summary)).toBeTruthy();
    await tap(new RegExp(`^${de.thread.callStart}`));
    await flush();
    const names = caseNames(useAppStore.getState(), id);
    expect(names).toMatchObject({ fachkraft: EXPERT, fachbetrieb: SERVICE });
    const call = expertConsents(id).at(-1)!;
    expect(call.recipient.name).toBe(SERVICE);
    expect(legalText('fachkraft_videocall', names)).toContain(summary);
    expect(call.textHash).toBe(textStamp('fachkraft_videocall', names).textHash);
    expect(call.textHash).not.toBe(textStamp('fachkraft_videocall').textHash);

    // Rückruf: dieselbe Fachkraft und derselbe Betrieb wie im Call, nicht die der Konfiguration
    const slot = de.waiting.callbackSlots[0]!;
    await tap(new RegExp(`^${slot}`));
    await flush();
    expect(screen.getByText(de.help.shareTitle(EXPERT, SERVICE))).toBeTruthy();
    expect(
      screen.queryByText(de.help.shareTitle(demoConfig.expert.name, configPartner.name)),
    ).toBeNull();
    await tap(de.waiting.requestCallback);
    await flush();
    const consents = expertConsents(id);
    expect(consents).toHaveLength(2);
    expect(consents.map((k) => k.recipient.name)).toEqual([SERVICE, SERVICE]);
    expect(consents[1]!.textHash).toBe(textStamp('fachkraft_rueckruf', names).textHash);
    expect(tree()).not.toContain(configPartner.name);
  });

  test('eine Bestätigung an einen anderen Betrieb lehnt der Store ab, ohne zu schreiben', () => {
    const id = escalatedCase();
    const other = scopedConsent('weitergabe_fachkraft', {
      caseId: id,
      recipient: { id: configPartner.id, kind: 'betrieb', name: configPartner.name },
      text: textStamp('fachkraft_videocall'),
    });
    const before = useAppStore.getState();
    const refused = {
      ok: false,
      refusal: { code: 'bestaetigung', purpose: 'weitergabe_fachkraft' },
    };
    expect(before.requestVideoCall(id, { share: other })).toEqual(refused);
    expect(before.requestCallback(id, de.waiting.callbackSlots[0]!, other)).toEqual(refused);
    expect(useAppStore.getState()).toBe(before);
  });
});
