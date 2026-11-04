// Regeln für Termine (ZUKUNFTSPLAN Phase 1, „Fachliche Fehler“). Höchstens ein Termin je Art, der
// zählt (R-08). Umbuchen storniert den alten Termin und legt einen neuen an, nichts wird
// überschrieben. Ob es den Termin überhaupt gibt, sagt die Regel aus actions.ts, etwa nach einer
// Ablehnung kein Termin auf Kosten des Versicherers (R-09). Screens und Store fragen dasselbe.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import { ok, refuse, type Result } from '../result';
import type { Booking, Case, Id } from '../types';
import type { ActionKey } from './actions';
import type { BookingKind, CaseFacts } from './caseFacts';
import { currentBookings } from './rounds';

/** Ein Termin, der noch läuft: angefragt, bestätigt oder unterwegs */
const running = (b: Booking) =>
  b.status === 'angefragt' || b.status === 'bestaetigt' || b.status === 'unterwegs';

/**
 * Hat der Betrieb den Auftrag schon (Entscheidung Nr. 34)? Ja, wenn er den Termin bestätigt hat,
 * wenn du zahlungspflichtig gebucht hast oder wenn die Reparatur geplant ist. Dann sagt ganz beim
 * Abbrechen nicht, dass keine Kosten entstehen (§ 648 BGB). Eine unverbindliche Anfrage ist kein
 * Auftrag.
 */
export function isOrdered(c: Case, b: Booking): boolean {
  if (!running(b)) return false;
  return !!b.binding || b.status !== 'angefragt' || c.status === 'in_reparatur';
}

/**
 * Termine, die ein Abbruch absagt (Nr. 34): jeder Termin der laufenden Runde, der noch läuft. Auch
 * eine verfallene Anfrage vorbehaltlich Freigabe, damit nach dem Abbruch kein Termin offen bleibt.
 * Der Betrieb bekommt nur die Absage. Dafür reicht die Weitergabe, mit der er den Termin bekam.
 */
export function bookingsToCancel(c: Case, bookings: readonly Booking[]): Booking[] {
  return currentBookings(c, bookings).filter(running);
}

/** Termin-Regel: höchstens ein Termin je Art, der zählt. Ein erledigter zählt mit. */
export function booked(f: CaseFacts, kind: BookingKind): boolean {
  return !!f.bookings[kind];
}

/** Die Regel aus actions.ts, die einen Termin dieser Art erlaubt. Der Teileversand hat keine. */
export function bookingAction(kind: BookingKind, selfPay: boolean): ActionKey | undefined {
  if (kind === 'vor_ort_diagnose') return 'termin_diagnose';
  if (kind === 'reparatur') return selfPay ? 'termin_selbst' : 'termin_versicherer';
  return undefined;
}

export interface BookingPlan {
  /** Regel, die der Store vor dem Buchen mit can() prüft */
  action?: ActionKey;
  /**
   * Angefragte Termine, die der neue ersetzt. Sie werden storniert: ein Termin derselben Art, der
   * nicht mehr zählt (vorbehaltlich Freigabe und abgelehnt), und eine angefragte Vor-Ort-Diagnose,
   * wenn die Reparatur gebucht wird. Dann liegt der Befund schon vor.
   */
  replaces: Id[];
  /** Der Versicherer prüft noch: Der Termin gilt vorbehaltlich Freigabe */
  subjectToApproval: boolean;
}

/**
 * Plan für einen neuen Termin. Läuft schon ein Termin dieser Art, der zählt, gibt es keinen
 * zweiten (R-08). Die Regel aus action prüft der Aufrufer mit can(), wie die Screens.
 */
export function planBooking(
  f: CaseFacts,
  bookings: readonly Booking[],
  kind: BookingKind,
  selfPay: boolean,
): Result<BookingPlan> {
  if (booked(f, kind)) return refuse({ code: 'termin_laeuft', kind });
  const replaces = bookings
    .filter(
      (b) =>
        b.caseId === f.caseId &&
        b.status === 'angefragt' &&
        (b.kind === kind || (kind === 'reparatur' && b.kind === 'vor_ort_diagnose')),
    )
    .map((b) => b.id);
  return ok({
    action: bookingAction(kind, selfPay),
    replaces,
    subjectToApproval: f.claim === 'in_pruefung',
  });
}
