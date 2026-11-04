// Regressionstests für die Abstürze aus der Code-Review vom 03.11.2026 (ZUKUNFTSPLAN Anhang B).
// Jeder Befund hat eine „Ausgangslage“, die heute grün ist, und einen Test mit dem erwarteten
// Verhalten. Der ist als test.failing markiert, bis der Befund behoben ist. Mit der Behebung wird
// er im selben Commit zu test.
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { router } from 'expo-router';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { nextSimulationDue, useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import {
  addWasher,
  backToCostsAfterClaim,
  caseInRepair,
  caseOf,
  consentsFor,
  runningBookings,
  start,
  tap,
  tapIfOffered,
} from '@/test/regressions';

// ---------- R-01 ----------

/** Drei Geräte: ein erledigter Fall (selbst gelöst), ein Fall in der Reparatur, ein abgebrochener */
function closedAndRepairCases() {
  start({ contract: false });
  const s = useAppStore.getState();
  const done = s.createCase({
    deviceId: addWasher().id,
    entry: 'symptom',
    problemLabel: 'Tür geht nicht auf',
  });
  s.runCommand(done.id, 'anleitung_starten');
  s.runCommand(done.id, 'selbst_geloest');
  const repair = caseInRepair(addWasher('trockner').id);
  const cancelled = s.createCase({
    deviceId: addWasher('geschirrspueler').id,
    entry: 'symptom',
    problemLabel: 'Bleibt nass',
  });
  s.runCommand(cancelled.id, 'abbrechen', { cancelReason: de.closeCase.reasons[0] });
  return { done: done.id, repair, cancelled: cancelled.id };
}

/** Fälle → erledigter Fall → Fallakte → X */
async function openSheetInCaseFile(done: string) {
  const r = await renderRouter(APP, { initialUrl: '/faelle' });
  await tap(/^Tür geht nicht auf/);
  expect(r.getPathname()).toBe(`/fall/${done}/fallakte`);
  await tap(de.a11y.close);
  return r;
}

describe('R-01 „Fall abbrechen“ in jedem Status', () => {
  test('R-01 Ausgangslage: erledigt, in der Reparatur, abgebrochen, das Sheet geht jeweils auf', async () => {
    const { done, repair, cancelled } = closedAndRepairCases();
    expect(caseOf(done).status).toBe('erledigt');
    expect(caseOf(repair).status).toBe('in_reparatur');
    expect(caseOf(cancelled).status).toBe('abgebrochen');
    await openSheetInCaseFile(done);
    expect(screen.getByRole('header', { name: de.closeCase.title })).toBeTruthy();
    for (const url of [`/fall/${repair}`, `/fall/${cancelled}/fallakte`]) {
      await act(async () => router.replace(url));
      await tap(de.a11y.close);
      expect(screen.getByRole('header', { name: de.closeCase.title })).toBeTruthy();
    }
  });

  // components/nav/CloseCaseSheet.tsx:37 bietet „Fall abbrechen“ in jedem Status an. In
  // erledigt, in_reparatur und abgebrochen wirft der Tap auf „Fall abbrechen“ einen TransitionError.
  // Behoben: Das Sheet fragt can(facts, 'abbrechen') und can(facts, 'pausieren') (Schritt 22).
  // Seit Schritt 24 lehnt der Store ab, statt zu werfen. Darum prüft der Test für jeden Status die
  // Buttons, und nicht nur, dass der Status gleich bleibt (Schritt 28).
  // Seit Entscheidung Nr. 34 geht Abbrechen auch in der Reparatur. Dort prüft der Test die neue
  // Regel: „Fall abbrechen“ steht da, vorher die Absage an den Betrieb und kein Versprechen, dass
  // es nichts kostet. Der Tap wirft nicht, der Termin ist storniert, die Simulation steht. In
  // erledigt und abgebrochen gibt es weiter weder Abbrechen noch Pausieren.
  test('R-01 „Fall abbrechen“ steht nur da, wo der Fall abbrechbar ist, und wirft nie', async () => {
    const { done, repair, cancelled } = closedAndRepairCases();
    const button = (name: string) => screen.queryByRole('button', { name });
    const closedSheet = async (url: string) => {
      await act(async () => router.replace(url));
      await tap(de.a11y.close);
      expect(screen.getByRole('header', { name: de.closeCase.title })).toBeTruthy();
      expect(button(de.closeCase.cancel)).toBeNull();
      expect(button(de.closeCase.later)).toBeNull();
      expect(button(de.closeCase.leave)).toBeTruthy();
    };
    await openSheetInCaseFile(done);
    expect(button(de.closeCase.cancel)).toBeNull();
    expect(button(de.closeCase.later)).toBeNull();
    expect(button(de.closeCase.leave)).toBeTruthy();

    // In der Reparatur: Später weitermachen und Abbrechen. Vor dem Abbrechen steht die Absage.
    const partner = useAppStore.getState().bookings.find((b) => b.caseId === repair)!.provider.name;
    expect(runningBookings(repair)).toHaveLength(1);
    await act(async () => router.replace(`/fall/${repair}`));
    await tap(de.a11y.close);
    expect(screen.getByRole('header', { name: de.closeCase.title })).toBeTruthy();
    expect(button(de.closeCase.later)).toBeTruthy();
    await tap(de.closeCase.cancel);
    expect(screen.getByRole('header', { name: de.closeCase.reasonTitle })).toBeTruthy();
    expect(screen.getByText(de.closeCase.partnerNotice(partner))).toBeTruthy();
    expect(screen.getByText(de.closeCase.costsOpen(partner))).toBeTruthy();
    const sheet = screen.container.queryAll((x) => x.props.accessibilityViewIsModal === true)[0]!;
    for (const n of sheet.queryAll((x) => x.type === 'Text')) {
      expect(String(n.props.children)).not.toMatch(/kostenlos|kostenfrei|keine Kosten|nichts/i);
    }
    await fireEvent.press(screen.getByRole('radio', { name: de.closeCase.reasons[1] }));
    await tap(de.closeCase.confirmCancel);
    expect(caseOf(repair)).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.closeCase.reasons[1],
    });
    // Kein Termin läuft mehr, die Absage steht in der Fallakte, und es kommt kein Schritt mehr
    expect(runningBookings(repair)).toEqual([]);
    const s = useAppStore.getState();
    expect(s.bookings.filter((b) => b.caseId === repair).map((b) => b.status)).toEqual([
      'storniert',
    ]);
    expect(
      s.events.filter((e) => e.caseId === repair && e.type === 'termin_abgesagt'),
    ).toMatchObject([{ payload: { partner, ordered: true } }]);
    expect(nextSimulationDue(s, repair)).toBeUndefined();
    let stepped = true;
    await act(async () => {
      stepped = useAppStore.getState().simulateNext(repair);
    });
    expect(stepped).toBe(false);
    expect(useAppStore.getState().bookings.find((b) => b.caseId === repair)?.status).toBe(
      'storniert',
    );

    // Danach ist der Fall abgeschlossen: nur noch zur Übersicht, wie jeder abgebrochene
    await closedSheet(`/fall/${repair}/fallakte`);
    await closedSheet(`/fall/${cancelled}/fallakte`);

    expect(caseOf(done).status).toBe('erledigt');
    expect(caseOf(cancelled)).toMatchObject({
      status: 'abgebrochen',
      cancelReason: de.closeCase.reasons[0],
    });
  });
});

// ---------- R-02 ----------

describe('R-02 „Schadenfall melden“ nach der Meldung', () => {
  test('R-02 Ausgangslage: gemeldet, eine Bestätigung, wieder auf den Kosten', async () => {
    const { id, r } = await backToCostsAfterClaim();
    expect(r.getPathname()).toBe(`/fall/${id}/kosten`);
    expect(caseOf(id).status).toBe('freigabe_noetig');
    expect(consentsFor('weitergabe_versicherer', id)).toHaveLength(1);
  });

  // app/fall/[id]/kosten.tsx:84 bietet „Schadenfall melden“ auch nach der Meldung an. Der zweite
  // Tap wirft einen TransitionError, und store/appStore.ts:740 (heute Zeile 754) hat vorher schon
  // eine zweite Bestätigung an den Versicherer gespeichert.
  // Behoben: Kosten fragen can(facts, 'schaden_melden'), reportClaim prüft die Regel vor der
  // Bestätigung (Schritt 22).
  test('R-02 nach der Meldung kein zweites Melden und keine zweite Bestätigung', async () => {
    const { id } = await backToCostsAfterClaim();
    expect(screen.queryByRole('button', { name: de.costs.report })).toBeNull();
    // Auch der Store legt keine verwaiste Bestätigung an, egal ob er wirft oder ablehnt
    await act(async () => {
      try {
        useAppStore.getState().reportClaim(id);
      } catch {
        // Ablehnen ist erlaubt, eine zweite Bestätigung nicht
      }
    });
    expect(consentsFor('weitergabe_versicherer', id)).toHaveLength(1);
    expect(caseOf(id).status).toBe('freigabe_noetig');
  });
});

// ---------- R-03 ----------

/** Ein Fall in der Reparatur, dann „Problem melden“ für dasselbe Gerät */
async function reportWhileInRepair() {
  start({ contract: false });
  const device = addWasher();
  const id = caseInRepair(device.id);
  const r = await renderRouter(APP, { initialUrl: '/fall/neu' });
  return { id, device, r };
}

describe('R-03 „Neues Problem melden“ bei einem Fall in der Reparatur', () => {
  test('R-03 Ausgangslage: der laufende Fall steht im Gespräch, „Weitermachen“ ist da', async () => {
    const { id } = await reportWhileInRepair();
    expect(caseOf(id).status).toBe('in_reparatur');
    expect(screen.getByText(de.thread.runningCase(caseOf(id).problemLabel))).toBeTruthy();
    expect(screen.getByRole('button', { name: de.thread.continueCase })).toBeTruthy();
  });

  // app/fall/neu.tsx:82: caseFor() bricht den laufenden Fall ab. In in_reparatur wirft das einen
  // TransitionError, sobald du nach „Neues Problem melden“ ein Problem wählst.
  // Behoben: Problem melden fragt planOpenCase (model/policies/openCase.ts) und öffnet den Fall
  // nur über openCaseFor. „Neues Problem melden“ gibt es nur bei can(facts, 'abbrechen').
  // Seit Nr. 34 lässt sich die Reparatur abbrechen, aber nur im Fall, wo die Absage an den Betrieb
  // dabeisteht. Hat der Betrieb den Auftrag, gibt es hier weiter nur „Weitermachen“.
  test('R-03 ein Fall mit Auftrag beim Betrieb bietet nur „Weitermachen“', async () => {
    const { id } = await reportWhileInRepair();
    expect(screen.queryByRole('button', { name: de.thread.newProblem })).toBeNull();
    expect(screen.getByText(de.thread.runningCaseOnlyContinue)).toBeTruthy();
    expect(screen.getByRole('button', { name: de.thread.continueCase })).toBeTruthy();
    expect(caseOf(id).status).toBe('in_reparatur');
    expect(runningBookings(id)).toHaveLength(1);
  });
});

// ---------- R-18 ----------

describe('R-18 Termin mit unbekannter Fallnummer', () => {
  const url = '/fall/GS-99999/termin?art=reparatur';

  test('R-18 Ausgangslage: der Deep Link öffnet den Termin, den Fall gibt es nicht', async () => {
    start();
    addWasher();
    const r = await renderRouter(APP, { initialUrl: url });
    expect(r.getPathname()).toBe('/fall/GS-99999/termin');
    expect(useAppStore.getState().cases['GS-99999']).toBeUndefined();
  });

  // app/fall/[id]/termin.tsx:58 prüft nicht, ob es den Fall gibt. Das Formular erscheint, und der
  // Tap auf „Termin anfragen“ wirft „Fall nicht gefunden“.
  // Behoben: Ohne Fall zeigt der Termin nur einen Hinweis, und requestBooking lehnt eine unbekannte
  // Fallnummer ab, statt zu werfen (Schritt 24).
  test('R-18 statt des Formulars ein Hinweis, kein Absturz', async () => {
    start();
    addWasher();
    await renderRouter(APP, { initialUrl: url });
    expect(screen.queryByRole('radio', { name: demoConfig.slots[0] })).toBeNull();
    expect(screen.getByText(de.result.missing)).toBeTruthy();
    // Was angeboten wird, darf nicht abstürzen
    await tapIfOffered(demoConfig.slots[0], 'radio');
    await tapIfOffered(de.appointment.request);
    expect(useAppStore.getState().bookings).toHaveLength(0);
  });
});
