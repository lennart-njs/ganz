// Runden eines Falls. „Problem besteht weiter“ beendet eine Runde, danach geht es wieder über
// Hilfe holen, Befund, Kosten und Termin (REVIEW 5, Soll-Flow). In der Gewährleistung ist die
// neue Runde eine Nachbesserung beim selben Betrieb, ohne Schadenfall und ohne Kosten (Nr. 32,
// model/policies/warranty.ts). Befund, Kostenvoranschlag,
// Schadenfall und Termine der alten Runde bleiben im Fall, zählen für die Regeln aber nicht mehr.
// Sonst bliebe der Fall nach einer misslungenen Reparatur stehen: Der erledigte Termin zählte
// weiter, und es gäbe weder Kosten noch einen neuen Termin.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import type { Booking, Case, Diagnosis, Id, ISODateTime } from '../types';

/** Befund von Fachkraft oder Betrieb, nicht das Ergebnis der Intelligenten Fehlererkennung */
export const isFinding = (d: Diagnosis | undefined): d is Diagnosis =>
  d?.source === 'fachkraft' || d?.source === 'betrieb';

/** Termine und Befunde aus früheren Runden */
export function earlierRounds(c: Case): { bookings: Set<Id>; findings: Set<Id> } {
  const rounds = c.rounds ?? [];
  return {
    bookings: new Set(rounds.flatMap((r) => r.bookingIds)),
    findings: new Set(rounds.flatMap((r) => r.findingIds)),
  };
}

/** Termine des Falls in der laufenden Runde, in der Reihenfolge des Speichers */
export function currentBookings(c: Case, bookings: readonly Booking[]): Booking[] {
  const earlier = earlierRounds(c).bookings;
  return bookings.filter((b) => b.caseId === c.id && !earlier.has(b.id));
}

/**
 * Schließt die laufende Runde ab: Kostenvoranschlag, Schadenfall, Termine und Befunde wandern in
 * c.rounds. Der Fall selbst hat danach weder Kostenvoranschlag noch Schadenfall. War die Runde eine
 * Nachbesserung (Nr. 32), steht das an der Runde. Beginnt danach eine Nachbesserung, setzt der
 * Aufrufer c.rework für die neue Runde.
 */
export function closeRound(
  c: Case,
  s: { bookings: readonly Booking[]; diagnoses: readonly Diagnosis[] },
  at: ISODateTime,
): Case {
  const earlier = earlierRounds(c);
  const findingIds = c.diagnosisIds.filter(
    (id) => !earlier.findings.has(id) && isFinding(s.diagnoses.find((d) => d.id === id)),
  );
  return {
    ...c,
    quoteId: undefined,
    claim: undefined,
    rework: undefined,
    rounds: [
      ...(c.rounds ?? []),
      {
        endedAt: at,
        quoteId: c.quoteId,
        claim: c.claim,
        bookingIds: currentBookings(c, s.bookings).map((b) => b.id),
        findingIds,
        ...(c.rework ? { rework: c.rework } : {}),
      },
    ],
  };
}
