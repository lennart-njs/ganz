// Ein Foto bleibt bei dem Empfänger, für den es aufgenommen wurde (Entscheidungen 26 und 32,
// Übertragung 1.1). Ein Foto für den Händler wird nie für den Assistenten vorbereitet und geht nie
// an ihn. Ein Foto für den Assistenten geht nie an den Händler. Auch dann nicht, wenn der andere
// schreibt, während das Foto am Eingabefeld hängt: Händler-Nachrichten kommen alle 5 Sekunden.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import * as chatPhoto from '@/lib/chat/photo';
import { textStamp } from '@/lib/legalTexts';
import { scopedConsent } from '@/model/policies/consentScopes';
import type { SharedCaseFile } from '@/model/sharing';
import type { Id } from '@/model/types';
import { services } from '@/services';
import { useAppStore } from '@/store/appStore';
import { syncShare } from '@/store/useShareSync';
import { APP } from '@/test/app';

const dealer = {
  id: demoConfig.dealers[0]!.id,
  kind: 'haendler' as const,
  name: demoConfig.dealers[0]!.name,
};
const dealerName = demoConfig.dealers[0]!.shortName ?? dealer.name;
const backend = services.backend as jest.Mocked<typeof services.backend>;
const image = { mediaType: 'image/jpeg' as const, data: 'aGFsbG8=' };

const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const flush = async () => {
  for (let i = 0; i < 6; i++) await act(async () => {});
};
const fetchMock = jest.fn();
const reply = (body: object) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });

let prepare: jest.SpyInstance;
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  // Verkleinern geht in Jest nicht: Das vorbereitete Bild kommt aus dem Test
  prepare = jest.spyOn(chatPhoto, 'prepareChatImage').mockImplementation(async (photoId) => {
    chatPhoto.setChatImageForTest(photoId, image);
    return image;
  });
});
afterEach(() => prepare.mockRestore());

/** Gerät von Fründ, der Fall ist an Fründ gegeben, Fotos an den Assistenten sind erlaubt */
function sharedCase(): { caseId: Id; deviceId: Id } {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'manuell',
    soldBy: dealer,
  });
  const c = s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasserablauf' });
  s.escalate(c.id);
  useAppStore.getState().shareWithDealer(c.id, 'test');
  useAppStore.getState().grantConsent(
    scopedConsent('chat_assistent', {
      recipient: {
        id: demoConfig.assistant.id,
        kind: 'dienstleister',
        name: demoConfig.assistant.name,
      },
      text: textStamp('assistent_einwilligung'),
    }),
  );
  return { caseId: c.id, deviceId: device.id };
}

/** Fründ schreibt ins Gespräch (Abruf alle 5 Sekunden) */
async function dealerWrites(caseId: Id, text = 'Wir schauen es uns an.') {
  await act(async () => {
    jest.advanceTimersByTime(1000);
    useAppStore.getState().importRetailerEvents(caseId, [
      {
        id: `hev_${Date.now()}`,
        caseId,
        type: 'haendler_nachricht',
        at: new Date().toISOString(),
        actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
        payload: { text, by: 'Sandra K.' },
      },
    ]);
  });
}

/** Die Antwort des Assistenten auf eine frühere Frage kommt an */
async function assistantAnswers(caseId: Id) {
  await act(async () => {
    jest.advanceTimersByTime(1000);
    useAppStore
      .getState()
      .addChatMessage({ caseId, role: 'assistent', text: 'Mach ein Foto vom Filter.' });
  });
}

const toDealer = () =>
  useAppStore.getState().events.filter((e) => e.type === 'nachricht_an_haendler');
const photoMessages = (photoId: Id) =>
  useAppStore.getState().chatMessages.filter((m) => m.photoId === photoId);
const switcher = () => screen.queryByRole('radio', { name: de.sharing.toAssistant });

describe('Foto bleibt beim gewählten Empfänger (Übertragung 1.1)', () => {
  // Probe aus der Übertragung (konflikte-chat §5): Auf 67d2fd8 ging das Foto an Fründ
  test('Foto für den Assistenten, dann schreibt Fründ: das Foto geht an den Assistenten', async () => {
    const { caseId, deviceId } = sharedCase();
    useAppStore.getState().addChatMessage({ caseId, role: 'haushalt', text: 'Frage' });
    await assistantAnswers(caseId);
    const photo = useAppStore.getState().addPhoto({
      caseId,
      deviceId,
      purpose: 'frage',
      source: 'in_app_camera',
      uri: 'file:///filter.jpg',
    });
    chatPhoto.setChatImageForTest(photo.id, image);
    await renderRouter(APP, { initialUrl: `/fall/${caseId}?foto=${photo.id}` });
    expect(screen.getByText(de.chat.photoAttached)).toBeTruthy();
    expect(screen.getByLabelText(de.thread.inputLabel)).toBeTruthy();

    await dealerWrites(caseId);
    // Der Empfänger bleibt, der Umschalter wartet, bis das Foto weg ist
    expect(screen.getByLabelText(de.thread.inputLabel)).toBeTruthy();
    expect(switcher()).toBeNull();

    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Der Filter sitzt richtig.', suggestion: 'keine', guideId: '' }),
    );
    await tap(de.chat.send);
    await flush();
    expect(toDealer()).toEqual([]);
    expect(photoMessages(photo.id)).toHaveLength(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages.at(-1)).toEqual({ role: 'haushalt', text: de.chat.photoDefault, image });
  });

  test('Kamera für den Assistenten: vorbereitet, und es bleibt beim Assistenten', async () => {
    const { caseId } = sharedCase();
    useAppStore.getState().addChatMessage({ caseId, role: 'haushalt', text: 'Frage' });
    await assistantAnswers(caseId);
    const r = await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    await tap(de.chat.photoButton);
    expect(r.getPathname()).toBe(`/fall/${caseId}/foto-frage`);
    await tap(de.camera.shutter);
    await flush();
    expect(r.getPathname()).toBe(`/fall/${caseId}`);
    const photo = useAppStore.getState().photos.at(-1)!;
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0]![0]).toBe(photo.id);

    await dealerWrites(caseId);
    fetchMock.mockReturnValueOnce(reply({ reply: 'Passt.', suggestion: 'keine', guideId: '' }));
    await tap(de.chat.send);
    await flush();
    expect(toDealer()).toEqual([]);
    expect(photoMessages(photo.id)).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages.at(-1).image).toEqual(image);
  });

  test('Foto für Fründ, dann antwortet der Assistent: das Foto geht an Fründ und nur dorthin', async () => {
    const { caseId } = sharedCase();
    useAppStore.getState().addChatMessage({ caseId, role: 'haushalt', text: 'Frage' });
    await dealerWrites(caseId, 'Hast du ein Foto vom Typenschild?');
    const r = await renderRouter(APP, { initialUrl: `/fall/${caseId}` });
    // Fründ sprach zuletzt: Die Kamera ist für Fründ
    await tap(de.sharing.photoButtonDealer(dealerName));
    expect(r.getPathname()).toBe(`/fall/${caseId}/foto-frage`);
    expect(screen.getByText(de.screens.fotoHaendler)).toBeTruthy();
    await tap(de.camera.shutter);
    await flush();
    expect(r.getPathname()).toBe(`/fall/${caseId}`);
    const photo = useAppStore.getState().photos.at(-1)!;
    // Nie im Speicher für den Assistenten
    expect(prepare).not.toHaveBeenCalled();
    expect(chatPhoto.chatImage(photo.id)).toBeUndefined();
    expect(screen.getByText(de.chat.photoAttached)).toBeTruthy();

    // Die Antwort auf die frühere Frage kommt, während das Foto am Feld hängt
    await assistantAnswers(caseId);
    expect(screen.getByLabelText(de.sharing.placeholderDealer(dealerName))).toBeTruthy();
    expect(switcher()).toBeNull();

    await tap(de.chat.send);
    await flush();
    expect(toDealer().map((e) => e.payload)).toEqual([
      { text: de.chat.photoLabel, photoId: photo.id },
    ]);
    expect(photoMessages(photo.id)).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    // Ohne Foto gibt es wieder die Wahl
    expect(switcher()).toBeTruthy();
  });

  test('mit Foto für Fründ gibt es keinen Umschalter, bis du das Foto entfernst', async () => {
    const { caseId, deviceId } = sharedCase();
    const photo = useAppStore.getState().addPhoto({
      caseId,
      deviceId,
      purpose: 'frage',
      source: 'demo',
      uri: '',
    });
    await renderRouter(APP, { initialUrl: `/fall/${caseId}?foto=${photo.id}&an=haendler` });
    expect(screen.getByText(de.chat.photoAttached)).toBeTruthy();
    expect(switcher()).toBeNull();
    await tap(de.chat.photoRemove);
    expect(screen.queryByText(de.chat.photoAttached)).toBeNull();
    expect(switcher()).toBeTruthy();
  });

  test('Weitergabe an Fründ beendet, während sein Foto hängt: das Foto geht an niemanden', async () => {
    const { caseId, deviceId } = sharedCase();
    const photo = useAppStore.getState().addPhoto({
      caseId,
      deviceId,
      purpose: 'frage',
      source: 'in_app_camera',
      uri: 'file:///typenschild.jpg',
    });
    // Selbst wenn ein Bild im Speicher läge, ginge es nicht mit
    chatPhoto.setChatImageForTest(photo.id, image);
    await renderRouter(APP, { initialUrl: `/fall/${caseId}?foto=${photo.id}&an=haendler` });
    expect(screen.getByText(de.chat.photoAttached)).toBeTruthy();
    await act(async () => {
      useAppStore.getState().updateShare(caseId, { revoked: true });
    });
    expect(screen.queryByText(de.chat.photoAttached)).toBeNull();
    expect(screen.getByRole('button', { name: de.chat.send })).toBeDisabled();

    fetchMock.mockReturnValueOnce(reply({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    await fireEvent.changeText(screen.getByLabelText(de.thread.inputLabel), 'Noch eine Frage');
    await tap(de.chat.send);
    await flush();
    expect(toDealer()).toEqual([]);
    expect(photoMessages(photo.id)).toEqual([]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages.at(-1)).toEqual({ role: 'haushalt', text: 'Noch eine Frage' });
  });
  test('die Akte für Fründ nennt ein Foto für den Assistenten nicht, auch nicht im Verlauf', async () => {
    const { caseId, deviceId } = sharedCase();
    const s = useAppStore.getState();
    const take = (uri: string) =>
      useAppStore
        .getState()
        .addPhoto({ caseId, deviceId, purpose: 'frage', source: 'in_app_camera', uri });
    const forAssistant = take('');
    const forDealer = take('');
    s.messageDealer(caseId, 'Hier das Typenschild.', forDealer.id);
    backend.share.mockClear();
    await act(async () => {
      await syncShare(caseId, false);
    });
    const file = backend.share.mock.calls.at(-1)![0] as SharedCaseFile;
    expect(file.photos.map((p) => p.id)).toEqual([forDealer.id]);
    expect(file.messages).toEqual([
      expect.objectContaining({ text: 'Hier das Typenschild.', photoId: forDealer.id }),
    ]);
    // Fotos zu Fragen stehen nicht im Verlauf: das für Fründ steht bei seiner Nachricht
    expect(file.timeline.filter((x) => x.type === 'foto_aufgenommen')).toEqual([]);
    const sent = JSON.stringify(file);
    expect(sent).not.toContain(forAssistant.id);
    expect(sent).not.toContain(de.caseFile.photoPurpose.frage);
  });
});
