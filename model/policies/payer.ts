// Wer einen Termin zahlt. Eine Quelle für jede Kostenzeile: „Du zahlst …“ steht nur da, wo der
// Haushalt zahlt (ZUKUNFTSPLAN Phase 1, „Fachliche Fehler“). Während der Versicherer prüft, gibt
// es keinen Betrag als Zusage. Vor einer Selbstzahler-Buchung steht der Preis, er ist Pflicht.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import type { Cents } from '../types';
import { can } from './actions';
import type { BookingKind, CaseFacts } from './caseFacts';

/**
 * Kosten eines Termins, wie die Zusammenfassung sie nennt.
 * - haushalt mit amount: Du zahlst die Reparatur, der Preis steht vor dem Buchen.
 * - haushalt ohne amount: Du zahlst den Besuch, den Preis nennt der Betrieb vor dem Termin.
 * - versicherer: Der Versicherer zahlt, du die Selbstbeteiligung. Ohne approved erst nach der
 *   Freigabe, also vorbehaltlich.
 */
export type BookingCosts =
  | { readonly payer: 'haushalt'; readonly amount?: Cents }
  | { readonly payer: 'versicherer'; readonly approved: boolean; readonly deductible: Cents };

/**
 * Wer den geplanten Termin zahlt. Ohne Fakten oder wo es diesen Termin nicht gibt: undefined.
 * selfPay ist die Wahl „selbst zahlen“. Sie zählt nur, wo die Regel termin_selbst gilt.
 */
export function bookingCosts(
  f: CaseFacts | undefined,
  kind: BookingKind,
  selfPay: boolean,
  deductible: Cents,
): BookingCosts | undefined {
  if (!f) return undefined;
  // Die Vor-Ort-Diagnose bestellt der Haushalt beim Betrieb, noch ohne Schadenfall. Einen Preis
  // gibt es noch nicht, also auch keinen Betrag.
  if (kind === 'vor_ort_diagnose')
    return can(f, 'termin_diagnose') ? { payer: 'haushalt' } : undefined;
  if (kind !== 'reparatur') return undefined;
  if (selfPay && can(f, 'termin_selbst') && f.quote) {
    return { payer: 'haushalt', amount: f.quote.repair.total };
  }
  if (can(f, 'termin_versicherer')) {
    return { payer: 'versicherer', approved: f.payer === 'versicherer', deductible };
  }
  return undefined;
}

/** Was der Haushalt für den Termin zahlt. Ohne bekannten Preis: 0, der Betrieb nennt ihn vorher. */
export function amountDue(costs: BookingCosts | undefined): Cents {
  if (!costs) return 0;
  return costs.payer === 'haushalt' ? (costs.amount ?? 0) : costs.deductible;
}
