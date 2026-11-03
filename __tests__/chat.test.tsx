import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { formatDateTime } from '@/i18n/format';
import { chatContext } from '@/lib/chat/context';
import { chatLimits } from '@/lib/chat/limits';
import { textStamp } from '@/lib/legalTexts';
import { parseRequest, type ChatContext } from '@/lib/chat/prompt';
import { CHAT_HEADERS, INSTALLATION_ID } from '@/lib/chat/protocol';
import { CONSENT_SCOPES, scopedConsent } from '@/model/policies/consentScopes';
import { services } from '@/services';
import { chatUrl } from '@/services/chatService';
import { INSTALLATION_KEY, forgetInstallationId } from '@/services/installation';
import type { DeviceCategory } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { addWasher, escapeRegExp, photoCase, start } from '@/test/regressions';
import { unwrap } from '@/test/result';

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
    expect(body.context).toMatchObject({ category: 'waschmaschine', model: 'WKB 130' });
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
    expect(r.getPathname()).toBe(`/fall/${id}/anleitung`);
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

  test('ohne Netz: ein ruhiger Hinweis mit zwei Wegen, noch einmal senden oder als Notiz', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await ask('Die Tür geht nicht auf.');
    await tap(t.consentAccept);
    await flush();
    expect(screen.getByText(t.errors.netz)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.retry })).toBeTruthy();
    expect(screen.getByRole('button', { name: t.saveNote })).toBeTruthy();
    // Ruhig: kein Ausrufezeichen, kein Fehlerwort
    expect(t.errors.netz).not.toMatch(/!|Fehler/);
  });

  test('ohne Netz als Notiz speichern: die Fachkraft bekommt die Nachricht, nichts geht doppelt', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await ask('Die Tür geht nicht auf.');
    await tap(t.consentAccept);
    await flush();
    await tap(t.saveNote);
    const id = Object.keys(useAppStore.getState().cases)[0]!;
    const notes = () =>
      useAppStore
        .getState()
        .events.filter((e) => e.caseId === id && e.type === 'rueckfrage_beantwortet');
    expect(notes().map((e) => e.payload)).toEqual([
      { question: de.thread.noteQuestion, answer: 'Die Tür geht nicht auf.' },
    ]);
    expect(screen.getByText(t.noteSaved)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.saveNote })).toBeNull();
    expect(screen.queryByRole('button', { name: t.retry })).toBeNull();
    expect(screen.getByRole('button', { name: t.getHelp })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Die nächste Nachricht geht wieder an den Assistenten
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Ist das Programm zu Ende?', suggestion: 'keine', guideId: '' }),
    );
    await ask('Jetzt geht das Netz wieder.');
    await flush();
    expect(screen.getByText('Ist das Programm zu Ende?')).toBeTruthy();
    expect(screen.queryByText(t.noteSaved)).toBeNull();
    expect(notes()).toHaveLength(1);
  });

  test('andere Fehler bieten keine Notiz zum Speichern an', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockReturnValueOnce(reply({ error: 'ausgelastet' }, 429));
    await ask('Die Tür geht nicht auf.');
    await tap(t.consentAccept);
    await flush();
    expect(screen.getByText(t.errors.ausgelastet)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.retry })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.saveNote })).toBeNull();
  });

  test('aus der Anleitung: Entwurf mit dem Schritt im Gespräch', async () => {
    setup();
    const s = useAppStore.getState();
    const device = s.devices[0]!;
    const c = s.createCase({
      deviceId: device.id,
      entry: 'symptom',
      problemLabel: 'Wasserablauf gestört',
    });
    s.startGuide(c.id, 'ablauf');
    const r = await renderRouter(APP, { initialUrl: `/fall/${c.id}?weiter=anleitung` });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    expect(r.getPathname()).toBe(`/fall/${c.id}/anleitung`);
    await tap(t.askStep);
    expect(r.getPathname()).toBe(`/fall/${c.id}`);
    expect(screen.getByLabelText(de.thread.inputLabel).props.value).toBe(
      t.stepDraft(1, guides.ablauf.steps[0]!.t),
    );
  });

  test('am Eingabefeld steht, dass eigene Worte an den Assistenten gehen', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    expect(screen.getByText(t.inputNotice)).toBeTruthy();
    expect(screen.getByLabelText(de.thread.inputLabel).props.accessibilityHint).toBe(t.inputNotice);
    const c = useAppStore.getState().createCase({
      deviceId: useAppStore.getState().devices[0]!.id,
      entry: 'freitext',
      problemLabel: 'Pumpe',
    });
    await act(async () => router.push(`/fall/${c.id}`));
    expect(screen.getByText(t.inputNotice)).toBeTruthy();
    expect(screen.getByLabelText(de.thread.inputLabel).props.accessibilityHint).toBe(t.inputNotice);
  });

  test('die Einwilligung verspricht nichts über eigene Worte', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    await ask('Es pumpt nicht ab.');
    expect(screen.getByText(t.consentExcluded)).toBeTruthy();
    // Der frühere Satz versprach das auch für Freitext, der solche Angaben enthalten kann
    expect(JSON.stringify(de)).not.toContain('Nicht dabei sind Fotos, Adresse und Vertragsnummer');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('die Oberfläche sagt nie „KI“ oder „AI“', () => {
    const texts = JSON.stringify(de);
    expect(texts).not.toMatch(/\bKI\b|\bAI\b|künstliche Intelligenz/i);
  });
});

describe('Grenze von 40 Nachrichten (R-11)', () => {
  /** Ein Fall mit Einwilligung und n Nachrichten, abwechselnd vom Haushalt und vom Assistenten */
  function chatWith(n: number) {
    const device = setup();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId: device.id,
      entry: 'freitext',
      problemLabel: 'Es pumpt nicht ab.',
    });
    s.grantConsent({
      purpose: 'chat_assistent',
      legalBasis: 'einwilligung',
      recipient: {
        id: demoConfig.assistant.id,
        kind: 'dienstleister',
        name: demoConfig.assistant.name,
      },
      dataCategories: [...CONSENT_SCOPES.chat_assistent.dataCategories],
      textVersion: '2026-10-1',
    });
    for (let i = 0; i < n; i++) {
      s.addChatMessage({
        caseId: c.id,
        role: i % 2 === 0 ? 'haushalt' : 'assistent',
        text: `Nachricht ${i + 1}`,
      });
    }
    return c.id;
  }

  const count = (id: string) =>
    useAppStore.getState().chatMessages.filter((m) => m.caseId === id).length;

  test('die letzte Frage geht mit dem ganzen Gespräch, danach ist Senden aus', async () => {
    const id = chatWith(chatLimits.messages - 2);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(screen.queryByText(t.full)).toBeNull();
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Dann hol dir besser Hilfe.', suggestion: 'keine', guideId: '' }),
    );
    await ask('Noch eine Frage');
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Kein Fenster über den Verlauf: alle Nachrichten, von der ersten an
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body).messages;
    expect(sent).toHaveLength(chatLimits.messages - 1);
    expect(sent[0]).toEqual({ role: 'haushalt', text: 'Nachricht 1' });
    expect(count(id)).toBe(chatLimits.messages);
    // Voll: Hinweis auf die Fachkraft, kein Eingabefeld, Hilfe holen
    expect(screen.getByText(t.full)).toBeTruthy();
    expect(screen.queryByLabelText(de.thread.inputLabel)).toBeNull();
    await tap(t.getHelp);
    expect(useAppStore.getState().cases[id]?.status).toBe('eskaliert');
  });

  test('meldet die Route ein volles Gespräch, wird die Nachricht zur Notiz', async () => {
    const id = chatWith(chatLimits.messages - 4);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    fetchMock.mockReturnValueOnce(reply({ error: 'voll' }, 413));
    await ask('Noch eine Frage');
    await flush();
    expect(screen.getByText(t.fullNoted)).toBeTruthy();
    expect(screen.queryByText(de.thread.noteFallback)).toBeNull();
    expect(screen.queryByLabelText(de.thread.inputLabel)).toBeNull();
    const note = useAppStore
      .getState()
      .events.find((e) => e.caseId === id && e.type === 'rueckfrage_beantwortet');
    expect(note?.payload).toEqual({ question: de.thread.noteQuestion, answer: 'Noch eine Frage' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('in der Anleitung gibt es keine Frage an den Assistenten mehr, wenn das Gespräch voll ist', async () => {
    const id = chatWith(chatLimits.messages);
    useAppStore.getState().startGuide(id, 'ablauf');
    await renderRouter(APP, { initialUrl: `/fall/${id}/anleitung` });
    expect(screen.getByText(guides.ablauf.steps[0]!.t)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.askStep })).toBeNull();
  });
});

describe('Einwilligung ohne Fall (R-15)', () => {
  /** Einwilligung im Gespräch eines Falls, eine Antwort des Assistenten */
  async function acceptedIn() {
    const device = setup();
    const c = useAppStore
      .getState()
      .createCase({ deviceId: device.id, entry: 'freitext', problemLabel: 'Pumpe' });
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    fetchMock.mockReturnValueOnce(
      reply({ reply: 'Steht Wasser drin?', suggestion: 'keine', guideId: '' }),
    );
    await ask('Es pumpt nicht ab.');
    await tap(t.consentAccept);
    await flush();
    return c.id;
  }

  const chatConsent = () =>
    useAppStore.getState().consents.find((k) => k.purpose === 'chat_assistent');

  test('gespeichert ohne Fall, die Fallakte nennt Empfänger, Zahl und Zeit', async () => {
    const id = await acceptedIn();
    expect(chatConsent()).toBeDefined();
    expect('caseId' in chatConsent()!).toBe(false);
    await act(async () => router.push(`/fall/${id}/fallakte`));
    const sent = useAppStore.getState().chatMessages.find((m) => m.role === 'haushalt')!;
    expect(
      screen.getByText(
        de.file.assistantLine(demoConfig.assistant.name, t.fileCount(1), formatDateTime(sent.at)),
      ),
    ).toBeTruthy();
    expect(screen.queryByText(de.file.none)).toBeNull();
  });

  test('eine Fallakte ohne Nachrichten nennt den Assistenten nicht', async () => {
    await acceptedIn();
    const other = useAppStore.getState().createCase({
      deviceId: useAppStore.getState().devices[0]!.id,
      entry: 'symptom',
      problemLabel: 'Tür klemmt',
    });
    await act(async () => router.push(`/fall/${other.id}/fallakte`));
    expect(screen.getByText(de.file.none)).toBeTruthy();
    expect(screen.queryAllByText(new RegExp(escapeRegExp(demoConfig.assistant.name)))).toHaveLength(
      0,
    );
  });

  test('im Profil widerrufbar, danach fragt das Gespräch wieder nach der Einwilligung', async () => {
    const id = await acceptedIn();
    await act(async () => router.push('/profil'));
    await fireEvent.press(
      screen.getByHintText(
        de.profile.revokeLabel(de.consentPurpose.chat_assistent, demoConfig.assistant.name),
      ),
    );
    expect(chatConsent()?.revokedAt).toBeDefined();

    // Die Fallakte nennt die Weitergabe weiter, mit dem Widerruf
    await act(async () => router.push(`/fall/${id}/fallakte`));
    const revoked = de.file.revoked(formatDateTime(chatConsent()!.revokedAt!));
    expect(screen.getByText(new RegExp(escapeRegExp(revoked)))).toBeTruthy();

    // Das Gespräch fragt erst wieder, und ohne Ja geht nichts an den Assistenten
    await act(async () => router.push(`/fall/${id}`));
    await ask('Noch eine Frage');
    expect(screen.getByText(t.consentTitle)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('Kontext für die Route', () => {
  /** So wie die App ihn schickt: ohne leere Felder */
  const request = (caseId: string) =>
    JSON.parse(
      JSON.stringify({
        context: chatContext(useAppStore.getState(), caseId),
        messages: [{ role: 'haushalt', text: 'Es pumpt nicht ab.' }],
      }),
    );

  test('die App schickt Schlüssel aus dem Katalog, und die Route nimmt sie an', () => {
    start();
    const id = photoCase(addWasher().id, 'ablauf');
    const s = useAppStore.getState();
    const run = unwrap(s.startGuide(id, 'ablauf'));
    s.moveGuideStep(run.id, 'next');
    unwrap(useAppStore.getState().finishGuide(run.id, 'geht_nicht'));
    const body = request(id);
    expect(body.context).toEqual({
      category: 'waschmaschine',
      manufacturerId: demoConfig.manufacturer.id,
      model: demoConfig.device.model,
      problem: guides.ablauf.title,
      errorPattern: 'wasserablauf',
      displayMessage: 'Wasserablauf',
      guide: { id: 'ablauf', step: 2, ended: 'geht_nicht' },
      hasProtection: true,
    });
    expect(parseRequest(body)).toEqual(body);
  });

  test('was der Katalog nicht kennt, bleibt weg, lange Felder werden gekürzt', () => {
    start({ contract: false });
    const s = useAppStore.getState();
    const device = s.addDevice({
      manufacturerId: 'unbekannt',
      category: 'trockner',
      model: 'M'.repeat(chatLimits.field + 50),
      identifiedBy: 'manuell',
    });
    const c = s.createCase({
      deviceId: device.id,
      entry: 'freitext',
      problemLabel: 'P'.repeat(chatLimits.field + 50),
    });
    const body = request(c.id);
    expect(body.context).toEqual({
      category: 'trockner',
      model: 'M'.repeat(chatLimits.field),
      problem: 'P'.repeat(chatLimits.field),
      hasProtection: false,
    });
    expect(parseRequest(body)).toEqual(body);
  });
});

describe('Anfrage an den eigenen Server', () => {
  const context: ChatContext = {
    category: 'waschmaschine',
    model: demoConfig.device.model,
    problem: 'Pumpt nicht ab',
    hasProtection: true,
  };
  const messages = [{ role: 'haushalt' as const, text: 'Es bleibt Wasser stehen.' }];
  const sentHeaders = (call = 0) => fetchMock.mock.calls[call][1].headers as Record<string, string>;

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_CHAT_TOKEN;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  test('die Adresse kommt aus EXPO_PUBLIC_API_URL, ohne sie gilt der relative Pfad', async () => {
    expect(chatUrl(undefined)).toBe('/api/chat');
    expect(chatUrl('  ')).toBe('/api/chat');
    expect(chatUrl('https://chat.example.org/')).toBe('https://chat.example.org/api/chat');
    expect(chatUrl('https://chat.example.org/ganz')).toBe('https://chat.example.org/ganz/api/chat');
    fetchMock.mockReturnValue(reply({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    await services.chat.ask(context, messages);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/chat');
    process.env.EXPO_PUBLIC_API_URL = 'https://chat.example.org';
    await services.chat.ask(context, messages);
    expect(fetchMock.mock.calls[1][0]).toBe('https://chat.example.org/api/chat');
  });

  test('die App loggt nichts, auch nicht bei Fehlern', async () => {
    const methods = ['error', 'warn', 'log', 'info', 'debug'] as const;
    const spies = methods.map((m) => jest.spyOn(console, m).mockImplementation(() => undefined));
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    fetchMock.mockReturnValueOnce(reply({ error: 'dienst' }, 502));
    fetchMock.mockReturnValueOnce(reply({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    for (let i = 0; i < 3; i++) await services.chat.ask(context, messages);
    expect(spies.flatMap((spy) => spy.mock.calls)).toEqual([]);
    spies.forEach((spy) => spy.mockRestore());
  });

  test('Pitch-Token und Installations-ID gehen im Header mit, nie im Body', async () => {
    process.env.EXPO_PUBLIC_CHAT_TOKEN = 'pitch-w45';
    fetchMock.mockReturnValue(reply({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    await services.chat.ask(context, messages);
    await services.chat.ask(context, messages);
    const [first, second] = [sentHeaders(0), sentHeaders(1)];
    expect(first[CHAT_HEADERS.token]).toBe('pitch-w45');
    expect(first[CHAT_HEADERS.installation]).toMatch(INSTALLATION_ID);
    // Dieselbe Installation bei jeder Anfrage, auch nach einem Neustart der App
    expect(second[CHAT_HEADERS.installation]).toBe(first[CHAT_HEADERS.installation]);
    forgetInstallationId();
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBe(first[CHAT_HEADERS.installation]);
    await services.chat.ask(context, messages);
    expect(sentHeaders(2)[CHAT_HEADERS.installation]).toBe(first[CHAT_HEADERS.installation]);
    const body = fetchMock.mock.calls[0][1].body as string;
    expect(body).not.toContain('pitch-w45');
    expect(body).not.toContain(first[CHAT_HEADERS.installation]);
  });

  test('Alles zurücksetzen, der Demo-Startstand und der Widerruf löschen die Installations-ID', async () => {
    fetchMock.mockReturnValue(reply({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    const sentId = (call: number) => sentHeaders(call)[CHAT_HEADERS.installation];
    const ids: (string | undefined)[] = [];
    const askAgain = async () => {
      await services.chat.ask(context, messages);
      ids.push(sentId(ids.length));
      return ids[ids.length - 1];
    };
    const first = await askAgain();
    expect(first).toMatch(INSTALLATION_ID);
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBe(first);

    // „Alles zurücksetzen“ in der Demo-Steuerung
    await act(async () => useAppStore.getState().reset());
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBeNull();
    const second = await askAgain();
    expect(second).toMatch(INSTALLATION_ID);
    expect(second).not.toBe(first);

    // Demo-Startstand: ohne Einwilligung in den Assistenten
    await act(async () => useAppStore.getState().loadDemoStart());
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBeNull();
    const third = await askAgain();
    expect(third).not.toBe(second);

    // Widerruf einer anderen Einwilligung: Die ID bleibt
    const grant = (purpose: 'chat_assistent' | 'mitteilungen') =>
      act(async () =>
        useAppStore.getState().grantConsent(
          purpose === 'chat_assistent'
            ? scopedConsent('chat_assistent', {
                recipient: {
                  id: 'assistent',
                  kind: 'dienstleister',
                  name: demoConfig.assistant.name,
                },
                text: textStamp('assistent_einwilligung'),
              })
            : scopedConsent('mitteilungen', {
                recipient: { id: 'ganz', kind: 'dienstleister', name: de.app.name },
                text: textStamp('mitteilungen'),
              }),
        ),
      );
    const chat = await grant('chat_assistent');
    const other = await grant('mitteilungen');
    await act(async () => useAppStore.getState().revokeConsent(other.id));
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBe(third);

    // Widerruf der Einwilligung in den Assistenten
    await act(async () => useAppStore.getState().revokeConsent(chat.id));
    expect(await AsyncStorage.getItem(INSTALLATION_KEY)).toBeNull();
    const fourth = await askAgain();
    expect(fourth).toMatch(INSTALLATION_ID);
    expect(fourth).not.toBe(third);
  });

  test('ohne EXPO_PUBLIC_CHAT_TOKEN kein Token-Header, ohne Speicher keine Installations-ID', async () => {
    forgetInstallationId();
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('kein Speicher'));
    fetchMock.mockReturnValue(reply({ reply: 'Gut.', suggestion: 'keine', guideId: '' }));
    expect(await services.chat.ask(context, messages)).toMatchObject({ ok: true });
    expect(sentHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });

  test.each([
    [401, { error: 'token' }, 'token'],
    [401, null, 'token'],
    [429, { error: 'zu_viele' }, 'zu_viele'],
    [429, { error: 'tagesgrenze' }, 'tagesgrenze'],
    [429, { error: 'ausgelastet' }, 'ausgelastet'],
    [429, null, 'zu_viele'],
    [413, null, 'voll'],
    [400, { error: 'ungueltig' }, 'dienst'],
    [502, null, 'dienst'],
  ])('Status %i mit %j wird zum Fehler %s', async (status, body, error) => {
    fetchMock.mockReturnValueOnce(
      Promise.resolve({
        ok: false,
        status,
        json: () => (body ? Promise.resolve(body) : Promise.reject(new SyntaxError('kein JSON'))),
      }),
    );
    expect(await services.chat.ask(context, messages)).toEqual({ ok: false, error });
  });

  test('401 und Tagesgrenze: ruhig zur Fachkraft, viele Fragen: warten und noch einmal', async () => {
    setup();
    await renderRouter(APP, { initialUrl: '/fall/neu' });
    fetchMock.mockReturnValueOnce(reply({ error: 'token' }, 401));
    await ask('Die Tür geht nicht auf.');
    await tap(t.consentAccept);
    await flush();
    expect(screen.getByText(de.thread.noteFallback)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.retry })).toBeNull();

    fetchMock.mockReturnValueOnce(reply({ error: 'zu_viele' }, 429));
    await ask('Und jetzt?');
    await flush();
    expect(screen.getByText(t.errors.zu_viele)).toBeTruthy();
    fetchMock.mockReturnValueOnce(reply({ error: 'tagesgrenze' }, 429));
    await tap(t.retry);
    await flush();
    expect(screen.getByText(de.thread.noteFallback)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.retry })).toBeNull();
    expect(screen.getByRole('button', { name: t.getHelp })).toBeTruthy();
    for (const text of [t.errors.token, t.errors.zu_viele, t.errors.tagesgrenze]) {
      expect(text).not.toMatch(/!|Fehler|401|429/);
    }
  });
});
