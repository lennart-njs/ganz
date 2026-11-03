import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import type { SharedCaseFile } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';
import { syncShare } from '@/store/useShareSync';

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
    useAppStore.getState().shareWithDealer(caseId, 'test');
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
    useAppStore.getState().shareWithDealer(caseId, 'test');
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
    const consent = useAppStore.getState().shareWithDealer(caseId, 'test')!;
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
    useAppStore.getState().shareWithDealer(caseId, 'test');
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
    useAppStore.getState().shareWithDealer(caseId, 'test');
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
    useAppStore.getState().shareWithDealer(caseId, 'test');
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
