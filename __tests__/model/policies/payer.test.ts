import type { CaseFacts } from '@/model/policies/caseFacts';
import { amountDue, bindsAfterApproval, bookingCosts } from '@/model/policies/payer';
import type { Booking, BookingStatus, CaseStatus, Quote } from '@/model/types';

const NOW = '2026-11-03T10:00:00+01:00';
const DEDUCTIBLE = 5000;

const quote: Quote = {
  id: 'angebot-1',
  caseId: 'GS-1',
  createdBy: { kind: 'fachkraft', name: 'Fachkraft' },
  repair: { partName: 'Pumpe', originalPart: true, parts: 9000, labor: 9900, total: 18900 },
  replacement: { total: 89900, note: '' },
  saving: 71000,
  payer: { kind: 'versicherer', name: 'Versicherer' },
  deductible: 0,
  isExample: true,
  createdAt: NOW,
};

function repairBooking(status: BookingStatus): Partial<CaseFacts> {
  const b: Booking = {
    id: `termin-${status}`,
    caseId: 'GS-1',
    kind: 'reparatur',
    provider: { id: 'betrieb-1', kind: 'betrieb', name: 'Betrieb', authorized: true },
    slotLabel: 'Mo vormittags',
    status,
    subjectToApproval: false,
    createdAt: NOW,
  };
  return { bookings: { reparatur: b }, booking: b, bookingOpen: status !== 'erledigt' };
}

function facts(status: CaseStatus, extra: Partial<CaseFacts> = {}): CaseFacts {
  return {
    caseId: 'GS-1',
    status,
    closed: status === 'erledigt' || status === 'abgebrochen',
    paused: false,
    hasContract: false,
    deductible: 0,
    claim: 'keiner',
    bookings: {},
    bookingOpen: false,
    activeConsents: [],
    dealerShared: false,
    replacement: false,
    ...extra,
  };
}

const insured = { hasContract: true, quote };

describe('Wer den Termin zahlt (model/policies/payer.ts)', () => {
  // [Fall, Art, selbst zahlen gewählt, erwartete Kosten]
  const table: [string, CaseFacts, 'reparatur' | 'vor_ort_diagnose', boolean, unknown][] = [
    [
      'ohne Schutz: du zahlst den Preis',
      facts('eskaliert', { quote, payer: 'haushalt' }),
      'reparatur',
      true,
      { payer: 'haushalt', amount: 18900 },
    ],
    [
      'mit Schutz vor der Meldung, selbst zahlen gewählt: du zahlst den Preis',
      facts('eskaliert', insured),
      'reparatur',
      true,
      { payer: 'haushalt', amount: 18900 },
    ],
    [
      'während der Prüfung: vorbehaltlich, auch mit zahlung=selbst (R-07)',
      facts('freigabe_noetig', { ...insured, claim: 'in_pruefung' }),
      'reparatur',
      true,
      { payer: 'versicherer', approved: false, deductible: DEDUCTIBLE },
    ],
    [
      'nach der Freigabe: Versicherer zahlt, du die Selbstbeteiligung',
      facts('freigegeben', { ...insured, claim: 'freigegeben', payer: 'versicherer' }),
      'reparatur',
      false,
      { payer: 'versicherer', approved: true, deductible: DEDUCTIBLE },
    ],
    [
      'nach der Ablehnung, selbst zahlen gewählt: du zahlst den Preis',
      facts('abgelehnt', { ...insured, claim: 'abgelehnt' }),
      'reparatur',
      true,
      { payer: 'haushalt', amount: 18900 },
    ],
    [
      'nach der Ablehnung ohne Wahl: kein Termin auf Kosten des Versicherers (R-09)',
      facts('abgelehnt', { ...insured, claim: 'abgelehnt' }),
      'reparatur',
      false,
      undefined,
    ],
    [
      'mit Schutz vor der Meldung ohne Wahl: noch kein Zahler, kein Termin',
      facts('eskaliert', insured),
      'reparatur',
      false,
      undefined,
    ],
    [
      'in der Reparatur mit Termin: kein zweiter, also keine Kosten',
      facts('in_reparatur', { quote, payer: 'haushalt', ...repairBooking('bestaetigt') }),
      'reparatur',
      true,
      undefined,
    ],
    [
      'Vor-Ort-Diagnose: du zahlst den Besuch, der Preis ist noch offen',
      facts('eskaliert'),
      'vor_ort_diagnose',
      false,
      { payer: 'haushalt' },
    ],
    [
      'Vor-Ort-Diagnose mit Kostenvoranschlag: gibt es nicht mehr',
      facts('eskaliert', { quote }),
      'vor_ort_diagnose',
      false,
      undefined,
    ],
  ];

  test.each(table)('%s', (_name, f, kind, selfPay, expected) => {
    expect(bookingCosts(f, kind, selfPay, DEDUCTIBLE)).toEqual(expected);
  });

  test('„Du zahlst“ nur, wo der Haushalt zahlt: ohne Fakten keine Kosten', () => {
    expect(bookingCosts(undefined, 'reparatur', true, DEDUCTIBLE)).toBeUndefined();
  });

  // Entscheidung Nr. 31: Während der Prüfung ist die Anfrage unverbindlich. Die Selbstbeteiligung
  // ist erst nach der Freigabe ein Betrag, den du mit der Buchung zahlst. Vorher galt sie schon.
  test('was der Haushalt zahlt: Preis, Selbstbeteiligung nach der Freigabe oder nichts', () => {
    expect(amountDue({ payer: 'haushalt', amount: 18900 })).toBe(18900);
    expect(amountDue({ payer: 'haushalt' })).toBe(0);
    expect(amountDue({ payer: 'versicherer', approved: true, deductible: 5000 })).toBe(5000);
    expect(amountDue({ payer: 'versicherer', approved: false, deductible: 5000 })).toBe(0);
    expect(amountDue({ payer: 'versicherer', approved: false, deductible: 0 })).toBe(0);
    expect(amountDue(undefined)).toBe(0);
  });

  test('verbindlich erst nach der Freigabe: nur während der Prüfung und nur über 0 € (Nr. 31)', () => {
    expect(bindsAfterApproval({ payer: 'versicherer', approved: false, deductible: 5000 })).toBe(
      true,
    );
    expect(bindsAfterApproval({ payer: 'versicherer', approved: false, deductible: 0 })).toBe(
      false,
    );
    expect(bindsAfterApproval({ payer: 'versicherer', approved: true, deductible: 5000 })).toBe(
      false,
    );
    expect(bindsAfterApproval({ payer: 'haushalt', amount: 18900 })).toBe(false);
    expect(bindsAfterApproval(undefined)).toBe(false);
  });
});
