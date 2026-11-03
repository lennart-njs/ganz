// Regressionstests für den Datenschutz aus der Code-Review vom 03.11.2026 (ZUKUNFTSPLAN Anhang B).
// Jeder Befund hat eine „Ausgangslage“, die heute grün ist, und einen Test mit dem erwarteten
// Verhalten. Der ist als test.failing markiert, bis der Befund behoben ist. Mit der Behebung wird
// er im selben Commit zu test.
import * as Notifications from 'expo-notifications';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { requestAppointment } from '@/lib/booking';
import type { Id } from '@/model/types';
import { useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import {
  addWasher,
  caseAfterFinding,
  caseOf,
  consentsFor,
  escapeRegExp,
  flush,
  start,
  tap,
  tapIfOffered,
} from '@/test/regressions';

const insurer = demoConfig.insurer.shortName;

// ---------- R-12 ----------

/** Schadenfall gemeldet, dann die Weitergabe an den Versicherer widerrufen */
function claimWithRevokedTransfer() {
  start();
  const id = caseAfterFinding(addWasher().id);
  const s = useAppStore.getState();
  s.reportClaim(id, '2026-10-1');
  s.revokeConsent(consentsFor('weitergabe_versicherer', id)[0]!.id);
  return id;
}

describe('R-12 Widerruf nach lit. b ohne Wirkung', () => {
  test('R-12 Ausgangslage: gemeldet, Kranich prüft, die Weitergabe ist widerrufen', () => {
    const id = claimWithRevokedTransfer();
    expect(caseOf(id).status).toBe('freigabe_noetig');
    expect(consentsFor('weitergabe_versicherer', id)[0]?.revokedAt).toBeDefined();
  });

  // store/appStore.ts:835: simulateNext entscheidet den Schadenfall, ohne nach der Weitergabe zu
  // fragen. B-40 wieder offen, Regel „keine Weitergabe ohne Bestätigung“. Übergangsregel bis zur
  // Antwort des Anwalts: Solange die passende Weitergabe widerrufen ist, hält die Simulation an.
  test.failing('R-12 nach dem Widerruf entscheidet der Versicherer nicht weiter', () => {
    const id = claimWithRevokedTransfer();
    useAppStore.getState().simulateNext(id);
    expect(caseOf(id).status).toBe('freigabe_noetig');
    expect(caseOf(id).claim?.decision).toBeUndefined();
  });
});

// ---------- R-13 ----------

/** Termin anfragen mit dem Systemdialog für Mitteilungen, dann das Profil */
async function notificationsAllowedOnBooking() {
  start();
  const id = caseAfterFinding(addWasher().id);
  useAppStore.getState().reportClaim(id, '2026-10-1');
  requestAppointment({
    caseId: id,
    partnerId: demoConfig.partners[0]!.id,
    slot: demoConfig.slots[0],
    selfPay: false,
  });
  await flush();
  await renderRouter(APP, { initialUrl: '/profil' });
  return id;
}

const notificationsBox = () => screen.getByRole('checkbox', { name: de.profile.notifications });

describe('R-13 Mitteilungen ohne gespeicherte Einwilligung', () => {
  beforeEach(() => {
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: true,
      canAskAgain: true,
    } as Awaited<ReturnType<typeof Notifications.requestPermissionsAsync>>);
  });

  test('R-13 Ausgangslage: Mitteilungen erlaubt, im Profil aus- und wieder einschaltbar', async () => {
    await notificationsAllowedOnBooking();
    expect(useAppStore.getState().notifications).toBe('erlaubt');
    expect(notificationsBox()).toBeChecked();
    await fireEvent.press(notificationsBox());
    expect(useAppStore.getState().notifications).toBe('abgelehnt');
    await fireEvent.press(notificationsBox());
    await flush();
    expect(useAppStore.getState().notifications).toBe('erlaubt');
  });

  // lib/booking.ts:45 und app/(tabs)/profil.tsx:84 setzen nur notifications. Eine Einwilligung
  // mit Zweck 'mitteilungen' (lit. a) entsteht nie, ein Ausschalten widerruft nichts.
  test.failing('R-13 Erlauben speichert eine Einwilligung, Ausschalten widerruft sie', async () => {
    await notificationsAllowedOnBooking();
    const active = () => consentsFor('mitteilungen').filter((c) => !c.revokedAt);
    expect(active()).toHaveLength(1);
    expect(active()[0]?.legalBasis).toBe('einwilligung');

    await fireEvent.press(notificationsBox());
    expect(active()).toHaveLength(0);
    expect(consentsFor('mitteilungen')[0]?.revokedAt).toBeDefined();

    await fireEvent.press(notificationsBox());
    await flush();
    expect(active()).toHaveLength(1);
  });
});

// ---------- R-14 ----------

/** Fall mit Foto, Anleitung bis „Geht nicht“ mit Notiz, Chat und Befund. Dann die Kosten. */
async function costsWithFullCaseFile() {
  start();
  const device = addWasher();
  const s = useAppStore.getState();
  const c = s.createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'Pumpt nicht ab' });
  s.addPhoto({
    caseId: c.id,
    deviceId: device.id,
    purpose: 'display',
    source: 'in_app_camera',
    uri: '',
  });
  s.addChatMessage({ caseId: c.id, role: 'haushalt', text: 'Es steht Wasser in der Trommel.' });
  const run = s.startGuide(c.id, 'ablauf');
  for (let i = 0; i < 4; i++) s.moveGuideStep(run.id, 'next');
  s.finishGuide(run.id, 'geht_nicht', 'Pumpenflügel klemmt');
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  await renderRouter(APP, { initialUrl: `/fall/${c.id}/kosten` });
  return c.id;
}

/** Was die Vorschau zeigen kann: die Bezeichnung und woran man sie auf dem Screen erkennt */
const previewCategories: [category: string, text: string | RegExp][] = [
  [de.help.facts.device, de.help.facts.device],
  [de.help.facts.problem, de.help.facts.problem],
  [de.help.facts.result, de.help.facts.result],
  [de.chat.fileTitle, de.chat.fileTitle],
  [de.help.facts.steps, de.help.facts.steps],
  [de.caseFile.photos, de.caseFile.photos],
  [de.caseFile.finding, de.caseFile.finding],
  [de.caseFile.costs, de.caseFile.costs],
  [de.help.facts.note, new RegExp(escapeRegExp(de.a11y.fact(de.help.facts.note, '')))],
];

const counts = () => previewCategories.map(([, text]) => screen.queryAllByText(text).length);

/** Öffnet „Das geht an …“ und gibt zurück, welche Kategorien dabei dazukommen */
async function openPreview(): Promise<string[]> {
  const before = counts();
  await tap(de.costs.preview(insurer));
  const after = counts();
  return previewCategories.filter((_, i) => after[i]! > before[i]!).map(([category]) => category);
}

describe('R-14 Vorschau zeigt mehr als die bestätigten Kategorien', () => {
  test('R-14 Ausgangslage: die Vorschau zeigt die Fallakte, die Meldung speichert Kategorien', async () => {
    const id = await costsWithFullCaseFile();
    const shown = await openPreview();
    expect(shown).toEqual(expect.arrayContaining([de.help.facts.device, de.caseFile.costs]));
    const c = caseOf(id);
    expect(useAppStore.getState().guideRuns[c.guideRunIds[0]!]?.abortNote).toBe(
      'Pumpenflügel klemmt',
    );
    expect(useAppStore.getState().chatMessages.some((m) => m.caseId === id)).toBe(true);
    await tap(de.costs.report);
    expect(consentsFor('weitergabe_versicherer', id)[0]?.dataCategories.length).toBeGreaterThan(0);
  });

  // components/app/CaseFileCard.tsx:108 (detail 'voll') zeigt in „Das geht an …“ die Notiz zum
  // Abbruch, das Problem und die Zahl der Chat-Nachrichten. Gespeichert wird mit der Bestätigung
  // nur de.consentData.versicherer. B-53 wieder offen.
  test.failing(
    'R-14 die Vorschau zeigt nur Kategorien, die die Bestätigung speichert',
    async () => {
      const id = await costsWithFullCaseFile();
      const shown = await openPreview();
      await tap(de.costs.report);
      const stored = consentsFor('weitergabe_versicherer', id)[0]!.dataCategories;
      expect(shown.filter((category) => !stored.includes(category))).toEqual([]);
    },
  );
});

// ---------- R-15 ----------

describe('R-15 Chat-Einwilligung mit caseId', () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ reply: 'Steht Wasser drin?', suggestion: 'keine', guideId: '' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  /** Einwilligung im Gespräch von Fall A, dann Nachrichten in Fall B und dessen Fallakte */
  async function chatInTwoCases() {
    start();
    const s = useAppStore.getState();
    const a = s.createCase({ deviceId: addWasher().id, entry: 'freitext', problemLabel: 'Pumpe' });
    const r = await renderRouter(APP, { initialUrl: `/fall/${a.id}` });
    await fireEvent.changeText(screen.getByLabelText(de.thread.inputLabel), 'Es pumpt nicht ab.');
    await tap(de.chat.send);
    await tap(de.chat.consentAccept);
    await flush();
    let b = '';
    await act(async () => {
      b = s.createCase({
        deviceId: addWasher('geschirrspueler').id,
        entry: 'freitext',
        problemLabel: 'Bleibt nass',
      }).id;
      s.addChatMessage({ caseId: b, role: 'haushalt', text: 'Das Geschirr bleibt nass.' });
      s.addChatMessage({ caseId: b, role: 'assistent', text: 'Ist der Klarspüler leer?' });
    });
    await act(async () => router.push(`/fall/${b}/fallakte`));
    return { a: a.id, b, r };
  }

  test('R-15 Ausgangslage: Einwilligung erteilt, Fall B hat Nachrichten, seine Fallakte ist offen', async () => {
    const { a, b, r } = await chatInTwoCases();
    expect(consentsFor('chat_assistent')).toHaveLength(1);
    expect(useAppStore.getState().chatMessages.filter((m) => m.caseId === a)).toHaveLength(2);
    expect(useAppStore.getState().chatMessages.filter((m) => m.caseId === b)).toHaveLength(2);
    expect(r.getPathname()).toBe(`/fall/${b}/fallakte`);
    expect(screen.getByRole('header', { name: 'Bleibt nass' })).toBeTruthy();
  });

  // lib/chat/context.ts (hasChatConsent) wertet die Einwilligung global, lib/chat/useAssistant.ts
  // (accept) speichert sie mit der caseId von Fall A. app/fall/[id]/fallakte.tsx:29 zeigt in Fall B
  // dann „Noch nichts weitergegeben“, obwohl seine Nachrichten an den Assistenten gingen.
  test.failing('R-15 Einwilligung ohne Fall, jede Fallakte mit Nachrichten zeigt sie', async () => {
    await chatInTwoCases();
    expect(consentsFor('chat_assistent')[0]?.caseId).toBeUndefined();
    expect(screen.queryByText(de.file.none)).toBeNull();
    const assistant = new RegExp(escapeRegExp(demoConfig.assistant.name));
    expect(screen.queryAllByText(assistant).length).toBeGreaterThan(0);
  });
});

// ---------- R-16 ----------

/** Anleitung bis „Geht nicht“, Videocall ohne freie Fachkraft, zurück im Gespräch mit Rückruf */
async function noExpertAfterCall() {
  start();
  const s = useAppStore.getState();
  s.setDemo({ videoScenario: 'keine_fachkraft' });
  const c = s.createCase({
    deviceId: addWasher().id,
    entry: 'meldung',
    problemLabel: 'Wasserablauf gestört',
  });
  const run = s.startGuide(c.id, 'ablauf');
  for (let i = 0; i < 4; i++) s.moveGuideStep(run.id, 'next');
  s.finishGuide(run.id, 'geht_nicht');
  const r = await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
  await tap(new RegExp(`^${de.thread.callStart}`));
  await flush();
  return { id: c.id, r };
}

const callbacks = (id: Id) =>
  useAppStore
    .getState()
    .events.filter(
      (e) => e.caseId === id && e.type === 'videocall_angefragt' && e.payload.art === 'rueckruf',
    );

const slot = de.waiting.callbackSlots[1]!;

describe('R-16 Rückruf ohne Bestätigung', () => {
  test('R-16 Ausgangslage: keine Fachkraft frei, Rückruf wird angeboten, Weitergabe bestätigt', async () => {
    const { id, r } = await noExpertAfterCall();
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(screen.getByText(de.waiting.noExpertTitle)).toBeTruthy();
    expect(screen.getByRole('button', { name: slot })).toBeTruthy();
    expect(consentsFor('weitergabe_fachkraft', id).filter((c) => !c.revokedAt)).toHaveLength(1);
    expect(callbacks(id)).toHaveLength(0);
  });

  // store/appStore.ts:664 (heute Zeile 673): requestCallback prüft keine Bestätigung. Nach dem
  // Widerruf der Weitergabe an die Fachkraft geht der Rückruf trotzdem raus, ohne Hinweis, wer
  // welche Daten bekommt. B-19 und B-23 wieder offen.
  test.failing('R-16 ohne gültige Bestätigung kein Rückruf, auch nicht im Store', async () => {
    const { id } = await noExpertAfterCall();
    await act(async () => {
      useAppStore.getState().revokeConsent(consentsFor('weitergabe_fachkraft', id)[0]!.id);
    });
    // Die App fragt erst nach der Bestätigung, ein Tap auf die Zeit allein reicht nicht
    await tapIfOffered(slot);
    expect(callbacks(id)).toHaveLength(0);
    await act(async () => {
      try {
        useAppStore.getState().requestCallback(id, slot);
      } catch {
        // Ablehnen ist erlaubt
      }
    });
    expect(callbacks(id)).toHaveLength(0);
  });
});

// ---------- R-17 ----------

/**
 * Mitteilungen erlaubt. Drei Fälle laufen durch die Simulation: Freigabe bis zur Reparatur,
 * Ablehnung, Vor-Ort-Diagnose bis zum Kostenvoranschlag. Gibt alle Mitteilungen zurück.
 */
function notificationsOfAllSteps() {
  jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
  start();
  const s = useAppStore.getState();
  s.setNotifications('erlaubt');
  const approved = caseAfterFinding(addWasher().id);
  s.reportClaim(approved, '2026-10-1');
  s.requestBooking({
    caseId: approved,
    kind: 'reparatur',
    partnerId: demoConfig.partners[0]!.id,
    slotLabel: demoConfig.slots[0],
    selfPay: false,
  });
  for (let i = 0; i < 4; i++) s.simulateNext(approved);

  s.setDemo({ claimScenario: 'ablehnen' });
  const rejected = caseAfterFinding(addWasher().id);
  s.reportClaim(rejected, '2026-10-1');
  s.simulateNext(rejected);

  const onSite = s.createCase({
    deviceId: addWasher().id,
    entry: 'symptom',
    problemLabel: 'Tür geht nicht auf',
  }).id;
  s.escalate(onSite);
  s.requestBooking({
    caseId: onSite,
    kind: 'vor_ort_diagnose',
    partnerId: demoConfig.partners[1]!.id,
    slotLabel: demoConfig.slots[2],
    selfPay: false,
  });
  for (let i = 0; i < 3; i++) s.simulateNext(onSite);

  const sent = jest
    .mocked(Notifications.scheduleNotificationAsync)
    .mock.calls.map(([request]) => request.content as { title: string; body: string });
  return { approved, rejected, onSite, sent };
}

describe('R-17 Mitteilungstexte mit Falldetails', () => {
  test('R-17 Ausgangslage: jeder Schritt der Simulation schickt eine Mitteilung', () => {
    const { approved, rejected, onSite, sent } = notificationsOfAllSteps();
    expect(useAppStore.getState().bookings.find((b) => b.caseId === approved)?.status).toBe(
      'erledigt',
    );
    expect(caseOf(rejected).status).toBe('abgelehnt');
    expect(caseOf(onSite).quoteId).toBeDefined();
    expect(sent.length).toBeGreaterThanOrEqual(8);
  });

  // i18n/de.ts, de.notify: Die Texte nennen Versicherer, Entscheidung, Betrieb, Zeitfenster und
  // das Gerät. Mitteilungen stehen auf dem Sperrbildschirm, für alle sichtbar.
  test.failing(
    'R-17 Mitteilungen sind neutral: kein Gerät, Betrag, Betrieb, Entscheidung, Fall',
    () => {
      const { approved, sent } = notificationsOfAllSteps();
      const details = [
        demoConfig.insurer.name,
        insurer,
        demoConfig.manufacturer.name,
        demoConfig.device.model,
        approved,
        ...demoConfig.partners.map((p) => p.name),
        ...demoConfig.slots,
        ...Object.values(de.deviceCategory),
      ];
      const pattern = /€|GS-\d|Maschine|freigegeben|Freigabe|abgelehnt|übernimmt/i;
      const leaks = sent.flatMap(({ title, body }) => {
        const text = `${title} ${body}`;
        return [
          ...details.filter((d) => text.includes(d)),
          ...(pattern.test(text) ? [text.match(pattern)![0]] : []),
        ].map((d) => `${title}: ${d}`);
      });
      expect(leaks).toEqual([]);
    },
  );
});
