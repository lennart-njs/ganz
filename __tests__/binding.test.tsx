// „Zahlungspflichtig buchen“ als eigener Schritt in Gespräch, Termin und Status: nach der Freigabe
// (Entscheidung Nr. 31) und nach dem Preis für die Vor-Ort-Diagnose (Nr. 33). Bis dahin ist die
// Anfrage unverbindlich. Der Betrieb bestätigt erst nach dem Tap, die Simulation wartet.
// „Nicht buchen“ beendet die Anfrage ohne Kosten.
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
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

// ---------- Vor-Ort-Diagnose ohne festen Preis (Entscheidung Nr. 33) ----------

/** Nach „Hilfe holen“, ohne Kostenvoranschlag, Vor-Ort-Diagnose angefragt (über den Store) */
function visitRequested({ contract = false } = {}) {
  start({ contract });
  const s = useAppStore.getState();
  const id = s.createCase({
    deviceId: addWasher().id,
    entry: 'symptom',
    problemLabel: 'Tür geht nicht auf',
  }).id;
  unwrap(s.escalate(id));
  unwrap(
    s.requestBooking({
      caseId: id,
      kind: 'vor_ort_diagnose',
      partnerId: partner.id,
      slotLabel: slot,
      selfPay: false,
    }),
  );
  return id;
}

const price = formatEuro(demoConfig.prices.diagnosis);
const declineButton = new RegExp(`^${de.appointment.decline}`);

describe('Gespräch: Vor-Ort-Diagnose, erst der Preis, dann verbindlich (Nr. 33)', () => {
  test('„Termin anfragen“, der Betrieb nennt den Preis, dann „Zahlungspflichtig buchen“', async () => {
    start({ contract: false });
    const s = useAppStore.getState();
    const id = s.createCase({
      deviceId: addWasher().id,
      entry: 'symptom',
      problemLabel: 'Tür geht nicht auf',
    }).id;
    unwrap(s.escalate(id));
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(new RegExp(`^${de.thread.onSite}`));
    await tap(new RegExp(`^${partner.name}`));
    await tap(slot);
    expect(screen.getByText(de.appointment.costsDiagnosis)).toBeTruthy();
    expect(screen.queryByText(new RegExp(price))).toBeNull();
    expect(button(de.appointment.requestPaid)).toBeNull();
    await tap(de.appointment.request);
    expect(screen.getByText(de.status.text.angefragtDiagnose(partner.name))).toBeTruthy();

    // Der Betrieb nennt den Preis. Ohne deinen Tap kommt kein Termin.
    await tap(de.thread.demoNext);
    expect(screen.getByText(de.appointment.priceNamed(partner.name, price))).toBeTruthy();
    expect(screen.getByText(de.appointment.bindingTitle)).toBeTruthy();
    expect(screen.getByText(de.appointment.jobDiagnosis)).toBeTruthy();
    expect(screen.getByText(de.appointment.duePrice(price))).toBeTruthy();
    expect(screen.getByText(de.appointment.bindingNotice(partner.name))).toBeTruthy();
    expect(button(declineButton)).toBeTruthy();
    expect(button(de.thread.demoNext)).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(bookingOf(id).status).toBe('angefragt');

    await tap(de.appointment.requestPaid);
    expect(bookingOf(id).binding?.amount).toBe(demoConfig.prices.diagnosis);
    expect(screen.getByText(de.appointment.booked)).toBeTruthy();
    await tap(de.thread.demoNext);
    expect(bookingOf(id).status).toBe('bestaetigt');
    expect(screen.getByText(de.status.headline.bestaetigt(slot))).toBeTruthy();
  });

  test('„Nicht buchen“: keine Kosten, das Gespräch bietet wieder Hilfe und Vor-Ort-Diagnose', async () => {
    const id = visitRequested();
    useAppStore.getState().simulateNext(id);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(declineButton);
    expect(bookingOf(id)).toMatchObject({ status: 'storniert' });
    expect(bookingOf(id).binding).toBeUndefined();
    expect(screen.getByText(de.appointment.declined)).toBeTruthy();
    expect(screen.queryByText(de.appointment.bindingTitle)).toBeNull();
    expect(button(de.appointment.requestPaid)).toBeNull();
    expect(button(new RegExp(`^${de.thread.callStart}`))).toBeTruthy();
    expect(button(new RegExp(`^${de.thread.onSite}`))).toBeTruthy();
  });

  test('nach der Freigabe genauso (Nr. 31): „Nicht buchen“, dann neu und gleich verbindlich', async () => {
    const id = requested(5000);
    useAppStore.getState().simulateNext(id);
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(declineButton);
    expect(bookingOf(id).status).toBe('storniert');
    expect(screen.getByText(de.appointment.declined)).toBeTruthy();
    await tap(new RegExp(`^${demoConfig.partners[1]!.name}`));
    await tap(demoConfig.slots[1]!);
    expect(screen.getByText(de.appointment.costsApproved(insurer, '50 €'))).toBeTruthy();
    await tap(de.appointment.requestPaid);
    expect(useAppStore.getState().bookings.at(-1)).toMatchObject({
      provider: { id: demoConfig.partners[1]!.id },
      binding: { amount: 5000 },
    });
  });

  test('die Fallakte nennt Preis und „Nicht gebucht“', async () => {
    const id = visitRequested();
    useAppStore.getState().simulateNext(id);
    unwrap(useAppStore.getState().declineBinding(id));
    await renderRouter(APP, { initialUrl: `/fall/${id}/fallakte` });
    const f = de.file.event;
    expect(
      screen.getByText(f.detail(de.caseEvent.preis_genannt, f.price(partner.name, price))),
    ).toBeTruthy();
    expect(
      screen.getByText(f.detail(de.caseEvent.nicht_gebucht, f.booking(partner.name, slot))),
    ).toBeTruthy();
  });
});

describe('Termin und Status: Vor-Ort-Diagnose mit Preis (Nr. 33)', () => {
  test('Termin: dieselbe Karte mit dem Preis, „Nicht buchen“ führt zurück ins Gespräch', async () => {
    const id = visitRequested({ contract: true });
    useAppStore.getState().simulateNext(id);
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}/termin?art=diagnose` });
    expect(screen.getByRole('header', { name: de.appointment.bindingTitle })).toBeTruthy();
    expect(screen.getByText(de.appointment.duePrice(price))).toBeTruthy();
    expect(button(de.appointment.requestPaid)).toBeTruthy();
    await tap(de.appointment.decline);
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(bookingOf(id).status).toBe('storniert');
  });

  test('Status: erst „nennt dir den Preis“, dann der Preis und der ausstehende Tap', async () => {
    const id = visitRequested();
    await renderRouter(APP, { initialUrl: `/fall/${id}/status` });
    expect(screen.getByText(de.status.text.angefragtDiagnose(partner.name))).toBeTruthy();
    await act(async () => {
      useAppStore.getState().simulateNext(id);
    });
    expect(screen.getByText(de.status.headline.preis(partner.name, price))).toBeTruthy();
    expect(screen.getByText(de.status.text.buchen(partner.name))).toBeTruthy();
    expect(screen.getByText(de.status.timeline.preis)).toBeTruthy();
    expect(screen.getByText(de.status.timeline.buchen)).toBeTruthy();
    expect(button(de.status.demoNext)).toBeNull();
  });
});
