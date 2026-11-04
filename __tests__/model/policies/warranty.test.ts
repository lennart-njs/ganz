// Gesetzliche Gewährleistung für eine Reparatur (Entscheidung Nr. 32, model/policies/warranty.ts)
import type { CaseFacts } from '@/model/policies/caseFacts';
import { addMonths, checkWarranty } from '@/model/policies/warranty';
import type { Booking, Rework } from '@/model/types';

const DONE = '2026-11-04T10:00:00.000Z';

function repair(extra: Partial<Booking> = {}): Booking {
  return {
    id: 'termin-1',
    caseId: 'GS-1',
    kind: 'reparatur',
    provider: { id: 'brandt', kind: 'betrieb', name: 'Hausgeräte Brandt', authorized: true },
    slotLabel: 'Mo vormittags',
    status: 'erledigt',
    subjectToApproval: false,
    completedAt: DONE,
    createdAt: '2026-11-01T10:00:00.000Z',
    ...extra,
  };
}

function facts(extra: Partial<CaseFacts> = {}): CaseFacts {
  const b = repair();
  return {
    caseId: 'GS-1',
    status: 'in_reparatur',
    closed: false,
    paused: false,
    hasContract: true,
    deductible: 5000,
    claim: 'freigegeben',
    bookings: { reparatur: b },
    booking: b,
    bookingOpen: false,
    activeConsents: [],
    replacement: false,
    ...extra,
  };
}

describe('addMonths', () => {
  test('Monate in UTC, am Monatsende der letzte Tag', () => {
    expect(addMonths(DONE, 24)).toBe('2028-11-04T10:00:00.000Z');
    expect(addMonths('2026-01-31T00:00:00.000Z', 1)).toBe('2026-02-28T00:00:00.000Z');
    expect(addMonths('2028-02-29T12:00:00.000Z', 12)).toBe('2029-02-28T12:00:00.000Z');
    expect(addMonths('2026-10-31T23:00:00.000Z', 24)).toBe('2028-10-31T23:00:00.000Z');
  });
});

describe('checkWarranty', () => {
  test('innerhalb der Frist: Nachbesserung beim selben Betrieb, bis einschließlich zum Ende', () => {
    const until = '2028-11-04T10:00:00.000Z';
    for (const asOf of [DONE, '2027-06-01T00:00:00.000Z', until]) {
      expect(checkWarranty(facts(), asOf, 24)).toEqual({
        within: true,
        rework: {
          repairBookingId: 'termin-1',
          provider: repair().provider,
          completedAt: DONE,
          until,
        },
      });
    }
  });

  test('nach der Frist: neue Runde, mit dem Ende der Frist', () => {
    expect(checkWarranty(facts(), '2028-11-04T10:00:01.000Z', 24)).toEqual({
      within: false,
      reason: 'abgelaufen',
      until: '2028-11-04T10:00:00.000Z',
    });
    // Die Frist kommt vom Aufrufer, hier ein Jahr
    expect(checkWarranty(facts(), '2028-01-01T00:00:00.000Z', 12)).toMatchObject({
      within: false,
      reason: 'abgelaufen',
    });
  });

  test('schon die Nachbesserung half nicht: neue Runde, keine zweite Nachbesserung', () => {
    const rework: Rework = {
      repairBookingId: 'termin-0',
      provider: repair().provider,
      completedAt: DONE,
      until: '2028-11-04T10:00:00.000Z',
      claimedAt: DONE,
    };
    expect(checkWarranty(facts({ status: 'nachbesserung', rework }), DONE, 24)).toEqual({
      within: false,
      reason: 'nachbesserung_gescheitert',
    });
  });

  test('ohne erledigte Reparatur mit Abschluss: neue Runde wie vor Nr. 32', () => {
    const without = (b: Booking | undefined) =>
      checkWarranty(facts({ bookings: b ? { reparatur: b } : {}, booking: b }), DONE, 24);
    expect(without(undefined)).toEqual({ within: false, reason: 'keine_reparatur' });
    expect(without(repair({ status: 'unterwegs' }))).toMatchObject({ reason: 'keine_reparatur' });
    // Ein Stand von vor Nr. 32 speicherte den Abschluss nicht
    expect(without(repair({ completedAt: undefined }))).toMatchObject({
      reason: 'keine_reparatur',
    });
    // Eine Vor-Ort-Diagnose ist keine Reparatur
    const visit = repair({ kind: 'vor_ort_diagnose' });
    expect(
      checkWarranty(facts({ bookings: { vor_ort_diagnose: visit }, booking: visit }), DONE, 24),
    ).toMatchObject({ reason: 'keine_reparatur' });
  });
});
