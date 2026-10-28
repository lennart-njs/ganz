import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { useAppStore } from '@/store/appStore';

const APP = './app';
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
  const c = s.createCase({
    deviceId: device.id,
    entry: 'foto',
    problemLabel: 'Wasserablauf gestört',
  });
  s.addPhoto({
    caseId: c.id,
    deviceId: device.id,
    purpose: 'display',
    source: 'in_app_camera',
    uri: '',
  });
  const run = s.startGuide(c.id, 'ablauf');
  for (let i = 0; i < 4; i++) s.moveGuideStep(run.id, 'next');
  s.finishGuide(run.id, 'geht_nicht');
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  return c.id;
}

/** Im Gespräch: Betrieb und Zeitfenster wählen */
async function pickPartnerAndSlot(slot: string = demoConfig.slots[0]!) {
  await tap(new RegExp(`^${demoConfig.partners[0]!.name}`));
  await tap(slot);
}

describe('Kosten und Schadenmeldung im Gespräch', () => {
  test('„freigabe_noetig“ entsteht erst durch den Tap auf „Schadenfall melden“', async () => {
    const id = caseAfterFinding();
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
    let c = useAppStore.getState().cases[id]!;
    expect(c.status).toBe('eskaliert');
    expect(c.claim).toBeUndefined();
    expect(
      useAppStore.getState().consents.some((x) => x.purpose === 'weitergabe_versicherer'),
    ).toBe(false);

    await tap(de.costs.report);
    c = useAppStore.getState().cases[id]!;
    expect(c.status).toBe('freigabe_noetig');
    const consent = useAppStore
      .getState()
      .consents.find((x) => x.purpose === 'weitergabe_versicherer')!;
    expect(consent).toMatchObject({
      legalBasis: 'vertrag',
      recipient: { name: demoConfig.insurer.name },
    });
    expect(c.claim?.confirmationId).toBe(consent.id);
    // Weiter im selben Gespräch: Wer repariert?
    expect(r.getPathname()).toBe(`/fall/${id}`);
    expect(screen.getByText(de.talk.claim.reported('Kranich'))).toBeTruthy();
    expect(screen.getByText(de.appointment.titleRepair)).toBeTruthy();
  });

  test('Kostenträger, Selbstbeteiligung und was bei Ablehnung passiert stehen vor dem Tap', async () => {
    const id = caseAfterFinding();
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(screen.getByText(de.talk.claim.payer('Kranich', '0 €'))).toBeTruthy();
    expect(screen.getByText(de.talk.claim.rejected('Kranich'))).toBeTruthy();
    expect(screen.getByText(de.costs.saving('710 €'))).toBeTruthy();
  });

  test('die Fallakte-Vorschau zeigt, was an den Versicherer geht', async () => {
    const id = caseAfterFinding();
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(screen.queryByText(de.costs.previewContract(demoConfig.contract.number))).toBeNull();
    await tap(de.costs.preview('Kranich'));
    expect(screen.getByText(de.costs.previewContract(demoConfig.contract.number))).toBeTruthy();
    expect(screen.getAllByText(de.help.stepsDone(4, 7)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(de.help.abortedAt(5, 'Pumpe freimachen')).length).toBeGreaterThan(0);
    expect(screen.getByText(de.caseFile.costsLine('189 €', '899 €'))).toBeTruthy();
  });
});

describe('Betrieb und Termin im Gespräch', () => {
  async function bookAfterClaim() {
    const id = caseAfterFinding();
    const r = await renderRouter(APP, { initialUrl: `/fall/${id}` });
    await tap(de.costs.report);
    return { id, r };
  }

  test('bei Selbstbeteiligung 0 € heißt der Button „Termin anfragen“, vorbehaltlich Freigabe', async () => {
    const { id, r } = await bookAfterClaim();
    // Ohne Betrieb und Zeitfenster gibt es noch nichts anzufragen
    expect(screen.queryByRole('button', { name: de.appointment.request })).toBeNull();
    await pickPartnerAndSlot();
    expect(screen.getByText(de.appointment.pending)).toBeTruthy();
    await tap(de.appointment.request);
    expect(r.getPathname()).toBe(`/fall/${id}`);
    const booking = useAppStore.getState().bookings[0]!;
    expect(booking).toMatchObject({
      kind: 'reparatur',
      status: 'angefragt',
      subjectToApproval: true,
      slotLabel: demoConfig.slots[0],
      provider: { name: demoConfig.partners[0]!.name, authorized: true },
    });
    expect(booking.address?.city).toBe(demoConfig.household.address.city);
    expect(useAppStore.getState().consents.map((c) => c.purpose)).toContain('weitergabe_betrieb');
  });

  test('bei Selbstbeteiligung über 0 € heißt der Button „Zahlungspflichtig buchen“', async () => {
    const id = caseAfterFinding();
    useAppStore.getState().setDemo({ deductible: 5000 });
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(screen.getByText(de.talk.claim.payer('Kranich', '50 €'))).toBeTruthy();
    await tap(de.costs.report);
    await pickPartnerAndSlot();
    expect(screen.getByRole('button', { name: de.appointment.requestPaid })).toBeTruthy();
    expect(screen.queryByRole('button', { name: de.appointment.request })).toBeNull();
  });

  test('ohne Schutz zahlt die Nutzerin selbst und bucht zahlungspflichtig', async () => {
    const id = caseAfterFinding({ contract: false });
    await renderRouter(APP, { initialUrl: `/fall/${id}` });
    expect(screen.queryByRole('button', { name: de.costs.report })).toBeNull();
    await tap(de.costs.toAppointment);
    await pickPartnerAndSlot(demoConfig.slots[1]!);
    expect(screen.getByText(de.appointment.costsSelf('189 €'))).toBeTruthy();
    await tap(de.appointment.requestPaid);
    expect(useAppStore.getState().cases[id]?.status).toBe('in_reparatur');
  });

  test('die Pumpe geht nie an den Haushalt', async () => {
    const { id } = await bookAfterClaim();
    await pickPartnerAndSlot();
    expect(
      screen.getByText(de.appointment.ecoDesign(de.appliance.waschmaschine.finding.partAcc, 15)),
    ).toBeTruthy();
    expect(() =>
      useAppStore.getState().requestBooking({
        caseId: id,
        kind: 'ersatzteil_versand',
        partnerId: 'brandt',
        slotLabel: 'Mo vormittags',
        selfPay: false,
        partName: de.appliance.waschmaschine.finding.component,
      }),
    ).toThrow();
    expect(useAppStore.getState().bookings.some((b) => b.kind === 'ersatzteil_versand')).toBe(
      false,
    );
  });

  test('Vor-Ort-Diagnose aus „Hilfe holen“ bucht ohne Kostenvoranschlag', async () => {
    const s = useAppStore.getState();
    s.reset();
    useAppStore.setState({ onboardingDone: true });
    const device = s.addDevice({
      manufacturerId: 'miele',
      category: 'waschmaschine',
      model: 'WKB 130',
      identifiedBy: 'manuell',
    });
    const c = s.createCase({
      deviceId: device.id,
      entry: 'symptom',
      problemLabel: 'Tür geht nicht auf',
    });
    s.escalate(c.id);
    await renderRouter(APP, { initialUrl: `/fall/${c.id}` });
    await tap(new RegExp(`^${de.thread.onSite}`));
    expect(screen.getByText(de.thread.diagnosisAsk)).toBeTruthy();
    await tap(new RegExp(`^${demoConfig.partners[0]!.name}`));
    await tap(demoConfig.slots[2]!);
    expect(screen.getByText(de.appointment.costsDiagnosis)).toBeTruthy();
    await tap(de.appointment.request);
    expect(useAppStore.getState().bookings[0]?.kind).toBe('vor_ort_diagnose');
    expect(useAppStore.getState().cases[c.id]?.status).toBe('eskaliert');
  });
});
