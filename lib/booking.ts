// Termin anfragen: gemeinsam für das Formular (termin.tsx) und das Gespräch (schaden.tsx).
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import { amountDue, bookingCosts, type BookingCosts } from '@/model/policies/payer';
import type { Result } from '@/model/result';
import type { Booking, Id } from '@/model/types';
import { notifications } from '@/services/notifications';
import { useAppStore, type AppData } from '@/store/appStore';

/**
 * Wer den Termin zahlt und was der Haushalt zahlt, aus den Fakten des Falls (model/policies/payer.ts).
 * „Du zahlst …“ und „Zahlungspflichtig buchen“ gibt es nur, wo der Haushalt zahlt oder eine
 * Selbstbeteiligung fällig werden kann. Während der Versicherer prüft, zählt zahlung=selbst nicht (R-07).
 */
export function costsOf(
  s: AppData,
  caseId: Id,
  selfPay: boolean,
  diagnosis = false,
): BookingCosts | undefined {
  return bookingCosts(
    selectCaseFacts(s, caseId),
    diagnosis ? 'vor_ort_diagnose' : 'reparatur',
    selfPay,
    s.demo.deductible,
  );
}

/** Was die Nutzerin selbst zahlt: nichts, die Selbstbeteiligung oder die ganze Reparatur */
export function amountToPay(s: AppData, caseId: Id, selfPay: boolean, diagnosis = false): number {
  return amountDue(costsOf(s, caseId, selfPay, diagnosis));
}

/** Kostenzeile der Zusammenfassung. Den Preis einer Selbstzahler-Buchung zeigt sie immer vorher. */
export function costsLine(s: AppData, caseId: Id, selfPay: boolean, diagnosis = false): string {
  const t = de.appointment;
  const costs = costsOf(s, caseId, selfPay, diagnosis);
  if (!costs) return '–';
  if (costs.payer === 'haushalt') {
    return costs.amount === undefined ? t.costsDiagnosis : t.costsSelf(formatEuro(costs.amount));
  }
  const insurer = demoConfig.insurer.shortName;
  const deductible = formatEuro(costs.deductible);
  return costs.approved ? t.costsApproved(insurer, deductible) : t.costsClaim(insurer, deductible);
}

/**
 * Fragt den Termin an. Der Systemdialog für Mitteilungen kommt erst jetzt, beim ersten Bedarf
 * (Review 4.1), und nur, wenn der Termin angefragt ist.
 */
export function requestAppointment(input: {
  caseId: Id;
  partnerId: string;
  slot: string;
  selfPay: boolean;
  diagnosis?: boolean;
}): Result<Booking> {
  const s = useAppStore.getState();
  const c = s.cases[input.caseId];
  const quote = s.quotes.find((q) => q.id === c?.quoteId);
  const result = s.requestBooking({
    caseId: input.caseId,
    kind: input.diagnosis ? 'vor_ort_diagnose' : 'reparatur',
    partnerId: input.partnerId,
    slotLabel: input.slot,
    selfPay: input.selfPay,
    partName: quote?.repair.partName,
  });
  if (result.ok && useAppStore.getState().notifications === 'offen') {
    notifications
      .requestPermission()
      .then((ok) => useAppStore.getState().setNotifications(ok ? 'erlaubt' : 'abgelehnt'))
      .catch(() => undefined);
  }
  return result;
}
