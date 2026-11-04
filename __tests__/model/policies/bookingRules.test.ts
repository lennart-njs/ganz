import { booked, bookingAction, planBooking } from '@/model/policies/bookingRules';
import type { CaseFacts } from '@/model/policies/caseFacts';
import type { Booking, BookingStatus, CaseStatus } from '@/model/types';

const NOW = '2026-11-03T10:00:00+01:00';

function booking(
  id: string,
  kind: Booking['kind'],
  status: BookingStatus,
  extra: Partial<Booking> = {},
): Booking {
  return {
    id,
    caseId: 'GS-1',
    kind,
    provider: { id: 'betrieb-1', kind: 'betrieb', name: 'Betrieb', authorized: true },
    slotLabel: 'Mo vormittags',
    status,
    subjectToApproval: false,
    createdAt: NOW,
    ...extra,
  };
}

function facts(status: CaseStatus, extra: Partial<CaseFacts> = {}): CaseFacts {
  return {
    caseId: 'GS-1',
    status,
    closed: false,
    paused: false,
    hasContract: true,
    deductible: 0,
    claim: 'keiner',
    bookings: {},
    bookingOpen: false,
    activeConsents: [],
    replacement: false,
    ...extra,
  };
}

describe('Termin-Regeln (model/policies/bookingRules.ts)', () => {
  test('die Regel je Art: Diagnose, Reparatur selbst gezahlt oder über den Versicherer', () => {
    expect(bookingAction('vor_ort_diagnose', false)).toBe('termin_diagnose');
    expect(bookingAction('reparatur', true)).toBe('termin_selbst');
    expect(bookingAction('reparatur', false)).toBe('termin_versicherer');
    expect(bookingAction('ersatzteil_versand', false)).toBeUndefined();
  });

  test.each<BookingStatus>(['angefragt', 'bestaetigt', 'unterwegs', 'erledigt'])(
    'ein Termin, der zählt (%s): kein zweiter derselben Art (R-08)',
    (status) => {
      const b = booking('termin-1', 'reparatur', status);
      const f = facts('in_reparatur', { bookings: { reparatur: b }, booking: b });
      expect(booked(f, 'reparatur')).toBe(true);
      expect(planBooking(f, [b], 'reparatur', true)).toEqual({
        ok: false,
        refusal: { code: 'termin_laeuft', kind: 'reparatur' },
      });
    },
  );

  test('eine andere Art ist frei: Teileversand neben der Reparatur', () => {
    const b = booking('termin-1', 'reparatur', 'bestaetigt');
    const f = facts('in_reparatur', { bookings: { reparatur: b }, booking: b });
    expect(booked(f, 'ersatzteil_versand')).toBe(false);
    expect(planBooking(f, [b], 'ersatzteil_versand', false)).toEqual({
      ok: true,
      value: { action: undefined, replaces: [], subjectToApproval: false },
    });
  });

  test('während der Prüfung: vorbehaltlich Freigabe', () => {
    const f = facts('freigabe_noetig', { claim: 'in_pruefung' });
    expect(planBooking(f, [], 'reparatur', false)).toEqual({
      ok: true,
      value: { action: 'termin_versicherer', replaces: [], subjectToApproval: true },
    });
  });

  test('umbuchen nach der Ablehnung: der verfallene Termin wird storniert, ein neuer angelegt', () => {
    // Verfallen: vorbehaltlich Freigabe angefragt, dann abgelehnt. Er zählt nicht mehr.
    const lapsed = booking('termin-1', 'reparatur', 'angefragt', { subjectToApproval: true });
    const other = { ...booking('termin-2', 'reparatur', 'angefragt'), caseId: 'GS-2' };
    const cancelled = booking('termin-0', 'reparatur', 'storniert');
    const f = facts('abgelehnt', { claim: 'abgelehnt' });
    expect(planBooking(f, [cancelled, lapsed, other], 'reparatur', true)).toEqual({
      ok: true,
      value: { action: 'termin_selbst', replaces: ['termin-1'], subjectToApproval: false },
    });
  });

  test('die Reparatur ersetzt eine angefragte Vor-Ort-Diagnose, eine erledigte bleibt', () => {
    const requested = booking('termin-1', 'vor_ort_diagnose', 'angefragt');
    const f = facts('eskaliert', { bookings: { vor_ort_diagnose: requested } });
    expect(planBooking(f, [requested], 'reparatur', true)).toMatchObject({
      ok: true,
      value: { replaces: ['termin-1'] },
    });
    const done = booking('termin-1', 'vor_ort_diagnose', 'erledigt');
    expect(
      planBooking({ ...f, bookings: { vor_ort_diagnose: done } }, [done], 'reparatur', true),
    ).toMatchObject({ ok: true, value: { replaces: [] } });
  });
});
