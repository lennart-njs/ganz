// Gesetzliche Gewährleistung für eine Reparatur (Entscheidung Nr. 32). Sagt der Haushalt nach einer
// Reparatur „Problem besteht weiter“, prüft ganz, ob die Frist noch läuft. Dann bessert derselbe
// Betrieb nach: keine neue Schadenmeldung, keine Selbstbeteiligung, kein Betrag für den Haushalt.
// Danach, ohne gespeicherten Abschluss oder wenn schon die Nachbesserung nicht half, beginnt eine
// neue Runde wie bisher (model/policies/rounds.ts).
// Die Frist ist eine Annahme bis zur Antwort des Anwalts (Rechtsfrage 52): warranty.months aus
// config/demo.config.ts ab Abschluss der Reparatur. Die Uhr und den Wert gibt der Aufrufer mit.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import type { ISODateTime, Rework } from '../types';
import type { CaseFacts } from './caseFacts';

/**
 * Datum plus Monate, in UTC. Gibt es den Tag im Zielmonat nicht, gilt sein letzter Tag
 * (31.01. plus 1 Monat ist der 28.02., wie § 188 Abs. 3 BGB).
 */
export function addMonths(iso: ISODateTime, months: number): ISODateTime {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() !== day) d.setUTCDate(0);
  return d.toISOString();
}

/** Warum keine Nachbesserung: Frist vorbei, schon die Nachbesserung half nicht, oder keine Reparatur */
export type NoReworkReason = 'abgelaufen' | 'nachbesserung_gescheitert' | 'keine_reparatur';

export type WarrantyCheck =
  | { readonly within: true; readonly rework: Omit<Rework, 'claimedAt'> }
  | { readonly within: false; readonly reason: NoReworkReason; readonly until?: ISODateTime };

/**
 * Läuft für die Reparatur der laufenden Runde die Gewährleistung noch, gemessen an asOf?
 * - Die Runde ist schon eine Nachbesserung: nein, es beginnt eine neue Runde (Rechtsfrage 53).
 * - Ohne erledigten Reparaturtermin mit Abschluss (completedAt): nein, wie vor Nr. 32. Das gilt
 *   auch für Stände, die den Abschluss noch nicht speicherten.
 * - Sonst: bis einschließlich completedAt plus months.
 */
export function checkWarranty(f: CaseFacts, asOf: ISODateTime, months: number): WarrantyCheck {
  if (f.rework) return { within: false, reason: 'nachbesserung_gescheitert' };
  const repair = f.bookings.reparatur;
  if (!repair || repair.status !== 'erledigt' || !repair.completedAt) {
    return { within: false, reason: 'keine_reparatur' };
  }
  const until = addMonths(repair.completedAt, months);
  if (Date.parse(asOf) > Date.parse(until)) return { within: false, reason: 'abgelaufen', until };
  return {
    within: true,
    rework: {
      repairBookingId: repair.id,
      provider: { ...repair.provider },
      completedAt: repair.completedAt,
      until,
    },
  };
}
