import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { setChatImageForTest } from '@/lib/chat/photo';
import type { DeviceCategory } from '@/model/types';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const t = de.chat;
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

const fetchMock = jest.fn();
const reply = (body: object, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

function setup(category: DeviceCategory = 'waschmaschine') {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  s.linkContract('vertragsnummer');
  const device = s.addDevice({
    manufacturerId: 'miele',
    category,
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]!.id,
  });
  return device;
}

/** Eigene Worte in „Problem melden“: Sie gehen an den Assistenten im Gespräch des Falls */
async function ask(text: string) {
  await fireEvent.changeText(screen.getByLabelText(de.thread.inputLabel), text);
  await tap(t.send);
  await act(async () => {});
}

const flush = async () => {
  for (let i = 0; i < 4; i++) await act(async () => {});
};

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('Reparatur-Assistent', () => {
  test('erst die Einwilligung, dann geht die Frage von selbst los', async () => {
    setup();
    const r = await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Steht das Wasser in der Trommel?', suggestion: 'keine', guideId: '' }),
    );
    await ask('Es pumpt nicht ab.');
    expect(r.getPathname()).toBe('/fall/GS-24817');
    expect(screen.getByText(t.consentText(demoConfig.assistant.name))).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    await tap(t.consentAccept);
    await flush();
    const consent = useAppStore.getState().consents.find((k) => k.purpose === 'chat_assistent');
    expect(consent).toMatchObject({
      legalBasis: 'einwilligung',
      recipient: { kind: 'dienstleister', name: demoConfig.assistant.name },
    });
    // Kein zweites Absenden nötig
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Steht das Wasser in der Trommel?')).toBeTruthy();
  });

  test('Frage, Antwort und Vorschlag „Anleitung starten“', async () => {
    setup();
    const r = await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockReturnValueOnce(
      reply({
        reply: 'Das klingt nach dem Laugenfilter.',
        suggestion: 'anleitung',
        guideId: 'ablauf',
      }),
    );
    await ask('Nach dem Waschen steht Wasser in der Trommel.');
    await tap(t.consentAccept);
    await flush();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/chat');
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual([
      { role: 'haushalt', text: 'Nach dem Waschen steht Wasser in der Trommel.' },
    ]);
    expect(body.context).toMatchObject({ category: 'waschmaschine', device: 'WKB 130' });
    // Keine Adresse, keine Vertragsnummer
    const sent = JSON.stringify(body);
    expect(sent).not.toContain(demoConfig.household.address.street);
    expect(sent).not.toContain(demoConfig.contract.number);

    expect(screen.getByText('Das klingt nach dem Laugenfilter.')).toBeTruthy();
    const id = Object.keys(useAppStore.getState().cases)[0]!;
    expect(useAppStore.getState().cases[id]?.problemLabel).toBe(
      'Nach dem Waschen steht Wasser in der Trommel.',
    );
    expect(useAppStore.getState().events.some((e) => e.type === 'assistent_gefragt')).toBe(true);

    await tap(t.startGuide(guides.ablauf.title));
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(screen.getByText(guides.ablauf.steps[0]!.t)).toBeTruthy();
    expect(Object.values(useAppStore.getState().guideRuns)[0]?.guideId).toBe('ablauf');
  });

  test('Vorschlag „Hilfe holen“ führt zur Fachkraft', async () => {
    setup('kuehlschrank');
    const r = await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Das sollte sich eine Fachkraft ansehen.', suggestion: 'hilfe', guideId: '' }),
    );
    await ask('Der Kühlschrank riecht verbrannt.');
    await tap(t.consentAccept);
    await flush();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).context.category).toBe('kuehlschrank');
    await tap(t.getHelp);
    const id = Object.keys(useAppStore.getState().cases)[0]!;
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(useAppStore.getState().cases[id]?.status).toBe('eskaliert');
    expect(
      screen.getByRole('button', { name: new RegExp(`^${de.thread.callStart}`) }),
    ).toBeTruthy();
  });

  test('ohne Schlüssel auf dem Rechner: Notiz an die Fachkraft und Hilfe', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockReturnValueOnce(reply({ error: 'kein_schluessel' }, 503));
    await ask('Die Tür geht nicht auf.');
    await tap(t.consentAccept);
    await flush();
    expect(screen.getByText(de.thread.noteFallback)).toBeTruthy();
    expect(
      useAppStore
        .getState()
        .events.some(
          (e) =>
            e.type === 'rueckfrage_beantwortet' && e.payload.answer === 'Die Tür geht nicht auf.',
        ),
    ).toBe(true);
    expect(screen.queryByRole('button', { name: t.retry })).toBeNull();
    expect(screen.getByRole('button', { name: t.getHelp })).toBeTruthy();
  });

  test('Netzfehler: noch einmal senden', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await ask('Die Tür geht nicht auf.');
    await tap(t.consentAccept);
    await flush();
    expect(screen.getByText(t.errors.netz)).toBeTruthy();
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Ist das Programm zu Ende?', suggestion: 'keine', guideId: '' }),
    );
    await tap(t.retry);
    await flush();
    expect(screen.getByText('Ist das Programm zu Ende?')).toBeTruthy();
    // Die Frage wurde nicht doppelt gespeichert
    expect(useAppStore.getState().chatMessages.filter((m) => m.role === 'haushalt')).toHaveLength(
      1,
    );
  });

  test('zum Schritt: Entwurf mit dem Schritt im Eingabefeld', async () => {
    setup();
    const s = useAppStore.getState();
    const device = s.devices[0]!;
    const c = s.createCase({
      deviceId: device.id,
      entry: 'symptom',
      problemLabel: 'Wasserablauf gestört',
    });
    s.startGuide(c.id, 'ablauf');
    const r = await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    // Die Frage zum Schritt bleibt im Gespräch, der Entwurf steht im Eingabefeld
    await tap(t.askStep);
    expect(r.getPathname()).toBe(`/fall/${c.id}`);
    expect(screen.getByLabelText(de.thread.inputLabel).props.value).toBe(
      t.stepDraft(1, guides.ablauf.steps[0]!.t),
    );
  });

  test('Foto zum Schritt: Bild geht mit, die Einschätzung steht unter der Antwort', async () => {
    const device = setup();
    const s = useAppStore.getState();
    const c = s.createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasserablauf' });
    s.startGuide(c.id, 'ablauf');
    s.moveGuideStep(Object.keys(useAppStore.getState().guideRuns)[0]!, 'next');
    s.grantConsent({
      caseId: c.id,
      purpose: 'chat_assistent',
      legalBasis: 'einwilligung',
      recipient: { id: 'anthropic', kind: 'dienstleister', name: 'Anthropic' },
      dataCategories: [],
      textVersion: '2026-11-1',
    });
    const photo = s.addPhoto({
      caseId: c.id,
      deviceId: device.id,
      purpose: 'frage',
      source: 'in_app_camera',
      uri: 'file:///frage.jpg',
    });
    setChatImageForTest(photo.id, { mediaType: 'image/jpeg', data: 'aGFsbG8=' });
    await renderRouter(APP, { initialUrl: `/fall/${c.id}?foto=${photo.id}` });
    expect(screen.getByText(t.photoAttached)).toBeTruthy();
    fetchMock.mockReturnValueOnce(
      reply({
        reply: 'Das sieht nach Schritt 2 aus.',
        suggestion: 'keine',
        guideId: '',
        assessment: 'passt',
      }),
    );
    // Ohne eigenen Text geht die Standardfrage mit
    await tap(t.send);
    await flush();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages.at(-1)).toEqual({
      role: 'haushalt',
      text: t.photoDefault,
      image: { mediaType: 'image/jpeg', data: 'aGFsbG8=' },
    });
    expect(body.context.guide.current.t).toBe(guides.ablauf.steps[1]!.t);
    expect(screen.getByText(t.assessment.passt)).toBeTruthy();
    expect(screen.queryByText(t.photoAttached)).toBeNull();
    const msg = useAppStore.getState().chatMessages.find((m) => m.role === 'haushalt');
    expect(msg?.photoId).toBe(photo.id);
    // Der Fall läuft im Gespräch weiter
    expect(screen.getByRole('button', { name: de.guide.done })).toBeTruthy();
  });

  test('der Kamera-Knopf öffnet die Aufnahme für den Assistenten', async () => {
    const device = setup();
    const c = useAppStore
      .getState()
      .createCase({ deviceId: device.id, entry: 'symptom', problemLabel: 'Wasserablauf' });
    useAppStore.getState().startGuide(c.id, 'ablauf');
    const r = await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await tap(t.photoButton);
    expect(r.getPathname()).toBe(`/fall/${c.id}/foto-frage`);
  });

  test('die Oberfläche sagt nie „KI“ oder „AI“', () => {
    const texts = JSON.stringify(de);
    expect(texts).not.toMatch(/\bKI\b|\bAI\b|künstliche Intelligenz/i);
  });
});
