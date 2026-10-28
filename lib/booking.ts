// Termin anfragen aus dem Gespräch des Falls (app/fall/[id]/index.tsx).
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatEuro } from '@/i18n/format';
import type { Id } from '@/model/types';
import { notifications } from '@/services/notifications';
import { useAppStore, type AppData } from '@/store/appStore';

/** Was die Nutzerin selbst zahlt: nichts, die Selbstbeteiligung oder die ganze Reparatur */
export function amountToPay(s: AppData, caseId: Id, selfPay: boolean, diagnosis = false): number {
  const c = s.cases[caseId];
  const quote = s.quotes.find((q) => q.id === c?.quoteId);
  if (diagnosis) return 0;
  if (selfPay) return quote?.repair.total ?? 0;
  return c?.status === 'freigabe_noetig' || c?.claim ? s.demo.deductible : 0;
}

/** Kostenzeile der Zusammenfassung */
export function costsLine(s: AppData, caseId: Id, selfPay: boolean, diagnosis = false): string {
  const t = de.appointment;
  if (diagnosis) return t.costsDiagnosis;
  if (selfPay) return t.costsSelf(formatEuro(amountToPay(s, caseId, true)));
  return t.costsClaim(demoConfig.insurer.shortName, formatEuro(s.demo.deductible));
}

/** Fragt den Termin an. Der Systemdialog für Mitteilungen kommt erst jetzt, beim ersten Bedarf (Review 4.1). */
export function requestAppointment(input: {
  caseId: Id;
  partnerId: string;
  slot: string;
  selfPay: boolean;
  diagnosis?: boolean;
}) {
  const s = useAppStore.getState();
  const c = s.cases[input.caseId];
  const quote = s.quotes.find((q) => q.id === c?.quoteId);
  s.requestBooking({
    caseId: input.caseId,
    kind: input.diagnosis ? 'vor_ort_diagnose' : 'reparatur',
    partnerId: input.partnerId,
    slotLabel: input.slot,
    selfPay: input.selfPay,
    partName: quote?.repair.partName,
  });
  if (useAppStore.getState().notifications === 'offen') {
    notifications
      .requestPermission()
      .then((ok) => useAppStore.getState().setNotifications(ok ? 'erlaubt' : 'abgelehnt'))
      .catch(() => undefined);
  }
}
