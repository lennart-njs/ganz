// Gemeinsame Ausgangslagen für die Regressionstests in __tests__/regressions/ (R-01 bis R-18).
// Jede Funktion baut einen Stand nur über Store-Aktionen auf, wie die anderen Tests auch.
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import { toDiagnosis } from '@/lib/diagnosis';
import type { Booking, ConsentPurpose, Device, DeviceCategory, Id } from '@/model/types';
import { selectOpenCases, useAppStore } from '@/store/appStore';

import { APP } from './app';

export const tap = (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

/** Drückt einen Button nur, wenn die App ihn anbietet. Gibt zurück, ob es ihn gab. */
export async function tapIfOffered(name: string | RegExp, role: 'button' | 'radio' = 'button') {
  const el = screen.queryByRole(role, { name });
  if (el) await fireEvent.press(el);
  return !!el;
}

export const flush = async (n = 6) => {
  for (let i = 0; i < n; i++) await act(async () => {});
};

/** Leerer Stand nach dem Onboarding, optional mit Schutz */
export function start({ contract = true } = {}) {
  const s = useAppStore.getState();
  s.reset();
  useAppStore.setState({ onboardingDone: true });
  if (contract) s.linkContract('vertragsnummer');
}

/** Waschmaschine aus dem Vertrag, wenn es einen gibt */
export function addWasher(category: DeviceCategory = 'waschmaschine'): Device {
  return useAppStore.getState().addDevice({
    manufacturerId: 'miele',
    category,
    model: 'WKB 130',
    identifiedBy: 'vertrag',
    contractId: useAppStore.getState().contracts[0]?.id,
  });
}

/** Fall mit Befund „Reparatur“ der Fachkraft und Kostenvoranschlag (Status eskaliert) */
export function caseAfterFinding(deviceId: Id, problemLabel = 'Wasserablauf gestört'): Id {
  const s = useAppStore.getState();
  const c = s.createCase({ deviceId, entry: 'foto', problemLabel });
  s.escalate(c.id);
  s.setFinding(c.id, 'reparatur', 'fachkraft');
  return c.id;
}

/** Foto vom Display mit Ergebnis der Intelligenten Fehlererkennung, noch ohne Anleitung */
export function photoCase(deviceId: Id, guideId: GuideId = 'ablauf'): Id {
  const s = useAppStore.getState();
  const c = s.createCase({ deviceId, entry: 'foto', problemLabel: guides[guideId].title });
  const photo = s.addPhoto({
    caseId: c.id,
    deviceId,
    purpose: 'display',
    source: 'in_app_camera',
    uri: '',
  });
  s.addDiagnosis(
    toDiagnosis(c.id, [photo.id], 'display', {
      kind: 'ergebnis',
      errorPattern: 'wasserablauf',
      displayMessage: 'Wasserablauf',
      confidence: 'hoch',
      confidenceScore: 0.9,
      guideId,
    }),
  );
  return c.id;
}

/** Kosten → „Schadenfall melden“ → Termin → zurück zu den Kosten */
export async function backToCostsAfterClaim() {
  start();
  const id = caseAfterFinding(addWasher().id);
  const r = await renderRouter(APP, { initialUrl: `/fall/${id}/kosten` });
  await tap(de.costs.report);
  expect(r.getPathname()).toBe(`/fall/${id}/termin`);
  await act(async () => router.back());
  return { id, r };
}

/** Fall ohne Schutz in der Reparatur: selbst bezahlt, Termin angefragt (Status in_reparatur) */
export function caseInRepair(deviceId: Id, partnerId = demoConfig.partners[0]!.id): Id {
  const id = caseAfterFinding(deviceId);
  useAppStore.getState().requestBooking({
    caseId: id,
    kind: 'reparatur',
    partnerId,
    slotLabel: demoConfig.slots[0],
    selfPay: true,
  });
  return id;
}

export const caseOf = (id: Id) => useAppStore.getState().cases[id]!;

export const openCasesOf = (deviceId: Id) =>
  selectOpenCases(useAppStore.getState()).filter((c) => c.deviceId === deviceId);

/** Termine, die noch laufen: weder storniert noch erledigt */
export const runningBookings = (caseId: Id, kind?: Booking['kind']) =>
  useAppStore
    .getState()
    .bookings.filter(
      (b) =>
        b.caseId === caseId &&
        b.status !== 'storniert' &&
        b.status !== 'erledigt' &&
        (!kind || b.kind === kind),
    );

export const consentsFor = (purpose: ConsentPurpose, caseId?: Id) =>
  useAppStore
    .getState()
    .consents.filter((c) => c.purpose === purpose && (!caseId || c.caseId === caseId));

/** Für Texte in einem RegExp, z. B. „75 °C“ oder Namen mit Klammern */
export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
