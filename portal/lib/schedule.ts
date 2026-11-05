// Termine planen (Portal-Idee 4): Welcher Betrieb passt zur Postleitzahl der Kundschaft, und wie
// voll sind seine Zeitfenster? Der eigene Kundendienst hat sein Gebiet (Einstellungen →
// Kundendienst). Liegt die Adresse außerhalb, stehen die Partner vorn, autorisierte zuerst.
// Belegt ist ein Zeitfenster durch bestätigte Termine in offenen Fällen.
import type { DealerSettings } from '@/model/portal';
import type { SharedCaseRecord } from '@/model/sharing';

import { appointmentOf } from './next';

export interface PartnerOption {
  name: string;
  /** Eigener Kundendienst */
  own: boolean;
  /** Nur beim eigenen Kundendienst und mit Postleitzahl: liegt sie im Gebiet? */
  inArea?: boolean;
}

export function partnerOptions(s: DealerSettings, zip?: string): PartnerOption[] {
  const code = zip?.trim();
  const own: PartnerOption[] = s.service.ownService
    ? [
        {
          name: s.service.serviceName,
          own: true,
          ...(code ? { inArea: s.service.zipPrefixes.some((p) => p && code.startsWith(p)) } : {}),
        },
      ]
    : [];
  const partners = [...s.service.partners]
    .sort((a, b) => Number(b.authorized) - Number(a.authorized))
    .map((p): PartnerOption => ({ name: p.name, own: false }));
  return own[0]?.inArea === false ? [...partners, ...own] : [...own, ...partners];
}

/** Bestätigte Termine je Betrieb und Zeitfenster, nur in offenen Fällen */
export function slotLoad(
  records: readonly SharedCaseRecord[],
): Record<string, Record<string, number>> {
  const load: Record<string, Record<string, number>> = {};
  for (const r of records) {
    if (r.revokedAt || r.workflow?.status === 'erledigt' || r.file.case.status === 'abgebrochen')
      continue;
    const { partner, slot } = appointmentOf(r);
    if (!partner || !slot) continue;
    const row = (load[partner] ??= {});
    row[slot] = (row[slot] ?? 0) + 1;
  }
  return load;
}
