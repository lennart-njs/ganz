// Regressionstests für das Fehlverhalten aus der Code-Review vom 03.11.2026 (ZUKUNFTSPLAN Anhang B).
// Jeder Befund hat eine „Ausgangslage“, die heute grün ist, und einen Test mit dem erwarteten
// Verhalten. Der ist als test.failing markiert, bis der Befund behoben ist. Mit der Behebung wird
// er im selben Commit zu test.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { demoConfig } from '@/config/demo.config';
import { guides } from '@/data/guides';
import { de } from '@/i18n/de';
import { hasChatConsent } from '@/lib/chat/context';
import { chatLimits } from '@/lib/chat/limits';
import { latestGuideRun } from '@/lib/caseView';
import type { Id } from '@/model/types';
import { activeBooking, useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import {
  addWasher,
  backToCostsAfterClaim,
  caseAfterFinding,
  caseInRepair,
  caseOf,
  escapeRegExp,
  flush,
  openCasesOf,
  photoCase,
  runningBookings,
  start,
  tap,
  tapIfOffered,
} from '@/test/regressions';

const openRuns = (caseId: Id) =>
  Object.values(useAppStore.getState().guideRuns).filter((r) => r.caseId === caseId && !r.endedAt);

// ---------- R-04 ----------

/** Startseite → Foto → Ergebnis im Gespräch → „Passt nicht“ */
async function doesNotFit() {
  start();
  const device = addWasher();
  const r = await renderRouter(APP, { initialUrl: '/' });
  await tap(new RegExp(`^${de.home.searchTitle}`));
  await tap(new RegExp(`^${de.problem.photo}`));
  await tap(de.camera.shutter);
  await flush(10);
  expect(r.getPathname()).toBe('/fall/GS-24817');
  await tap(de.result.doesNotFit);
  return { device, r };
}

const otherSymptom = new RegExp(`^${de.problems[2]!.label}`);

describe('R-04 zwei offene Fälle über „Passt nicht“', () => {
  test('R-04 Ausgangslage: Foto mit Ergebnis, „Passt nicht“ führt zu „Problem melden“', async () => {
    const { device, r } = await doesNotFit();
    expect(r.getPathname()).toBe('/fall/neu');
    expect(openCasesOf(device.id)).toHaveLength(1);
    expect(caseOf('GS-24817').photoIds).toHaveLength(1);
    expect(screen.getByRole('button', { name: otherSymptom })).toBeTruthy();
  });

  // app/fall/neu.tsx:84-98: Der Fall mit Foto hat Fortschritt und wird nicht weiterverwendet.
  // caseFor() legt für das andere Symptom einen zweiten offenen Fall an. Verstößt gegen Nr. 13.
  test.failing(
    'R-04 „Passt nicht“ und ein anderes Symptom: höchstens ein offener Fall je Gerät',
    async () => {
      const { device } = await doesNotFit();
      await tap(otherSymptom);
      await flush();
      expect(openCasesOf(device.id)).toHaveLength(1);
    },
  );
});

// ---------- R-05 ----------

/** Ein Fall mit Anleitung und einem erledigten Schritt, dann das Gerätedetail */
async function deviceWithRunningGuide() {
  start();
  const device = addWasher();
  const s = useAppStore.getState();
  const c = s.createCase({
    deviceId: device.id,
    entry: 'symptom',
    problemLabel: guides.tuer.title,
  });
  const run = s.startGuide(c.id, 'tuer');
  s.moveGuideStep(run.id, 'next');
  const r = await renderRouter(APP, { initialUrl: `/geraet/${device.id}` });
  return { device, id: c.id, runId: run.id, r };
}

const maintenanceRow = new RegExp(`^${escapeRegExp(de.maintenance[0]!.title)}`);

describe('R-05 zwei offene Fälle über eine Pflege-Zeile', () => {
  test('R-05 Ausgangslage: ein Fall in der Selbsthilfe, die Pflege-Zeile ist da', async () => {
    const { device, id } = await deviceWithRunningGuide();
    expect(caseOf(id).status).toBe('selbsthilfe');
    expect(openCasesOf(device.id)).toHaveLength(1);
    expect(openRuns(id)[0]?.completedSteps).toEqual([0]);
    expect(screen.getByRole('button', { name: maintenanceRow })).toBeTruthy();
  });

  // app/geraet/[id].tsx:131 ruft createCase und startGuide direkt auf, ohne nach dem laufenden
  // Fall zu fragen. Danach gibt es zwei offene Fälle für ein Gerät. Verstößt gegen Nr. 13.
  test.failing(
    'R-05 Pflege bei laufendem Fall: höchstens ein offener Fall, Frage „Weitermachen“',
    async () => {
      const { device, id, runId } = await deviceWithRunningGuide();
      await tap(maintenanceRow);
      await flush();
      expect(openCasesOf(device.id)).toHaveLength(1);
      expect(useAppStore.getState().guideRuns[runId]?.completedSteps).toEqual([0]);
      expect(caseOf(id).status).toBe('selbsthilfe');
      expect(screen.getByRole('button', { name: de.thread.continueCase })).toBeTruthy();
    },
  );
});

// ---------- R-06 ----------

/**
 * Zwei Waschmaschinen. Fall A: Foto, Ergebnis, Anleitung bis Schritt 5. Fall B: Symptom mit
 * gestarteter Anleitung ohne erledigten Schritt, im Gespräch lässt sich die Antwort noch ändern.
 */
async function twoGuideCases() {
  start();
  const s = useAppStore.getState();
  const a = photoCase(addWasher().id, 'ablauf');
  const runA = s.startGuide(a, 'ablauf');
  for (let i = 0; i < 4; i++) s.moveGuideStep(runA.id, 'next');
  const b = s.createCase({
    deviceId: addWasher().id,
    entry: 'symptom',
    problemLabel: guides.nass.title,
  }).id;
  s.startGuide(b, 'nass');
  const r = await renderRouter(APP, { initialUrl: `/fall/${b}` });
  return { a, b, runA: runA.id, r };
}

describe('R-06 Fortschritt der Anleitung geht verloren', () => {
  test('R-06 Ausgangslage: Stift im Gespräch von B, Anleitung von A in Schritt 5', async () => {
    const { a, b, runA, r } = await twoGuideCases();
    expect(screen.getByRole('button', { name: de.talk.edit(guides.nass.title) })).toBeTruthy();
    expect(openRuns(b)).toHaveLength(1);
    expect(useAppStore.getState().guideRuns[runA]?.currentStep).toBe(4);
    await act(async () => router.replace(`/fall/${a}/ergebnis`));
    expect(r.getPathname()).toBe(`/fall/${a}/ergebnis`);
    expect(screen.getByRole('button', { name: de.result.startGuide })).toBeTruthy();
  });

  // app/fall/[id]/ergebnis.tsx:140: „Anleitung starten“ legt einen neuen GuideRun ab Schritt 1 an,
  // obwohl einer in Schritt 5 läuft. Der alte endet nie. Dazu: Stift im Gespräch und ein anderes
  // Symptom lassen die erste Anleitung offen, das Gespräch zeigt beide Angebote. B-05 wieder offen.
  test.failing(
    'R-06 eine laufende Anleitung geht weiter, nie zwei offene Anleitungen',
    async () => {
      const { a, b } = await twoGuideCases();
      // Stift: die Antwort ändern und ein anderes Symptom wählen
      await tap(de.talk.edit(guides.nass.title));
      await tap(new RegExp(`^${de.problems[2]!.label}`));
      await flush();
      expect(openRuns(b).length).toBeLessThanOrEqual(1);

      // Details → „Anleitung starten“ im Fall mit laufender Anleitung
      await act(async () => router.replace(`/fall/${a}/ergebnis`));
      await tap(de.result.startGuide);
      expect(openRuns(a)).toHaveLength(1);
      expect(latestGuideRun(useAppStore.getState(), caseOf(a))?.currentStep).toBe(4);
    },
  );
});

// ---------- R-07 ----------

describe('R-07 „Du zahlst 189 €“ während der Prüfung', () => {
  const selfPayUrl = (id: Id) => `/fall/${id}/termin?art=reparatur&zahlung=selbst`;

  test('R-07 Ausgangslage: gemeldet, Kranich prüft, zurück auf den Kosten', async () => {
    const { id, r } = await backToCostsAfterClaim();
    expect(r.getPathname()).toBe(`/fall/${id}/kosten`);
    expect(caseOf(id).status).toBe('freigabe_noetig');
    await act(async () => router.push(selfPayUrl(id)));
    expect(r.getPathname()).toBe(`/fall/${id}/termin`);
  });

  // app/fall/[id]/kosten.tsx:141 bietet „Ohne Versicherung selbst zahlen“ auch in freigabe_noetig.
  // Der Termin zeigt dann „Du zahlst 189 €“ und „Zahlungspflichtig buchen“, und requestBooking
  // überspringt selbst_zahlen. B-18 wieder offen, Regel „keine Kostenzusage vor der Freigabe“.
  // Behoben: Kosten bieten Selbstzahlen nur bei canTransition(status, 'selbst_zahlen'), Termin
  // nimmt zahlung=selbst nur bei canPaySelf (lib/booking.ts).
  test('R-07 während der Prüfung kein Selbstzahlen und kein „Du zahlst“', async () => {
    const { id } = await backToCostsAfterClaim();
    expect(screen.queryByRole('button', { name: de.costs.selfPay })).toBeNull();
    await act(async () => router.push(selfPayUrl(id)));
    expect(screen.queryByText(de.appointment.costsSelf('189 €'))).toBeNull();
    expect(screen.queryByRole('button', { name: de.appointment.requestPaid })).toBeNull();
  });
});

// ---------- R-08 ----------

/** Ohne Schutz, selbst bezahlt, der Betrieb hat den Termin bestätigt. Dann die Kosten. */
async function confirmedSelfPayRepair() {
  start({ contract: false });
  const id = caseInRepair(addWasher().id);
  useAppStore.getState().simulateNext(id);
  const r = await renderRouter(APP, { initialUrl: `/fall/${id}/kosten` });
  return { id, r };
}

describe('R-08 zweite Buchung', () => {
  test('R-08 Ausgangslage: in der Reparatur, ein bestätigter Termin, Kosten offen', async () => {
    const { id } = await confirmedSelfPayRepair();
    expect(caseOf(id).status).toBe('in_reparatur');
    expect(runningBookings(id, 'reparatur').map((b) => b.status)).toEqual(['bestaetigt']);
    expect(screen.getByRole('header', { name: de.costs.title })).toBeTruthy();
  });

  // app/fall/[id]/kosten.tsx:112 bietet „Weiter zum Termin“ auch mit bestätigtem Termin an.
  // store/appStore.ts:792 (heute Zeile 802) storniert nur angefragte Termine. Der zweite Termin
  // läuft neben dem ersten, und „Läuft wieder“ kommt nie, weil der neueste Termin nie fertig wird.
  test.failing('R-08 höchstens ein laufender Termin je Art', async () => {
    const { id } = await confirmedSelfPayRepair();
    if (await tapIfOffered(de.costs.toAppointment)) {
      await tapIfOffered(demoConfig.slots[1], 'radio');
      await tapIfOffered(de.appointment.requestPaid);
    }
    expect(runningBookings(id, 'reparatur')).toHaveLength(1);
    expect(activeBooking(useAppStore.getState(), id)?.status).toBe('bestaetigt');
  });
});

// ---------- R-09 ----------

/** Schadenfall gemeldet, im Termin kommt die Ablehnung von Kranich */
async function rejectedWhileBooking() {
  start();
  useAppStore.getState().setDemo({ claimScenario: 'ablehnen' });
  const id = caseAfterFinding(addWasher().id);
  const r = await renderRouter(APP, { initialUrl: `/fall/${id}/kosten` });
  await tap(de.costs.report);
  await act(async () => {
    useAppStore.getState().simulateNext(id);
  });
  return { id, r };
}

describe('R-09 Termin nach der Ablehnung', () => {
  test('R-09 Ausgangslage: abgelehnt, der Termin ist offen', async () => {
    const { id, r } = await rejectedWhileBooking();
    expect(r.getPathname()).toBe(`/fall/${id}/termin`);
    expect(caseOf(id).status).toBe('abgelehnt');
    expect(caseOf(id).claim?.decision?.result).toBe('abgelehnt');
    expect(runningBookings(id)).toHaveLength(0);
  });

  // app/fall/[id]/termin.tsx:67 und lib/booking.ts:15-23 fragen nicht nach der Ablehnung. Die
  // Kostenzeile sagt weiter „vorbehaltlich Freigabe“, und „Termin anfragen“ legt einen Termin auf
  // den abgelehnten Fall, der nie weiterläuft.
  test.failing('R-09 nach der Ablehnung kein Termin auf Kosten des Versicherers', async () => {
    const { id } = await rejectedWhileBooking();
    expect(
      screen.queryByText(de.appointment.costsClaim(demoConfig.insurer.shortName, '0 €')),
    ).toBeNull();
    await tapIfOffered(demoConfig.slots[0], 'radio');
    await tapIfOffered(de.appointment.request);
    expect(runningBookings(id)).toHaveLength(0);
  });
});

// ---------- R-10 ----------

/** Vor-Ort-Diagnose beim zweiten Betrieb, die Simulation läuft bis zum Befund */
function onSiteDiagnosisWithSecondPartner() {
  start({ contract: false });
  const s = useAppStore.getState();
  const c = s.createCase({
    deviceId: addWasher().id,
    entry: 'symptom',
    problemLabel: guides.tuer.title,
  });
  s.escalate(c.id);
  const partner = demoConfig.partners[1]!;
  s.requestBooking({
    caseId: c.id,
    kind: 'vor_ort_diagnose',
    partnerId: partner.id,
    slotLabel: demoConfig.slots[2],
    selfPay: false,
  });
  for (let i = 0; i < 3; i++) s.simulateNext(c.id);
  return { id: c.id, partner: partner.name };
}

const eventOf = (id: Id, type: 'befund_erstellt' | 'angebot_erstellt') =>
  useAppStore.getState().events.find((e) => e.caseId === id && e.type === type);

describe('R-10 Befund dem falschen Betrieb zugeschrieben', () => {
  test('R-10 Ausgangslage: Diagnose beim zweiten Betrieb erledigt, Befund und Angebot da', () => {
    const { id, partner } = onSiteDiagnosisWithSecondPartner();
    const booking = useAppStore.getState().bookings.find((b) => b.caseId === id)!;
    expect(booking).toMatchObject({ kind: 'vor_ort_diagnose', status: 'erledigt' });
    expect(booking.provider.name).toBe(partner);
    expect(partner).not.toBe(demoConfig.partners[0]!.name);
    expect(eventOf(id, 'befund_erstellt')?.actor.kind).toBe('betrieb');
    expect(caseOf(id).quoteId).toBeDefined();
  });

  // store/appStore.ts:675 (heute Zeile 684): setFinding nimmt für by='betrieb' immer
  // demoConfig.partners[0], nicht den gebuchten Betrieb.
  test.failing('R-10 Befund und Kostenvoranschlag kommen vom gebuchten Betrieb', () => {
    const { id, partner } = onSiteDiagnosisWithSecondPartner();
    const quote = useAppStore.getState().quotes.find((q) => q.id === caseOf(id).quoteId);
    expect(eventOf(id, 'befund_erstellt')?.actor.name).toBe(partner);
    expect(eventOf(id, 'angebot_erstellt')?.actor.name).toBe(partner);
    expect(quote?.createdBy.name).toBe(partner);
  });
});

// ---------- R-11 ----------

describe('R-11 Grenze von 40 Nachrichten im Chat', () => {
  const fetchMock = jest.fn();
  const realFetch = global.fetch;
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
  });

  /** Ein Gespräch mit dem Assistenten, das die Grenze erreicht hat */
  async function fullChat() {
    start();
    const s = useAppStore.getState();
    const c = s.createCase({
      deviceId: addWasher().id,
      entry: 'freitext',
      problemLabel: 'Es pumpt nicht ab.',
    });
    s.grantConsent({
      caseId: c.id,
      purpose: 'chat_assistent',
      legalBasis: 'einwilligung',
      recipient: {
        id: demoConfig.assistant.id,
        kind: 'dienstleister',
        name: demoConfig.assistant.name,
      },
      dataCategories: [...de.consentData.assistent],
      textVersion: '2026-10-1',
    });
    for (let i = 0; i < chatLimits.messages; i++) {
      s.addChatMessage({
        caseId: c.id,
        role: i % 2 === 0 ? 'haushalt' : 'assistent',
        text: `Nachricht ${i + 1}`,
      });
    }
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    return c.id;
  }

  const messagesOf = (id: Id) => useAppStore.getState().chatMessages.filter((m) => m.caseId === id);

  test('R-11 Ausgangslage: 40 Nachrichten mit Einwilligung, das Gespräch zeigt sie', async () => {
    const id = await fullChat();
    expect(messagesOf(id)).toHaveLength(chatLimits.messages);
    expect(hasChatConsent(useAppStore.getState())).toBe(true);
    expect(screen.getByText(`Nachricht ${chatLimits.messages}`)).toBeTruthy();
  });

  // lib/chat/useAssistant.ts:49 schiebt ein Fenster über den Verlauf, statt nach 40 Nachrichten
  // aufzuhören. lib/chat/limits.ts nennt die Grenze, aber niemand setzt sie durch.
  test.failing(
    'R-11 nach 40 Nachrichten verweist das Gespräch auf die Fachkraft, Senden ist aus',
    async () => {
      const id = await fullChat();
      expect(screen.getByText(de.chat.full)).toBeTruthy();
      const field = screen.queryByLabelText(de.thread.inputLabel);
      if (field) {
        await fireEvent.changeText(field, 'Noch eine Frage');
        await tapIfOffered(de.chat.send);
        await flush();
      }
      expect(fetchMock).not.toHaveBeenCalled();
      expect(messagesOf(id)).toHaveLength(chatLimits.messages);
    },
  );
});
