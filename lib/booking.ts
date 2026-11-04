// Termin anfragen: gemeinsam für das Formular (termin.tsx) und das Gespräch (schaden.tsx).
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import { selectCaseFacts } from '@/model/policies/caseFacts';
import {
  amountDue,
  bindsAfterApproval,
  bookingCosts,
  type BookingCosts,
} from '@/model/policies/payer';
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
  const f = selectCaseFacts(s, caseId);
  // Die Selbstbeteiligung aus dem Vertrag, wie im Store (setDemo hält sie gleich)
  return bookingCosts(f, diagnosis ? 'vor_ort_diagnose' : 'reparatur', selfPay, f?.deductible ?? 0);
}

/** Was die Nutzerin selbst zahlt: nichts, die Selbstbeteiligung oder die ganze Reparatur */
export function amountToPay(s: AppData, caseId: Id, selfPay: boolean, diagnosis = false): number {
  return amountDue(costsOf(s, caseId, selfPay, diagnosis));
}

/**
 * Bindest du dich erst nach der Freigabe (Entscheidung Nr. 31)? Während der Versicherer prüft und
 * eine Selbstbeteiligung über 0 € fällig werden kann. Dann sagt die Zusammenfassung, dass die
 * Anfrage unverbindlich ist und der verbindliche Schritt danach kommt.
 */
export function bindsLater(s: AppData, caseId: Id, selfPay: boolean, diagnosis = false): boolean {
  return bindsAfterApproval(costsOf(s, caseId, selfPay, diagnosis));
}

/**
 * Fragt das System nach „Termin anfragen“ nach Mitteilungen? Dann steht der Satz dazu davor. Nur
 * solange in ganz nichts entschieden ist und der Systemdialog wirklich kommt (dialog, aus
 * hooks/useNotificationDialog.ts). Sonst gibt es keinen Satz und keine Einwilligung.
 */
export function asksNotifications(s: AppData, dialog: boolean): boolean {
  return s.notifications === 'offen' && dialog;
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
 * (Review 4.1), und nur, wenn der Termin angefragt ist und davor
 * de.appointment.notificationsNotice stand (noticeShown, aus asksNotifications). Nur die Antwort im
 * Systemdialog ist die Einwilligung, gespeichert mit diesem Text. Kam kein Dialog, weil das Telefon
 * Mitteilungen schon erlaubt, bleibt alles offen: keine Einwilligung, die niemand gegeben hat.
 */
export function requestAppointment(input: {
  caseId: Id;
  partnerId: string;
  slot: string;
  selfPay: boolean;
  diagnosis?: boolean;
  /** Der Satz vor dem Systemdialog stand auf dem Screen */
  noticeShown?: boolean;
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
  if (result.ok && input.noticeShown && useAppStore.getState().notifications === 'offen') {
    notifications
      .requestPermission()
      .then(({ granted, asked }) => {
        if (!asked) return;
        useAppStore
          .getState()
          .setNotifications(granted ? 'erlaubt' : 'abgelehnt', 'mitteilungen_termin');
      })
      .catch(() => undefined);
  }
  return result;
}
