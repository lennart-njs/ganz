import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { formatDateTime } from '@/i18n/format';
import { chatLimits } from '@/lib/chat/limits';
import { CONSENT_SCOPES } from '@/model/policies/consentScopes';
import type { DeviceCategory } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { escapeRegExp } from '@/test/regressions';

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
