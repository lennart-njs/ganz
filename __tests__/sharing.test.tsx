import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { scopeList } from '@/lib/consent';
import { buildSharedCaseFile, TIMELINE_EVENTS } from '@/lib/sharing';
import { can } from '@/model/policies/actions';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { CONSENT_SCOPES, type DataCategory } from '@/model/policies/consentScopes';
import type { SharedCaseFile, SharedPhoto } from '@/model/sharing';
import type { CaseEvent, CaseEventType, Id } from '@/model/types';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';
import { syncShare } from '@/store/useShareSync';
import { addWasher, photoCase, start } from '@/test/regressions';
import { unwrap } from '@/test/result';

const APP = './app';
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const dealer = {
  id: demoConfig.dealers[0]!.id,
  kind: 'haendler' as const,
  name: demoConfig.dealers[0]!.name,
};
const backend = services.backend as jest.Mocked<typeof services.backend>;
/** Der Satz vor „Ja, senden“: was der Händler sieht, aus dem Umfang der Bestätigung */
const summary = de.sharing.dataSummary(dealer.name, scopeList('weitergabe_haendler'));

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
    expect(screen.getByText(summary)).toBeTruthy();
    expect(screen.getByText(de.sharing.confirmText)).toBeTruthy();
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
    unwrap(useAppStore.getState().shareWithDealer(caseId));
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
    unwrap(useAppStore.getState().shareWithDealer(caseId));
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
    const consent = unwrap(useAppStore.getState().shareWithDealer(caseId));
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
    unwrap(useAppStore.getState().shareWithDealer(caseId));
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
    unwrap(useAppStore.getState().shareWithDealer(caseId));
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
    unwrap(useAppStore.getState().shareWithDealer(caseId));
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
    expect(s().shareWithDealer(id)).toEqual(rule('an_haendler_senden'));
    expect(s()).toBe(before);
    unwrap(s().escalate(id));
    const consent = unwrap(s().shareWithDealer(id));
    expect(consent).toMatchObject({
      caseId: id,
      purpose: 'weitergabe_haendler',
      recipient: dealer,
    });
    // Noch einmal: Der Fall ist schon beim Händler
    before = s();
    expect(s().shareWithDealer(id)).toEqual(rule('an_haendler_senden'));
    expect(s()).toBe(before);
    expect(s().shareWithDealer('GS-99999')).toEqual({
      ok: false,
      refusal: { code: 'unbekannt', what: 'fall', id: 'GS-99999' },
    });

    // Ohne Händler am Gerät und im geschlossenen Fall nicht
    const other = openCase(false);
    unwrap(s().escalate(other));
    expect(s().shareWithDealer(other)).toEqual(rule('an_haendler_senden'));
    const closed = openCase();
    unwrap(s().escalate(closed));
    unwrap(s().runCommand(closed, 'abbrechen', { cancelReason: 'Test' }));
    expect(s().shareWithDealer(closed)).toEqual(rule('an_haendler_senden'));
    expect(dealerConsents(closed)).toEqual([]);
  });

  test('Bestätigung, ihr Ereignis und die Weitergabe entstehen in einem Schritt', () => {
    const id = openCase();
    unwrap(useAppStore.getState().escalate(id));
    let writes = 0;
    const unsubscribe = useAppStore.subscribe(() => (writes += 1));
    const consent = unwrap(useAppStore.getState().shareWithDealer(id));
    unsubscribe();
    expect(writes).toBe(1);
    const s = useAppStore.getState();
    expect(s.shares[id]).toEqual({ consentId: consent.id });
    expect(
      s.events.filter((e) => e.caseId === id && e.type === 'weitergabe_bestaetigt').at(-1)?.payload,
    ).toMatchObject({ purpose: 'weitergabe_haendler', recipient: dealer.name });
  });

  test('einmal je Fall: nicht noch einmal, solange der Widerruf unterwegs ist, und nicht danach', () => {
    const id = openCase();
    const s = () => useAppStore.getState();
    unwrap(s().escalate(id));
    const first = unwrap(s().shareWithDealer(id));
    s().updateShare(id, { token: 'tok-1', syncedEvents: 1 });
    s().revokeConsent(first.id);
    // Der Widerruf ist unterwegs: Die Weitergabe mit ihrem Token bleibt, bis das Backend es weiß
    let before = s();
    expect(s().shareWithDealer(id)).toEqual(rule('an_haendler_senden'));
    expect(s()).toBe(before);
    expect(s().shares[id]).toEqual({ consentId: first.id, token: 'tok-1', syncedEvents: 1 });
    // Das Backend weiß vom Widerruf. Denselben Fall nimmt es nicht wieder an (backend.test.ts).
    s().updateShare(id, { revoked: true });
    before = s();
    expect(s().shareWithDealer(id)).toEqual(rule('an_haendler_senden'));
    expect(s()).toBe(before);
    expect(dealerConsents(id)).toEqual([{ ...first, revokedAt: expect.any(String) }]);
  });

  test('Nachricht an den Händler nur, solange der Fall bei ihm ist und offen', () => {
    const id = openCase();
    const s = () => useAppStore.getState();
    unwrap(s().escalate(id));
    let before = s();
    expect(s().messageDealer(id, 'Hallo')).toEqual(rule('haendler_schreiben'));
    expect(s()).toBe(before);
    const consent = unwrap(s().shareWithDealer(id));
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
    unwrap(s().shareWithDealer(closed));
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

  test('schließt der Fall bei offener Karte, geht sie zu, und der geschlossene Fall hat seine Knöpfe', async () => {
    const caseId = setup();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    await tap(new RegExp(`^${de.sharing.offer(dealer.name)}`));
    expect(screen.getByRole('button', { name: de.sharing.send })).toBeTruthy();
    await act(async () => {
      unwrap(useAppStore.getState().runCommand(caseId, 'abbrechen', { cancelReason: 'Test' }));
    });
    expect(screen.queryByRole('button', { name: de.sharing.send })).toBeNull();
    expect(screen.queryByRole('button', { name: de.sharing.cancel })).toBeNull();
    expect(screen.queryByText(summary)).toBeNull();
    expect(screen.getByRole('button', { name: de.thread.caseFile })).toBeTruthy();
    expect(screen.getByRole('button', { name: de.thread.done })).toBeTruthy();
    expect(dealerConsents(caseId)).toEqual([]);
  });

  test('kommt „Ja, senden“ im selben Moment wie das Schließen, sendet es nichts und sagt es ruhig', async () => {
    const caseId = setup();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    await tap(new RegExp(`^${de.sharing.offer(dealer.name)}`));
    const send = screen.getByRole('button', { name: de.sharing.send });
    // Der Tap trifft die Karte, bevor sie sich nach dem Schließen neu zeichnet
    await act(async () => {
      unwrap(useAppStore.getState().runCommand(caseId, 'abbrechen', { cancelReason: 'Test' }));
      fireEvent.press(send);
    });
    expect(dealerConsents(caseId)).toEqual([]);
    expect(screen.getByText(de.command.refused.other)).toBeTruthy();
    // Danach bietet die Karte das Senden nicht mehr an
    expect(screen.queryByRole('button', { name: de.sharing.send })).toBeNull();
    expect(screen.getByRole('button', { name: de.thread.caseFile })).toBeTruthy();
  });

  test('wird der Fall nach dem Schließen wieder geöffnet, kommt die Karte erst nach einem neuen Tap', async () => {
    const caseId = setup();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    await tap(new RegExp(`^${de.sharing.offer(dealer.name)}`));
    await act(async () => {
      unwrap(useAppStore.getState().runCommand(caseId, 'im_call_geloest'));
    });
    expect(screen.queryByRole('button', { name: de.sharing.send })).toBeNull();
    // „Geht doch nicht“: Der Fall braucht wieder Hilfe, das Angebot steht da, die Karte nicht
    await tap(de.thread.stillBroken);
    expect(useAppStore.getState().cases[caseId]?.status).toBe('eskaliert');
    expect(offerButton()).toBeTruthy();
    expect(screen.queryByRole('button', { name: de.sharing.send })).toBeNull();
  });

  /** Fall bei Fründ mit offener Rückfrage */
  async function withQuestion() {
    const caseId = setup();
    const consent = unwrap(useAppStore.getState().shareWithDealer(caseId));
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

  test('nach dem Widerruf verschwinden die Antworten auf die Rückfrage, das Angebot kommt nicht wieder', async () => {
    const { caseId, consent } = await withQuestion();
    await act(async () => {
      useAppStore.getState().revokeConsent(consent.id);
    });
    expect(screen.getByText('Hast du den Kaufbeleg noch?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ja, als Foto' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nein' })).toBeNull();
    expect(offerButton()).toBeNull();
    // Auch nicht, wenn das Backend vom Widerruf weiß
    await act(async () => {
      await syncShare(caseId);
    });
    expect(useAppStore.getState().shares[caseId]?.revoked).toBe(true);
    expect(offerButton()).toBeNull();
  });

  /** Fall bei Fründ, so wie nach dem ersten Abgleich: Token vom Backend, alles gesendet */
  function sentWithToken() {
    const caseId = setup();
    const consent = unwrap(useAppStore.getState().shareWithDealer(caseId));
    const synced = useAppStore.getState().events.filter((e) => e.caseId === caseId).length;
    useAppStore.getState().updateShare(caseId, { token: 'tok-1', syncedEvents: synced });
    return { caseId, consent };
  }
  const settle = async () => {
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  };

  test('Widerruf unterwegs: kein neues Angebot, der Widerruf trifft die erste Weitergabe', async () => {
    const { caseId, consent } = sentWithToken();
    let release!: (done: boolean) => void;
    backend.revoke.mockImplementationOnce(() => new Promise<boolean>((r) => (release = r)));
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    expect(offerButton()).toBeNull();
    await act(async () => {
      useAppStore.getState().revokeConsent(consent.id);
      await settle();
    });
    // Das Backend hat den Widerruf noch nicht bestätigt
    expect(backend.revoke).toHaveBeenCalledWith(caseId, 'tok-1');
    expect(useAppStore.getState().shares[caseId]?.revoked).toBeUndefined();
    expect(offerButton()).toBeNull();
    expect(screen.queryByRole('button', { name: de.sharing.send })).toBeNull();
    await act(async () => {
      release(true);
      await settle();
    });
    expect(useAppStore.getState().shares[caseId]).toMatchObject({
      consentId: consent.id,
      token: 'tok-1',
      revoked: true,
    });
    expect(dealerConsents(caseId).filter((k) => !k.revokedAt)).toEqual([]);
    expect(backend.share).not.toHaveBeenCalled();
    expect(offerButton()).toBeNull();
    expect(screen.getAllByText(de.sharing.sent(dealer.name))).toHaveLength(1);
  });

  test('Abruf läuft gerade: kein neues Angebot, der Widerruf geht danach mit dem Token raus', async () => {
    const { caseId, consent } = sentWithToken();
    await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    let releasePoll!: (events: CaseEvent[]) => void;
    backend.retailerEvents.mockImplementationOnce(
      () => new Promise<CaseEvent[]>((r) => (releasePoll = r)),
    );
    let poll!: Promise<void>;
    await act(async () => {
      poll = syncShare(caseId);
      await settle();
    });
    expect(backend.retailerEvents).toHaveBeenCalled();
    await act(async () => {
      useAppStore.getState().revokeConsent(consent.id);
      await settle();
    });
    // Der Abgleich ist belegt, der Widerruf wartet auf den nächsten Durchgang
    expect(backend.revoke).not.toHaveBeenCalled();
    expect(offerButton()).toBeNull();
    await act(async () => {
      releasePoll([]);
      await poll;
    });
    await act(async () => {
      await syncShare(caseId);
    });
    expect(backend.revoke).toHaveBeenCalledWith(caseId, 'tok-1');
    expect(useAppStore.getState().shares[caseId]).toMatchObject({ token: 'tok-1', revoked: true });
    expect(backend.share.mock.calls.filter(([, token]) => !token)).toEqual([]);
    expect(dealerConsents(caseId).filter((k) => !k.revokedAt)).toEqual([]);
    expect(offerButton()).toBeNull();
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
    unwrap(useAppStore.getState().shareWithDealer(caseId));
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

// ---------- Nur Erlaubtes in der Akte (Übertragung 3.1) ----------

const NOW = '2026-11-04T12:00:00.000Z';
const examplePhoto: SharedPhoto = {
  id: 'foto-akte',
  takenAt: NOW,
  purpose: 'display',
  source: 'demo',
};
const haendlerScope = CONSENT_SCOPES.weitergabe_haendler.dataCategories;

/**
 * Fall mit allem, was die Akte kennen kann: Gerät aus dem Vertrag mit Typenschild, Seriennummer
 * und Kaufdatum, gekauft bei Fründ. Foto mit Ergebnis und ein verworfenes Ergebnis, Anleitung bis
 * „Geht nicht“ mit Notiz, Befund mit Kostenvoranschlag, dann an Fründ. Danach Rückfrage mit
 * Antwort, Nachricht mit Foto und ein Termin mit Bewertung.
 */
function richCase(): Id {
  start();
  const device = addWasher();
  const s = () => useAppStore.getState();
  s().setDeviceDealer(device.id, dealer.id);
  useAppStore.setState((st) => ({
    devices: st.devices.map((d) =>
      d.id === device.id
        ? { ...d, materialNumber: 'MAT-123', serialNumber: 'SER-456', purchaseDate: NOW }
        : d,
    ),
  }));
  const id = photoCase(device.id);
  const run = unwrap(s().startGuide(id, 'ablauf'));
  s().moveGuideStep(run.id, 'next');
  s().finishGuide(run.id, 'geht_nicht', 'Pumpenflügel klemmt');
  // „Passt nicht“: ein Ergebnis, das nicht mehr gilt
  const stale = unwrap(
    s().addDiagnosis({
      caseId: id,
      photoIds: [],
      mode: 'symptom',
      errorPattern: 'verworfen',
      source: 'nutzerangabe',
      displayMessage: 'Verworfen',
      confidence: 'unsicher',
      confidenceScore: 0.2,
    }),
  );
  useAppStore.setState((st) => ({
    diagnoses: st.diagnoses.map((d) => (d.id === stale.id ? { ...d, discardedAt: NOW } : d)),
  }));
  // „Geht nicht“ hat den Fall schon an die Fachkraft gegeben (eskaliert)
  s().setFinding(id, 'reparatur', 'fachkraft');
  unwrap(s().shareWithDealer(id));
  s().importRetailerEvents(id, [
    {
      id: 'hev-frage',
      caseId: id,
      type: 'haendler_rueckfrage',
      at: NOW,
      actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
      payload: { question: 'Hast du den Kaufbeleg noch?', options: ['Ja', 'Nein'] },
    },
  ]);
  s().addEvent({
    caseId: id,
    type: 'rueckfrage_beantwortet',
    actor: { kind: 'haushalt' },
    payload: {
      question: 'Hast du den Kaufbeleg noch?',
      answer: 'Ja',
      questionEventId: 'hev-frage',
    },
  });
  unwrap(s().messageDealer(id, 'Hier der Kaufbeleg.', examplePhoto.id));
  useAppStore.setState((st) => ({
    bookings: [
      ...st.bookings,
      {
        id: 'termin-1',
        caseId: id,
        kind: 'reparatur',
        provider: { id: 'betrieb-1', kind: 'betrieb', name: 'Betrieb', authorized: true },
        slotLabel: demoConfig.slots[0]!,
        status: 'erledigt',
        subjectToApproval: false,
        rating: { stars: 4, at: NOW },
        createdAt: NOW,
      },
    ],
  }));
  return id;
}

/** Die Akte, optional mit anderen Kategorien in der Bestätigung */
function fileFor(id: Id, categories?: readonly string[]): SharedCaseFile {
  if (categories) {
    useAppStore.setState((st) => ({
      consents: st.consents.map((k) =>
        k.caseId === id && k.purpose === 'weitergabe_haendler'
          ? { ...k, dataCategories: [...categories] }
          : k,
      ),
    }));
  }
  return buildSharedCaseFile(useAppStore.getState(), id, [examplePhoto], NOW)!;
}

/** Wie Bestätigungen bis 2026-11-3 ihren Umfang speicherten: Bezeichnungen, keine Schlüssel */
const LEGACY_LABELS = [
  'Name und Adresse',
  'Gerät, Typenschild und Kaufdatum',
  'Problem und Fotos aus dem Fall',
  'Ergebnis und Schritte der Anleitung',
  'Befund, Kosten und Termin',
  'Deine Nachrichten an den Händler',
];

const isEmpty = (x: unknown) => x === undefined || x === '' || (Array.isArray(x) && x.length === 0);

/**
 * Jede Angabe der Akte und die Kategorie, ohne die sie leer bleibt. within: Sie steht in einer
 * anderen Angabe und fehlt auch ohne deren Kategorie.
 */
const FIELDS: Record<
  string,
  { category: DataCategory; within?: DataCategory; get: (f: SharedCaseFile) => unknown }
> = {
  'customer.name': { category: 'name', get: (f) => f.customer.name },
  'customer.address': { category: 'adresse', get: (f) => f.customer.address },
  'device.manufacturer': { category: 'geraet', get: (f) => f.device.manufacturer },
  'device.model': { category: 'geraet', get: (f) => f.device.model },
  'device.categoryLabel': { category: 'geraet', get: (f) => f.device.categoryLabel },
  'device.materialNumber': { category: 'typenschild', get: (f) => f.device.materialNumber },
  'device.serialNumber': { category: 'seriennummer', get: (f) => f.device.serialNumber },
  'device.purchaseDate': { category: 'kaufdatum', get: (f) => f.device.purchaseDate },
  'device.soldBy': { category: 'kaufdatum', get: (f) => f.device.soldBy },
  protection: { category: 'versicherung', get: (f) => f.protection },
  'case.problemLabel': { category: 'problem', get: (f) => f.case.problemLabel },
  results: { category: 'ergebnis', get: (f) => f.results },
  guide: { category: 'schritte', get: (f) => f.guide },
  'guide.note': { category: 'notiz', within: 'schritte', get: (f) => f.guide?.note },
  finding: { category: 'befund', get: (f) => f.finding },
  quote: { category: 'kosten', get: (f) => f.quote },
  booking: { category: 'termin', get: (f) => f.booking },
  photos: { category: 'fotos', get: (f) => f.photos },
  timeline: { category: 'verlauf', get: (f) => f.timeline },
  answers: { category: 'nachrichten_haendler', get: (f) => f.answers },
  messages: { category: 'nachrichten_haendler', get: (f) => f.messages },
  rating: { category: 'bewertung', get: (f) => f.rating },
};

/**
 * Angaben zur Weitergabe selbst, keine Daten aus einer Kategorie. Das Backend behält sie auch nach
 * dem Widerruf (redact in server/backend/fileStore.ts).
 */
const ENVELOPE = [
  'version',
  'caseId',
  'recipient',
  'consentId',
  'sharedAt',
  'updatedAt',
  'isExample',
  'device.category',
  'case.status',
  'case.statusLabel',
  'case.entry',
  'case.createdAt',
  'case.updatedAt',
  'case.closedAt',
  'case.resolution',
];

/** Alle Angaben der Akte, Name, Gerät und Fall je Feld */
function paths(f: SharedCaseFile): string[] {
  return Object.entries(f).flatMap(([key, value]) =>
    ['customer', 'device', 'case'].includes(key)
      ? Object.keys(value as object).map((sub) => `${key}.${sub}`)
      : [key],
  );
}

/**
 * Jede Ereignisart: Darf sie in den Verlauf der Akte? tsc verlangt jede Art. Eine neue Art ist
 * damit erst eine Entscheidung, bevor sie an den Händler geht.
 */
const IN_TIMELINE: Record<CaseEventType, boolean> = {
  fall_angelegt: true,
  foto_aufgenommen: true,
  ergebnis_erkannt: true,
  rueckfrage_gestellt: true,
  rueckfrage_beantwortet: true,
  anleitung_gestartet: true,
  schritt_erledigt: true,
  schritt_zurueck: true,
  schritt_geht_nicht: true,
  sicherheit_bestaetigt: true,
  anleitung_beendet: true,
  weitergabe_bestaetigt: true,
  einwilligung_widerrufen: true,
  videocall_angefragt: true,
  videocall_gestartet: true,
  videocall_beendet: true,
  befund_erstellt: true,
  angebot_erstellt: true,
  schaden_gemeldet: true,
  freigabe_entschieden: true,
  termin_angefragt: true,
  termin_bestaetigt: true,
  betrieb_unterwegs: true,
  reparatur_abgeschlossen: true,
  abschluss_bestaetigt: true,
  problem_besteht_weiter: true,
  bewertet: true,
  pausiert: true,
  fortgesetzt: true,
  abgebrochen: true,
  status_geaendert: true,
  haendler_angenommen: true,
  haendler_rueckfrage: true,
  haendler_entscheidung: true,
  haendler_betrieb: true,
  haendler_status: true,
  haendler_nachricht: true,
  haendler_termin: true,
  haendler_ersatzteil: true,
  // Gespräch mit dem Assistenten
  assistent_gefragt: false,
  // Steht in messages
  nachricht_an_haendler: false,
  // ganz Nr. 31 bis 34: entscheidet Schritt 5.2 der Übertragung
  preis_genannt: false,
  zahlungspflichtig_gebucht: false,
  nicht_gebucht: false,
  termin_abgesagt: false,
  nachbesserung_verlangt: false,
};

describe('Nur Erlaubtes in der Akte (Übertragung 3.1)', () => {
  test('jede Angabe hat ihre Kategorie oder gehört zur Weitergabe selbst', () => {
    const file = fileFor(richCase());
    for (const p of paths(file)) {
      expect([p, p in FIELDS || ENVELOPE.includes(p)]).toEqual([p, true]);
    }
    // Die Kategorien der Angaben sind genau der Umfang der Bestätigung
    const used = new Set(Object.values(FIELDS).map((f) => f.category));
    expect([...used].sort()).toEqual([...haendlerScope].sort());
  });

  test('mit dem ganzen Umfang ist jede Angabe gefüllt', () => {
    const file = fileFor(richCase());
    for (const [name, field] of Object.entries(FIELDS)) {
      expect([name, isEmpty(field.get(file))]).toEqual([name, false]);
    }
  });

  test.each(haendlerScope)('ohne %s bleiben genau dessen Angaben leer', (key) => {
    const file = fileFor(
      richCase(),
      haendlerScope.filter((k) => k !== key),
    );
    for (const [name, field] of Object.entries(FIELDS)) {
      const gone = field.category === key || field.within === key;
      expect([name, isEmpty(field.get(file))]).toEqual([name, gone]);
    }
    // Die Akte bleibt eine, die das Backend annimmt
    expect(file.case.status).toBe(useAppStore.getState().cases[file.caseId]!.status);
  });

  // U5: Bestätigungen von vor 2026-11-4 speichern Bezeichnungen. 2026-11-1 (mach’s, 02.11.2026)
  // nannte fünf, ohne „Deine Nachrichten an den Händler“, 2026-11-3 sechs. Das Gespräch mit dem
  // Händler geht mit beiden weiter, also kommen Nachricht und Antwort auch an.
  test.each([
    ['2026-11-1', LEGACY_LABELS.slice(0, 5)],
    ['2026-11-3', LEGACY_LABELS],
  ])('Bestätigung %s aus Bezeichnungen: Nachrichten und Antworten gehen mit', (_v, labels) => {
    const id = richCase();
    const file = fileFor(id, labels);
    expect(can(selectCaseFacts(useAppStore.getState(), id), 'haendler_schreiben')).toBe(true);
    expect(file.messages?.map((m) => [m.text, m.photoId])).toEqual([
      ['Hier der Kaufbeleg.', examplePhoto.id],
    ]);
    expect(file.answers.map((a) => [a.questionEventId, a.answer])).toEqual([['hev-frage', 'Ja']]);
    // Was die Bezeichnungen nicht nannten, bleibt leer, alles andere ist da
    const gone = ['protection', 'guide.note', 'timeline', 'rating'];
    for (const [name, field] of Object.entries(FIELDS)) {
      expect([name, isEmpty(field.get(file))]).toEqual([name, gone.includes(name)]);
    }
  });

  test('ohne bekannte Kategorie geht nur die Weitergabe selbst', () => {
    const file = fileFor(richCase(), ['Etwas anderes']);
    for (const [name, field] of Object.entries(FIELDS)) {
      expect([name, isEmpty(field.get(file))]).toEqual([name, true]);
    }
  });

  test('der Verlauf ist eine Allow-List: jede Art ist entschieden, neue Arten bleiben draußen', () => {
    const allowed = Object.entries(IN_TIMELINE)
      .filter(([, yes]) => yes)
      .map(([type]) => type);
    expect([...TIMELINE_EVENTS].sort()).toEqual(allowed.sort());

    const id = richCase();
    const s = useAppStore.getState();
    for (const type of Object.keys(IN_TIMELINE) as CaseEventType[]) {
      if (!IN_TIMELINE[type]) {
        s.addEvent({ caseId: id, type, actor: { kind: 'system' }, payload: { partner: 'X' } });
      }
    }
    const file = fileFor(id);
    expect(file.timeline.length).toBeGreaterThan(5);
    for (const x of file.timeline) expect([x.type, IN_TIMELINE[x.type]]).toEqual([x.type, true]);
  });

  test('ein verworfenes Ergebnis geht nicht mit', () => {
    const id = richCase();
    const file = fileFor(id);
    expect(file.results.map((r) => r.displayMessage)).not.toContain('Verworfen');
    const kept = useAppStore.getState().diagnoses.filter((d) => d.caseId === id && !d.discardedAt);
    expect(file.results).toHaveLength(kept.length);
  });

  test('Befund, Kostenvoranschlag und Termin wie in den Fakten der laufenden Runde', () => {
    const id = richCase();
    const facts = () => selectCaseFacts(useAppStore.getState(), id)!;
    expect(fileFor(id)).toMatchObject({
      finding: { at: facts().finding!.createdAt },
      quote: { repair: facts().quote!.repair },
      booking: { slotLabel: facts().booking!.slotLabel },
    });
    // Ein Termin vorbehaltlich Freigabe verfällt mit der Ablehnung: Er zählt nicht mehr und geht
    // nicht an den Händler
    useAppStore.setState((st) => ({
      bookings: st.bookings.map((b) =>
        b.id === 'termin-1'
          ? { ...b, status: 'angefragt' as const, subjectToApproval: true, rating: undefined }
          : b,
      ),
      cases: {
        ...st.cases,
        [id]: {
          ...st.cases[id]!,
          claim: {
            contractId: st.contracts[0]!.id,
            reportedAt: NOW,
            reportedBy: st.persons[0]!.id,
            confirmationId: 'consent-test',
            decision: { result: 'abgelehnt' as const, at: NOW, actor: 'regel' as const },
          },
        },
      },
    }));
    expect(facts().booking).toBeUndefined();
    expect(fileFor(id).booking).toBeUndefined();
  });
});
