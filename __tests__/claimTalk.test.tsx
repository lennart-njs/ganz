import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';
const g = de.talk.claim;
const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

/** Fall nach dem Videocall mit Befund „Reparatur“ und Kostenvoranschlag */
function caseAfterFinding({ contract = true } = {}) {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  if (contract) s.linkContract('vertragsnummer');
  const device = s.addDevice({
    manufacturerId: 'miele',
    category: 'waschmaschine',
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]?.id,
  });
  const c = s.createCase({ deviceId: device.id, entry: 'foto', problemLabel: 'Wasserablauf' });
  s.escalate(c.id);
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  return c.id;
}

const [partner] = demoConfig.partners;
const slot = demoConfig.slots[0]!;

describe('Schadenmeldung als Gespräch', () => {
  test('aus dem Formular erreichbar und zurück', async () => {
    const id = caseAfterFinding();
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}/kosten` });
    await tap(g.entry);
    expect(r.getPathname()).toBe(`/fall/${id}/schaden`);
    expect(screen.getByText(g.ask(demoConfig.insurer.shortName))).toBeTruthy();
    await tap(g.form);
    expect(r.getPathname()).toBe(`/fall/${id}/kosten`);
  });

  test('Schadenfall erst durch den Tap, dann Betrieb, Zeitfenster, Zusammenfassung', async () => {
    const id = caseAfterFinding();
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}/schaden` });
    // Vorschau, was an den Versicherer geht, steht vor der Frage
    expect(screen.getByText(de.costs.preview(demoConfig.insurer.shortName))).toBeTruthy();
    expect(useAppStore.getState().cases[id]?.claim).toBeUndefined();

    await tap(de.costs.report);
    expect(useAppStore.getState().cases[id]?.status).toBe('freigabe_noetig');
    // Gemeldet ist gemeldet: kein Stift an dieser Antwort
    expect(screen.queryByRole('button', { name: de.talk.edit(de.costs.report) })).toBeNull();

    await tap(new RegExp(`^${partner!.name}`));
    await tap(slot);
    expect(screen.getByText(g.summary)).toBeTruthy();
    // Zeitfenster ändern geht mit dem Stift
    await tap(de.talk.edit(slot));
    await tap(demoConfig.slots[1]!);
    await tap(de.appointment.request);
    expect(r.getPathname()).toBe(`/fall/${id}/status`);
    expect(useAppStore.getState().bookings.find((b) => b.caseId === id)).toMatchObject({
      kind: 'reparatur',
      slotLabel: demoConfig.slots[1],
    });
  });

  test('ohne Schutz: selbst zahlen heißt „Zahlungspflichtig buchen“', async () => {
    const id = caseAfterFinding({ contract: false });
    await renderRouter(APP, { initialUrl: `/fall/${id}/schaden` });
    expect(screen.queryByRole('button', { name: de.costs.report })).toBeNull();
    await tap(de.costs.toAppointment);
    await tap(new RegExp(`^${partner!.name}`));
    await tap(slot);
    expect(screen.getByRole('button', { name: de.appointment.requestPaid })).toBeTruthy();
    expect(useAppStore.getState().cases[id]?.claim).toBeUndefined();
  });

  test('mit Schutz und Stift: von „selbst zahlen“ zurück zur Schadenmeldung', async () => {
    const id = caseAfterFinding();
    await renderRouter(APP, { initialUrl: `/fall/${id}/schaden` });
    await tap(de.costs.selfPay);
    expect(useAppStore.getState().cases[id]?.claim).toBeUndefined();
    await tap(de.talk.edit(de.costs.selfPay));
    expect(screen.getByRole('button', { name: de.costs.report })).toBeTruthy();
  });
});
