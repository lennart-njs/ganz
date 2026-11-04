// „Zahlungspflichtig buchen“ als eigener Schritt nach der Freigabe (Entscheidung Nr. 31) in
// Gespräch, Termin und Status. Solange Kranich prüft, ist die Anfrage unverbindlich. Danach
// bestätigt der Betrieb erst nach dem Tap, die Simulation wartet.
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { demoNames, legalParts } from '@/lib/legalTexts';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { nextSimulationDue, useAppStore } from '@/store/appStore';
import { APP } from '@/test/app';
import { addWasher, caseAfterFinding, consentsFor, start } from '@/test/regressions';
import { unwrap } from '@/test/result';

const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));
const insurer = demoConfig.insurer.shortName;
const partner = demoConfig.partners[0]!;
const slot = demoConfig.slots[0]!;
const button = (name: string | RegExp) => screen.queryByRole('button', { name });

/** Fall mit Befund, Schadenfall gemeldet, mit Selbstbeteiligung */
function reported(deductible: number, claimScenario: 'freigeben' | 'ablehnen' = 'freigeben') {
  start();
  useAppStore.getState().setDemo({ deductible, claimScenario });
  const id = caseAfterFinding(addWasher().id);
  unwrap(useAppStore.getState().reportClaim(id));
  return id;
}

/** Wie oben, dazu der Termin vorbehaltlich Freigabe, über den Store */
function requested(deductible: number, claimScenario: 'freigeben' | 'ablehnen' = 'freigeben') {
  const id = reported(deductible, claimScenario);
  unwrap(
    useAppStore.getState().requestBooking({
      caseId: id,
      kind: 'reparatur',
      partnerId: partner.id,
      slotLabel: slot,
      selfPay: false,
    }),
  );
  return id;
}

const bookingOf = (id: string) => useAppStore.getState().bookings.find((b) => b.caseId === id)!;

describe('Gespräch: unverbindlich während der Prüfung, verbindlich nach der Freigabe (Nr. 31)', () => {
  test('50 €: „Termin anfragen“, dann die Zusammenfassung mit „Zahlungspflichtig buchen“', async () => {
    const id = reported(5000);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(new RegExp(`^${partner.name}`));
    await tap(slot);
    // Während der Prüfung: unverbindlich, die Selbstbeteiligung nur unter Bedingung
    expect(screen.getByText(de.appointment.costsClaim(insurer, '50 €'))).toBeTruthy();
    expect(screen.getByText(de.appointment.pendingBinding(insurer))).toBeTruthy();
    expect(screen.queryByText(de.appointment.bindingNotice(partner.name))).toBeNull();
    expect(button(de.appointment.requestPaid)).toBeNull();
    await tap(de.appointment.request);
    expect(bookingOf(id).binding).toBeUndefined();

    // Kranich gibt frei: Jetzt steht der Betrag fest, und der Betrieb wartet auf den Tap
    await tap(de.thread.demoNext);
    expect(useAppStore.getState().cases[id]?.status).toBe('freigegeben');
    expect(screen.getByText(de.status.headline.freigegeben(insurer))).toBeTruthy();
    expect(screen.getByText(de.appointment.bindingTitle)).toBeTruthy();
    expect(screen.getByText(partner.name)).toBeTruthy();
    expect(screen.getByText(slot)).toBeTruthy();
    expect(
      screen.getByText(de.appointment.jobRepair(de.appliance.waschmaschine.finding.component)),
    ).toBeTruthy();
    expect(screen.getByText(de.appointment.dueDeductible('50 €'))).toBeTruthy();
    // Jeder Teil des Texts, den der Tap stempelt, steht auf dem Screen
    for (const part of legalParts('verbindliche_buchung', {
      ...demoNames(),
      fachbetrieb: partner.name,
    })) {
      expect(screen.getAllByText(part).length).toBeGreaterThan(0);
    }
    // Ohne den Tap kein nächster Schritt, auch nicht in der Demo
    expect(button(de.thread.demoNext)).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(useAppStore.getState().cases[id]?.status).toBe('freigegeben');
    expect(bookingOf(id).status).toBe('angefragt');

    await tap(de.appointment.requestPaid);
    expect(bookingOf(id).binding?.amount).toBe(5000);
    expect(screen.queryByText(de.appointment.bindingTitle)).toBeNull();
    expect(screen.getByText(de.appointment.booked)).toBeTruthy();
    expect(button(de.appointment.requestPaid)).toBeNull();
    // Danach bestätigt der Betrieb
    await tap(de.thread.demoNext);
    expect(useAppStore.getState().cases[id]?.status).toBe('in_reparatur');
    expect(screen.getByText(de.status.headline.bestaetigt(slot))).toBeTruthy();
  });

  test('0 €: kein zweiter Schritt, der Betrieb bestätigt nach der Freigabe', async () => {
    const id = requested(0);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(de.thread.demoNext);
    expect(useAppStore.getState().cases[id]?.status).toBe('freigegeben');
    expect(screen.queryByText(de.appointment.bindingTitle)).toBeNull();
    expect(button(de.appointment.requestPaid)).toBeNull();
    await tap(de.thread.demoNext);
    expect(useAppStore.getState().cases[id]?.status).toBe('in_reparatur');
    expect(bookingOf(id).binding).toBeUndefined();
  });

  test('ohne gültige Weitergabe an den Betrieb erst erneut bestätigen, dann buchen', async () => {
    const id = requested(5000);
    useAppStore.getState().simulateNext(id);
    const share = consentsFor('weitergabe_betrieb', id).find((c) => !c.revokedAt)!;
    useAppStore.getState().revokeConsent(share.id);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(button(de.appointment.requestPaid)).toBeNull();
    await tap(new RegExp(`^${de.thread.renewShare}`));
    await tap(de.appointment.requestPaid);
    expect(bookingOf(id).binding?.amount).toBe(5000);
  });

  test('lehnt Kranich ab, wird die Anfrage nicht zur Buchung, selbst zahlen nennt den Preis', async () => {
    const id = requested(5000, 'ablehnen');
    useAppStore.getState().simulateNext(id);
    expect(useAppStore.getState().cases[id]?.status).toBe('abgelehnt');
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(screen.queryByText(de.appointment.bindingTitle)).toBeNull();
    expect(button(de.appointment.requestPaid)).toBeNull();
    expect(bookingOf(id).binding).toBeUndefined();
    await tap(de.thread.rejectedChoice.selfPay('189 €'));
    await tap(new RegExp(`^${partner.name}`));
    await tap(slot);
    expect(screen.getByText(de.appointment.costsSelf('189 €'))).toBeTruthy();
    expect(screen.getByText(de.appointment.bindingNotice(partner.name))).toBeTruthy();
    await tap(de.appointment.requestPaid);
    const own = useAppStore.getState().bookings.at(-1)!;
    expect(own).toMatchObject({ subjectToApproval: false, binding: { amount: 18900 } });
  });
});

describe('Termin: derselbe Schritt in den Details (Nr. 31)', () => {
  test('während der Prüfung unverbindlich, auch mit 50 €', async () => {
    const id = reported(5000);
    await renderRouter(APP, { initialUrl: `/fall/${id}/termin` });
    expect(screen.getByText(de.appointment.pendingBinding(insurer))).toBeTruthy();
    expect(button(de.appointment.requestPaid)).toBeNull();
    expect(button(de.appointment.request)).toBeTruthy();
  });

  test('nach der Freigabe: Zusammenfassung und „Zahlungspflichtig buchen“, dann zurück ins Gespräch', async () => {
    const id = requested(5000);
    useAppStore.getState().simulateNext(id);
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}/termin` });
    expect(screen.getByRole('header', { name: de.appointment.bindingTitle })).toBeTruthy();
    expect(screen.getByText(de.appointment.dueDeductible('50 €'))).toBeTruthy();
    expect(screen.getByText(de.appointment.bindingNotice(partner.name))).toBeTruthy();
    expect(screen.queryByRole('radio', { name: slot })).toBeNull();
    await tap(de.appointment.requestPaid);
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(bookingOf(id).binding?.amount).toBe(5000);
  });

  test('aus dem Gespräch führt „Details“ zu diesem Schritt', async () => {
    const id = requested(5000);
    useAppStore.getState().simulateNext(id);
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await fireEvent.press(screen.getByTestId('details-termin'));
    expect(r.getPathname()).toBe(`/fall/${id}/termin`);
    expect(screen.getByRole('header', { name: de.appointment.bindingTitle })).toBeTruthy();
    await act(async () => router.back());
  });
});

describe('Status: wartet auf den Tap (Nr. 31)', () => {
  test('Überschrift, Satz zum Gespräch, ausstehender Schritt, kein „Nächster Schritt (Demo)“', async () => {
    const id = requested(5000);
    useAppStore.getState().simulateNext(id);
    expect(nextSimulationDue(useAppStore.getState(), id)).toBeUndefined();
    await renderRouter(APP, { initialUrl: `/fall/${id}/status` });
    expect(screen.getByText(de.status.headline.freigegeben(insurer))).toBeTruthy();
    expect(screen.getByText(de.status.text.buchen(partner.name))).toBeTruthy();
    expect(screen.getByText(de.status.timeline.buchen)).toBeTruthy();
    expect(button(de.status.demoNext)).toBeNull();
    await act(async () => {
      unwrap(useAppStore.getState().bookBinding(id, 5000));
    });
    expect(screen.getByText(de.status.timeline.gebucht)).toBeTruthy();
    expect(screen.queryByText(de.status.timeline.buchen)).toBeNull();
    expect(button(de.status.demoNext)).toBeTruthy();
    expect(selectCaseFacts(useAppStore.getState(), id)?.bindingDue).toBeUndefined();
  });
});
