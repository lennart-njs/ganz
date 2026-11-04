// Foto an den Reparatur-Assistenten (Entscheidung 26): nur mit einer Einwilligung, deren Umfang
// Fotos im Gespräch nennt, nur mit der letzten Nachricht und eine Einschätzung nur zu einem Bild,
// das wirklich mitging.
import { renderHook } from '@testing-library/react-native';
import { act } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { hasPhotoConsent } from '@/lib/chat/context';
import { setChatImageForTest } from '@/lib/chat/photo';
import { useAssistant } from '@/lib/chat/useAssistant';
import { textStamp } from '@/lib/legalTexts';
import { useAppStore } from '@/store/appStore';

const fetchMock = jest.fn();
const reply = (body: object, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const flush = async () => {
  for (let i = 0; i < 4; i++) await act(async () => {});
};
const image = { mediaType: 'image/jpeg' as const, data: 'aGFsbG8=' };
const recipient = {
  id: demoConfig.assistant.id,
  kind: 'dienstleister' as const,
  name: demoConfig.assistant.name,
};

/** So steht die Einwilligung von mach’s (2026-11-1) auf dem Handy: Beschriftungen, kein Stempel */
const MACHS_LABELS = [
  'Deine Nachrichten',
  'Fotos, die du im Gespräch aufnimmst',
  'Gerät und Modell',
  'Problem',
  'Aktueller und erledigte Schritte',
];

function setup() {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'manuell',
  });
  const c = useAppStore
    .getState()
    .createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasserablauf' });
  const photo = useAppStore.getState().addPhoto({
    caseId: c.id,
    deviceId: device.id,
    purpose: 'frage',
    source: 'in_app_camera',
    uri: 'file:///frage.jpg',
  });
  return { caseId: c.id, photoId: photo.id };
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('Foto an den Assistenten nur mit passender Einwilligung', () => {
  test.each([
    ['mach’s 2026-11-1 ohne Stempel', '2026-11-1', MACHS_LABELS],
    ['ganz 2026-11-3, „Fotos schickt die App nicht mit“', '2026-11-3', ['nachrichten', 'geraet']],
  ])(
    'ältere Einwilligung (%s): Text ja, Foto erst nach neuer Einwilligung',
    async (_, version, cats) => {
      const { caseId, photoId } = setup();
      useAppStore.getState().grantConsent({
        purpose: 'chat_assistent',
        legalBasis: 'einwilligung',
        recipient,
        dataCategories: cats,
        textVersion: version,
      });
      expect(hasPhotoConsent(useAppStore.getState())).toBe(false);
      setChatImageForTest(photoId, image);
      const { result } = await renderHook(() => useAssistant(caseId));
      await act(async () => result.current.send('Mache ich das so richtig?', photoId));
      await flush();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.waiting).toEqual({ text: 'Mache ich das so richtig?', photoId });

      fetchMock.mockReturnValueOnce(
        reply({
          reply: 'Sieht nach Schritt 1 aus.',
          suggestion: 'keine',
          guideId: '',
          assessment: 'passt',
        }),
      );
      await act(async () => result.current.accept());
      await flush();
      const consent = useAppStore.getState().consents.at(-1)!;
      expect(consent.textVersion).toBe(textStamp('assistent_einwilligung').textVersion);
      expect(consent.dataCategories).toContain('gespraechsfotos');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.messages.at(-1)).toEqual({
        role: 'haushalt',
        text: 'Mache ich das so richtig?',
        image,
      });
      const answer = useAppStore.getState().chatMessages.at(-1)!;
      expect(answer.assessment).toBe('passt');
    },
  );

  test('eine ältere Einwilligung reicht weiter für Text ohne Foto', async () => {
    const { caseId } = setup();
    useAppStore.getState().grantConsent({
      purpose: 'chat_assistent',
      legalBasis: 'einwilligung',
      recipient,
      dataCategories: MACHS_LABELS,
      textVersion: '2026-11-1',
    });
    const { result } = await renderHook(() => useAssistant(caseId));
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Steht Wasser drin?', suggestion: 'keine', guideId: '' }),
    );
    await act(async () => result.current.send('Es pumpt nicht ab.'));
    await flush();
    expect(result.current.waiting).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('nach dem Widerruf geht mit „Noch einmal senden“ auch kein Foto raus', async () => {
    const { caseId, photoId } = setup();
    setChatImageForTest(photoId, image);
    const { result } = await renderHook(() => useAssistant(caseId));
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await act(async () => result.current.send('Mache ich das so richtig?', photoId));
    await act(async () => result.current.accept());
    await flush();
    expect(result.current.error).toBe('netz');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const consent = useAppStore.getState().consents.find((k) => k.purpose === 'chat_assistent')!;
    await act(async () => useAppStore.getState().revokeConsent(consent.id));
    await act(async () => result.current.retry());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('Beispielfoto ohne Bild: kein Bild in der Anfrage, Hinweis im Text, keine Einschätzung', async () => {
    const { caseId, photoId } = setup();
    const { result } = await renderHook(() => useAssistant(caseId));
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Sieht gut aus.', suggestion: 'keine', guideId: '', assessment: 'passt' }),
    );
    await act(async () => result.current.send(de.chat.photoDefault, photoId));
    await act(async () => result.current.accept());
    await flush();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages.at(-1)).toEqual({
      role: 'haushalt',
      text: `${de.chat.photoMarker} ${de.chat.photoDefault}`,
    });
    // Der Kontext nennt nur Schlüssel, keinen Text aus der Anleitung
    expect(Object.keys(body.context).sort()).toEqual(
      ['category', 'hasProtection', 'manufacturerId', 'model', 'problem'].sort(),
    );
    expect(useAppStore.getState().chatMessages.at(-1)!.assessment).toBeUndefined();
  });
});
