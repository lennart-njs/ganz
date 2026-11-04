import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import type { SharedCaseFile } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';
import { syncShare } from '@/store/useShareSync';
import { unwrap } from '@/test/result';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const dealer = {
  id: demoConfig.dealers[0]!.id,
  kind: 'haendler' as const,
  name: demoConfig.dealers[0]!.name,
};
const backend = services.backend as jest.Mocked<typeof services.backend>;

function setup(withDealer = true) {
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
    ...(withDealer ? { soldBy: dealer } : {}),
  });
  const c = s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasserablauf' });
  s.escalate(c.id);
  s.addChatMessage({ caseId: c.id, role: 'haushalt', text: 'Geheime Frage an den Assistenten' });
  return c.id;
}

beforeEach(() => {
  backend.share.mockClear();
  backend.retailerEvents.mockClear();
  backend.revoke.mockClear();
});

describe('Fall an den Händler (Entscheidung 28)', () => {
  test('erst sehen, was der Händler bekommt, dann mit einem Tap senden', async () => {
    const caseId = setup();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    await tap(new RegExp(`^${de.sharing.offer(dealer.name)}`));
    expect(screen.getByText(de.sharing.confirmTitle(dealer.name))).toBeTruthy();
    expect(screen.getByText(de.sharing.legal)).toBeTruthy();
    // Noch nichts gesendet
    expect(useAppStore.getState().consents.some((k) => k.purpose === 'weitergabe_haendler')).toBe(
      false,
    );
    await tap(de.sharing.send);
    const consent = useAppStore
      .getState()
      .consents.find((k) => k.purpose === 'weitergabe_haendler');
    expect(consent).toMatchObject({ legalBasis: 'vertrag', recipient: dealer, caseId });
    expect(screen.getByText(de.sharing.sent(dealer.name))).toBeTruthy();
    // Das Angebot verschwindet
    expect(
      screen.queryByRole('button', { name: new RegExp(`^${de.sharing.offer(dealer.name)}`) }),
    ).toBeNull();
  });

  test('die gesendete Akte hat Name, Gerät und Zeitstrahl, aber kein Gespräch und keine Vertragsnummer', async () => {
    const caseId = setup();
    unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    await act(async () => {
      await syncShare(caseId);
    });
    expect(backend.share).toHaveBeenCalledTimes(1);
    const file = backend.share.mock.calls[0]![0] as SharedCaseFile;
    expect(file).toMatchObject({
      caseId,
      recipient: dealer,
      customer: { name: demoConfig.household.displayName },
      device: { model: 'WKB 130', soldBy: dealer },
    });
    expect(file.timeline.length).toBeGreaterThan(2);
    const sent = JSON.stringify(file);
    expect(sent).not.toContain('Geheime Frage');
    expect(sent).not.toContain(demoConfig.contract.number);
    expect(useAppStore.getState().shares[caseId]).toMatchObject({ token: 'test-token' });
  });

  test('Rückfrage des Händlers: Antwort per Button, sie geht mit der nächsten Akte zurück', async () => {
    const caseId = setup();
    unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    await act(async () => {
      await syncShare(caseId);
    });
    const question: CaseEvent = {
      id: 'hev_1',
      caseId,
      type: 'haendler_rueckfrage',
      at: new Date(Date.now() + 1000).toISOString(),
      actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
      payload: { question: 'Hast du den Kaufbeleg noch?', options: ['Ja, als Foto', 'Nein'] },
    };
    backend.retailerEvents.mockResolvedValueOnce([question]);
    await act(async () => {
      await syncShare(caseId);
    });
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(screen.getByText('Hast du den Kaufbeleg noch?')).toBeTruthy();
    await tap('Ja, als Foto');
    const answer = useAppStore
      .getState()
      .events.find((e) => e.type === 'rueckfrage_beantwortet' && e.payload.questionEventId);
    expect(answer?.payload).toMatchObject({ answer: 'Ja, als Foto', questionEventId: 'hev_1' });
    await act(async () => {
      await syncShare(caseId, false);
    });
    const last = backend.share.mock.calls.at(-1)![0] as SharedCaseFile;
    expect(last.answers).toEqual([
      expect.objectContaining({ questionEventId: 'hev_1', answer: 'Ja, als Foto' }),
    ]);
  });

  test('nur Ereignisse des Händlers zu diesem Fall werden übernommen', () => {
    const caseId = setup();
    const before = useAppStore.getState().events.length;
    useAppStore.getState().importRetailerEvents(caseId, [
      {
        id: 'x1',
        caseId,
        type: 'freigabe_entschieden',
        at: new Date().toISOString(),
        actor: { kind: 'haendler', id: dealer.id },
        payload: {},
      },
      {
        id: 'x2',
        caseId: 'GS-99999',
        type: 'haendler_angenommen',
        at: new Date().toISOString(),
        actor: { kind: 'haendler', id: dealer.id },
        payload: {},
      },
    ]);
    expect(useAppStore.getState().events.length).toBe(before);
  });

  test('Widerruf im Profil: Das Backend erfährt es, danach wird nichts mehr gesendet', async () => {
    const caseId = setup();
    const consent = unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    await act(async () => {
      await syncShare(caseId);
    });
    useAppStore.getState().revokeConsent(consent.id);
    await act(async () => {
      await syncShare(caseId);
    });
    expect(backend.revoke).toHaveBeenCalledWith(caseId, 'test-token');
    expect(useAppStore.getState().shares[caseId]?.revoked).toBe(true);
    backend.share.mockClear();
    await act(async () => {
      await syncShare(caseId);
    });
    expect(backend.share).not.toHaveBeenCalled();
  });

  test('Begrüßung kommt mit dem Senden und steht sofort im Gespräch, mit Anrufen', async () => {
    const caseId = setup();
    unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    const greeting: CaseEvent = {
      id: 'hev_gruss',
      caseId,
      type: 'haendler_nachricht',
      at: new Date(Date.now() + 1000).toISOString(),
      actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
      payload: {
        text: 'Hallo Sam, danke für deinen Fall.',
        by: 'Fründ',
        auto: true,
        contact: {
          name: 'Fründ Kundendienst',
          phone: '05732 000 00-0',
          hours: { days: [1, 2, 3, 4, 5, 6], from: '08:00', to: '18:00' },
        },
      },
    };
    backend.share.mockResolvedValueOnce({ ok: true, token: 'test-token', events: [greeting] });
    await act(async () => {
      await syncShare(caseId, false);
    });
    expect(backend.retailerEvents).not.toHaveBeenCalled();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(screen.getByText('Hallo Sam, danke für deinen Fall.')).toBeTruthy();
    expect(screen.getByText('Mo–Sa, 8–18 Uhr')).toBeTruthy();
    expect(screen.getByRole('button', { name: de.sharing.contact.call })).toBeTruthy();
  });

  test('freier Chat: Antwort geht an den Händler, nicht an den Assistenten', async () => {
    const caseId = setup();
    unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    await act(async () => {
      await syncShare(caseId, false);
    });
    useAppStore.getState().importRetailerEvents(caseId, [
      {
        id: 'hev_msg',
        caseId,
        type: 'haendler_nachricht',
        at: new Date(Date.now() + 1000).toISOString(),
        actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
        payload: { text: 'Ist das Gerät freistehend?', by: 'Sandra K.' },
      },
    ]);
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(screen.getByText('Sandra K. · Fründ')).toBeTruthy();
    const field = screen.getByLabelText(de.sharing.placeholderDealer('Fründ'));
    await fireEvent.changeText(field, 'Ja, freistehend.');
    const chatBefore = useAppStore.getState().chatMessages.length;
    await tap(de.chat.send);
    expect(useAppStore.getState().chatMessages.length).toBe(chatBefore);
    expect(
      useAppStore.getState().events.find((e) => e.type === 'nachricht_an_haendler')?.payload,
    ).toEqual({ text: 'Ja, freistehend.' });
    expect(screen.getByText(de.sharing.sentTo('Fründ'))).toBeTruthy();
    await act(async () => {
      await syncShare(caseId, false);
    });
    const last = backend.share.mock.calls.at(-1)![0] as SharedCaseFile;
    expect(last.messages).toEqual([expect.objectContaining({ text: 'Ja, freistehend.' })]);
    expect(last.timeline.some((x) => x.type === 'nachricht_an_haendler')).toBe(false);

    // Umschalten: wieder an den Assistenten
    await fireEvent.press(screen.getByRole('radio', { name: de.sharing.toAssistant }));
    expect(screen.getByLabelText(de.thread.inputLabel)).toBeTruthy();
  });

  test('Terminvorschlag: Zeitfenster als Buttons, Ersatzteil als Nachricht', async () => {
    const caseId = setup();
    unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    await act(async () => {
      await syncShare(caseId, false);
    });
    const base = { caseId, actor: { kind: 'haendler' as const, id: dealer.id, name: dealer.name } };
    useAppStore.getState().importRetailerEvents(caseId, [
      {
        ...base,
        id: 'hev_teil',
        type: 'haendler_ersatzteil',
        at: new Date(Date.now() + 1000).toISOString(),
        payload: { part: 'Laugenpumpe', status: 'bestellt', eta: '3 Werktagen', by: 'Sandra K.' },
      },
      {
        ...base,
        id: 'hev_termin',
        type: 'haendler_termin',
        at: new Date(Date.now() + 2000).toISOString(),
        payload: {
          partnerName: 'Fründ Kundendienst',
          slots: ['Mo, 8–12 Uhr', 'Di, 12–16 Uhr'],
          by: 'Sandra K.',
        },
      },
    ]);
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(
      screen.getByText(de.sharing.part('Laugenpumpe', 'bestellt', '3 Werktagen')),
    ).toBeTruthy();
    expect(screen.getByText(de.sharing.slotOffer('Fründ Kundendienst'))).toBeTruthy();
    await tap('Di, 12–16 Uhr');
    const answer = useAppStore
      .getState()
      .events.find((e) => e.type === 'rueckfrage_beantwortet' && e.payload.questionEventId);
    expect(answer?.payload).toMatchObject({
      answer: 'Di, 12–16 Uhr',
      questionEventId: 'hev_termin',
    });
  });

  test('ohne bekannten Händler gibt es kein Angebot', async () => {
    const caseId = setup(false);
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(screen.queryByText(new RegExp(de.sharing.offer('').trim()))).toBeNull();
  });
});

/** Gerät vom Händler, Fall noch am Anfang: Hilfe ist nicht nötig */
function openCase(withDealer = true) {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'manuell',
    ...(withDealer ? { soldBy: dealer } : {}),
  });
  return s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasserablauf' }).id;
}

const offerButton = () =>
  screen.queryByRole('button', { name: new RegExp(`^${de.sharing.offer(dealer.name)}`) });
const dealerConsents = (caseId: string) =>
  useAppStore
    .getState()
    .consents.filter((k) => k.caseId === caseId && k.purpose === 'weitergabe_haendler');

describe('Regeln im Store (Übertragung Schritt 3): erst prüfen, dann einmal schreiben', () => {
  const rule = (action: 'an_haendler_senden' | 'haendler_schreiben') => ({
    ok: false,
    refusal: { code: 'regel', action },
  });

  test('Fall an den Händler erst, wenn Hilfe nötig ist, nur einmal, nur mit Händler', () => {
    const id = openCase();
    const s = () => useAppStore.getState();
    let before = s();
    expect(s().shareWithDealer(id, 'test')).toEqual(rule('an_haendler_senden'));
    expect(s()).toBe(before);
    unwrap(s().escalate(id));
    const consent = unwrap(s().shareWithDealer(id, 'test'));
    expect(consent).toMatchObject({
      caseId: id,
      purpose: 'weitergabe_haendler',
      recipient: dealer,
    });
    // Noch einmal: Der Fall ist schon beim Händler
    before = s();
    expect(s().shareWithDealer(id, 'test')).toEqual(rule('an_haendler_senden'));
    expect(s()).toBe(before);
    expect(s().shareWithDealer('GS-99999', 'test')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });

    // Ohne Händler am Gerät und im geschlossenen Fall nicht
    const other = openCase(false);
    unwrap(s().escalate(other));
    expect(s().shareWithDealer(other, 'test')).toEqual(rule('an_haendler_senden'));
    const closed = openCase();
    unwrap(s().escalate(closed));
    unwrap(s().runCommand(closed, 'abbrechen', { cancelReason: 'Test' }));
    expect(s().shareWithDealer(closed, 'test')).toEqual(rule('an_haendler_senden'));
    expect(dealerConsents(closed)).toEqual([]);
  });

  test('Bestätigung, ihr Ereignis und die Weitergabe entstehen in einem Schritt', () => {
    const id = openCase();
    unwrap(useAppStore.getState().escalate(id));
    let writes = 0;
    const unsubscribe = useAppStore.subscribe(() => (writes += 1));
    const consent = unwrap(useAppStore.getState().shareWithDealer(id, 'test'));
    unsubscribe();
    expect(writes).toBe(1);
    const s = useAppStore.getState();
    expect(s.shares[id]).toEqual({ consentId: consent.id });
    expect(
      s.events.filter((e) => e.caseId === id && e.type === 'weitergabe_bestaetigt').at(-1)?.payload,
    ).toMatchObject({ purpose: 'weitergabe_haendler', recipient: dealer.name });
  });

  test('nach dem Widerruf lässt sich der Fall wieder senden', () => {
    const id = openCase();
    unwrap(useAppStore.getState().escalate(id));
    const first = unwrap(useAppStore.getState().shareWithDealer(id, 'test'));
    useAppStore.getState().revokeConsent(first.id);
    const second = unwrap(useAppStore.getState().shareWithDealer(id, 'test'));
    expect(useAppStore.getState().shares[id]).toEqual({ consentId: second.id });
    expect(dealerConsents(id).filter((k) => !k.revokedAt)).toEqual([second]);
  });

  test('Nachricht an den Händler nur, solange der Fall bei ihm ist und offen', () => {
    const id = openCase();
    const s = () => useAppStore.getState();
    unwrap(s().escalate(id));
    let before = s();
    expect(s().messageDealer(id, 'Hallo')).toEqual(rule('haendler_schreiben'));
    expect(s()).toBe(before);
    const consent = unwrap(s().shareWithDealer(id, 'test'));
    expect(unwrap(s().messageDealer(id, '  Hallo  ')).payload).toEqual({ text: 'Hallo' });
    // Leer geht nichts an den Händler
    before = s();
    expect(s().messageDealer(id, '   ')).toEqual(rule('haendler_schreiben'));
    expect(s()).toBe(before);
    // Das Backend weiß vom Ende der Weitergabe: nichts mehr an den Händler
    s().updateShare(id, { revoked: true });
    before = s();
    expect(s().messageDealer(id, 'Noch da?')).toEqual(rule('haendler_schreiben'));
    expect(s()).toBe(before);
    s().updateShare(id, { revoked: false });
    s().revokeConsent(consent.id);
    before = s();
    expect(s().messageDealer(id, 'Noch da?')).toEqual(rule('haendler_schreiben'));
    expect(s()).toBe(before);

    // Im geschlossenen Fall nicht, auch mit gültiger Weitergabe
    const closed = openCase();
    unwrap(s().escalate(closed));
    unwrap(s().shareWithDealer(closed, 'test'));
    unwrap(s().runCommand(closed, 'abbrechen', { cancelReason: 'Test' }));
    before = s();
    expect(s().messageDealer(closed, 'Hallo')).toEqual(rule('haendler_schreiben'));
    expect(s()).toBe(before);
  });
});

describe('Gespräch mit dem Händler nach den Regeln (Übertragung Schritt 3)', () => {
  test('das Angebot kommt erst, wenn Hilfe nötig ist', async () => {
    const id = openCase();
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(offerButton()).toBeNull();
    await act(async () => {
      unwrap(useAppStore.getState().escalate(id));
    });
    expect(offerButton()).toBeTruthy();
  });

  test('ein Doppeltap auf „Ja, senden“ sendet den Fall einmal', async () => {
    const caseId = setup();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    await tap(new RegExp(`^${de.sharing.offer(dealer.name)}`));
    const send = screen.getByRole('button', { name: de.sharing.send });
    // Zwei Taps, bevor das Gespräch sich neu zeichnet
    await act(async () => {
      fireEvent.press(send);
      fireEvent.press(send);
    });
    expect(dealerConsents(caseId)).toHaveLength(1);
    expect(screen.getByText(de.sharing.sent(dealer.name))).toBeTruthy();
  });

  test('ist der Fall inzwischen geschlossen, sendet „Ja, senden“ nichts und sagt es ruhig', async () => {
    const caseId = setup();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    await tap(new RegExp(`^${de.sharing.offer(dealer.name)}`));
    const send = screen.getByRole('button', { name: de.sharing.send });
    await act(async () => {
      unwrap(useAppStore.getState().runCommand(caseId, 'abbrechen', { cancelReason: 'Test' }));
    });
    await fireEvent.press(send);
    expect(dealerConsents(caseId)).toEqual([]);
    expect(screen.getByText(de.command.refused.other)).toBeTruthy();
  });

  /** Fall bei Fründ mit offener Rückfrage */
  async function withQuestion() {
    const caseId = setup();
    const consent = unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    useAppStore.getState().importRetailerEvents(caseId, [
      {
        id: 'hev_frage',
        caseId,
        type: 'haendler_rueckfrage',
        at: new Date(Date.now() + 1000).toISOString(),
        actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
        payload: { question: 'Hast du den Kaufbeleg noch?', options: ['Ja, als Foto', 'Nein'] },
      },
    ]);
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(screen.getByRole('button', { name: 'Ja, als Foto' })).toBeTruthy();
    return { caseId, consent };
  }

  test('nach dem Widerruf verschwinden die Antworten auf die Rückfrage, das Angebot kommt wieder', async () => {
    const { consent } = await withQuestion();
    await act(async () => {
      useAppStore.getState().revokeConsent(consent.id);
    });
    expect(screen.getByText('Hast du den Kaufbeleg noch?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ja, als Foto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nein' })).toBeNull();
    expect(offerButton()).toBeTruthy();
  });

  test('im geschlossenen Fall keine Antworten auf die Rückfrage', async () => {
    const { caseId } = await withQuestion();
    await act(async () => {
      unwrap(useAppStore.getState().runCommand(caseId, 'abbrechen', { cancelReason: 'Test' }));
    });
    expect(screen.getByText('Hast du den Kaufbeleg noch?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ja, als Foto' })).toBeNull();
    expect(offerButton()).toBeNull();
  });

  test('ein geliefertes Ersatzteil heißt geliefert, ein anderer Stand bestellt', async () => {
    const caseId = setup();
    unwrap(useAppStore.getState().shareWithDealer(caseId, 'test'));
    const part = (id: string, status: string, ms: number): CaseEvent => ({
      id,
      caseId,
      type: 'haendler_ersatzteil',
      at: new Date(Date.now() + ms).toISOString(),
      actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
      payload: { part: id === 'hev_a' ? 'Laugenpumpe' : 'Türdichtung', status },
    });
    useAppStore
      .getState()
      .importRetailerEvents(caseId, [part('hev_a', 'geliefert', 1000), part('hev_b', '?', 2000)]);
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(screen.getByText(de.sharing.part('Laugenpumpe', 'geliefert'))).toBeTruthy();
    expect(screen.getByText(de.sharing.part('Türdichtung', 'bestellt'))).toBeTruthy();
  });
});
