// Fakten eines Falls: eine kleine, reine Struktur, aus der die Regeln in actions.ts lesen.
// Screens fragen can() und availableActions(), statt selbst den Status zu vergleichen.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import { findActiveConsent, isClosed } from '../caseMachine';
import { isOrdered } from './bookingRules';
import { currentBookings, earlierRounds, isFinding } from './rounds';
import type {
  Booking,
  Case,
  CaseStatus,
  Cents,
  Consent,
  ConsentPurpose,
  Contract,
  Device,
  Diagnosis,
  GuideRun,
  Id,
  Quote,
  Rework,
  VideoSession,
} from '../types';

export type BookingKind = Booking['kind'];

/** Stand des Schadenfalls */
export type ClaimState = 'keiner' | 'in_pruefung' | 'freigegeben' | 'abgelehnt';

/**
 * Wer die Reparatur zahlt, sobald es feststeht. Bei der Nachbesserung in der Gewährleistung trägt
 * der Betrieb die Kosten (§ 635 Abs. 2 BGB, Nr. 32).
 */
export type PayerKind = 'versicherer' | 'haushalt' | 'betrieb';

/** Was du mit „Zahlungspflichtig buchen“ zahlst: die Selbstbeteiligung oder den Preis des Betriebs */
export type BindingReason = 'selbstbeteiligung' | 'preis';

/**
 * Ein Termin, der auf deinen Tap „Zahlungspflichtig buchen“ wartet (Entscheidungen Nr. 31 und
 * Nr. 33). Die Anfrage war unverbindlich. Jetzt steht fest, was du zahlst: nach der Freigabe die
 * Selbstbeteiligung über 0 €, bei der Vor-Ort-Diagnose der Preis, den der Betrieb genannt hat.
 */
export interface BindingDue {
  booking: Booking;
  amount: Cents;
  reason: BindingReason;
}

/** Weitergaben, ohne die Versicherer und Betrieb nicht weitermachen (R-12) */
export type HoldPurpose = Extract<ConsentPurpose, 'weitergabe_versicherer' | 'weitergabe_betrieb'>;

/** Was selectCaseFacts liest. AppData aus dem Store passt dazu, ohne dass model/ den Store kennt. */
export interface CaseFactsSource {
  cases: Readonly<Record<Id, Case>>;
  devices: readonly Device[];
  contracts: readonly Contract[];
  quotes: readonly Quote[];
  bookings: readonly Booking[];
  videoSessions: readonly VideoSession[];
  consents: readonly Consent[];
  guideRuns: Readonly<Record<Id, GuideRun>>;
  diagnoses: readonly Diagnosis[];
}

export interface CaseFacts {
  caseId: Id;
  status: CaseStatus;
  /** erledigt oder abgebrochen */
  closed: boolean;
  /**
   * Wie der Fall geschlossen ist. „Erledigt“ bleibt erledigt, auch wenn er sich gerade nicht
   * wieder öffnen lässt, weil für das Gerät ein anderer Fall offen ist.
   */
  closedAs?: 'erledigt' | 'abgebrochen';
  /** „Später weitermachen“ */
  paused: boolean;
  /** Das Gerät hat einen verknüpften Schutz */
  hasContract: boolean;
  /** Selbstbeteiligung aus dem Vertrag des Geräts. Ohne Schutz 0. */
  deductible: Cents;
  /** Kostenvoranschlag der laufenden Runde (model/policies/rounds.ts) */
  quote?: Quote;
  /**
   * Die laufende Runde ist eine Nachbesserung in der Gewährleistung (Nr. 32): derselbe Betrieb,
   * kein Schadenfall, kein Betrag für den Haushalt.
   */
  rework?: Rework;
  claim: ClaimState;
  /** Wer zahlt. Offen, solange der Versicherer prüft oder du noch entscheidest. */
  payer?: PayerKind;
  /**
   * Neuester Termin je Art, der zählt: aus der laufenden Runde, nicht storniert und nicht verfallen.
   * Ein erledigter zählt. Ein Termin vorbehaltlich Freigabe verfällt mit der Ablehnung, solange er
   * nur angefragt ist. Termine aus einer Runde vor „Problem besteht weiter“ zählen nicht mehr.
   */
  bookings: Partial<Record<BookingKind, Booking>>;
  /** Neuester Termin, der zählt, gleich welcher Art */
  booking?: Booking;
  /** Dieser Termin ist noch nicht erledigt */
  bookingOpen: boolean;
  /**
   * Der Betrieb hat den Auftrag (Nr. 34, isOrdered in bookingRules.ts): Er hat den Termin
   * bestätigt, du hast verbindlich gebucht, oder die Reparatur ist geplant. Brichst du ab, bekommt
   * er die Absage, und ob schon Kosten entstanden sind, klärt er mit dir. Fehlt bei einer
   * unverbindlichen Anfrage.
   */
  order?: Booking;
  /**
   * Der Termin wartet auf „Zahlungspflichtig buchen“ (Nr. 31, Nr. 33). Bis zu diesem Tap bestätigt
   * der Betrieb ihn nicht, auch nicht in der Simulation.
   */
  bindingDue?: BindingDue;
  /** Neuester Videocall oder Anfrage dazu */
  lastVideoSession?: VideoSession;
  /** Zwecke mit gültiger Bestätigung oder Einwilligung, für diesen Fall oder ohne Fall */
  activeConsents: ConsentPurpose[];
  /**
   * Die Weitergabe für den nächsten Schritt der Simulation fehlt (R-12). Dann geht nichts weiter,
   * bis du sie erneut bestätigst (weitergabe_erneuern).
   */
  hold?: HoldPurpose;
  /** Anleitung, die noch läuft */
  guideRun?: GuideRun;
  /** Wie die neueste Anleitung endete */
  guideOutcome?: GuideRun['outcome'];
  /** Neuester Befund von Fachkraft oder Betrieb in der laufenden Runde */
  finding?: Diagnosis;
  /** Der Befund sagt: Ersatzgerät nötig */
  replacement: boolean;
  /**
   * Ein anderer offener Fall desselben Geräts. Dann öffnet sich dieser Fall nicht wieder, denn
   * je Gerät gibt es höchstens einen offenen Fall (Entscheidung Nr. 13).
   */
  otherOpenCase?: Id;
}

function claimState(c: Case): ClaimState {
  if (!c.claim) return 'keiner';
  const result = c.claim.decision?.result;
  if (result === 'freigegeben') return 'freigegeben';
  if (result === 'abgelehnt') return 'abgelehnt';
  return 'in_pruefung';
}

/** Ein Termin vorbehaltlich Freigabe, der nach der Ablehnung nur angefragt ist, zählt nicht mehr */
function lapsed(b: Booking, claim: ClaimState): boolean {
  return claim === 'abgelehnt' && b.subjectToApproval && b.status === 'angefragt';
}

function payerOf(
  c: Case,
  claim: ClaimState,
  hasContract: boolean,
  quote: Quote | undefined,
  repair: Booking | undefined,
): PayerKind | undefined {
  // Nachbesserung: Der Betrieb trägt die Kosten, kein Schadenfall (Nr. 32)
  if (c.rework) return 'betrieb';
  if (claim === 'freigegeben') return 'versicherer';
  if (claim === 'in_pruefung') return undefined;
  // Ohne Freigabe in der Reparatur: Der Haushalt hat selbst zahlen gewählt
  if ((c.status === 'in_reparatur' || c.status === 'erledigt') && repair) return 'haushalt';
  if (quote && !hasContract) return 'haushalt';
  return undefined;
}

/**
 * Wartet ein Termin auf „Zahlungspflichtig buchen“? Nur ein angefragter, noch unverbindlicher
 * Termin, für den du jetzt einen festen Betrag zahlst, und nur dort, wo der Betrieb ihn als Nächstes
 * bestätigen würde. Ein Mechanismus für zwei Fälle:
 * - Reparatur nach der Freigabe (freigegeben) mit Selbstbeteiligung über 0 € (Nr. 31). Während der
 *   Prüfung bleibt die Anfrage unverbindlich, nach einer Ablehnung verfällt sie.
 * - Vor-Ort-Diagnose nach „Hilfe holen“ (eskaliert), sobald der Betrieb einen Preis über 0 €
 *   genannt hat (Nr. 33).
 * Selbstzahler binden sich schon mit der Buchung, der Preis steht davor.
 */
function bindingDueOf(
  c: Case,
  claim: ClaimState,
  deductible: Cents,
  bookings: Partial<Record<BookingKind, Booking>>,
): BindingDue | undefined {
  const open = (b: Booking | undefined): b is Booking =>
    !!b && b.status === 'angefragt' && !b.binding;
  const repair = bookings.reparatur;
  if (c.status === 'freigegeben' && claim === 'freigegeben' && open(repair) && deductible > 0) {
    return { booking: repair, amount: deductible, reason: 'selbstbeteiligung' };
  }
  const visit = bookings.vor_ort_diagnose;
  if (c.status === 'eskaliert' && open(visit) && visit.price !== undefined && visit.price > 0) {
    return { booking: visit, amount: visit.price, reason: 'preis' };
  }
  return undefined;
}

/**
 * Übergangsregel für den Widerruf bei lit. b, bis Entscheidung Nr. 16 steht: Die Entscheidung des
 * Versicherers braucht weitergabe_versicherer, jeder Schritt des Betriebs weitergabe_betrieb an
 * genau den gebuchten Betrieb. Die Nachbesserung (Nr. 32) braucht sie schon für den Termin, denn
 * dafür geht der Fall wieder an den Betrieb der Reparatur. Gibt den Zweck zurück, dessen
 * Bestätigung fehlt.
 */
function holdOf(
  c: Case,
  consents: readonly Consent[],
  booking: Booking | undefined,
): HoldPurpose | undefined {
  if (isClosed(c.status)) return undefined;
  if (c.status === 'freigabe_noetig') {
    const ok = findActiveConsent(consents, c.reportedBy, 'weitergabe_versicherer', c.id);
    return ok ? undefined : 'weitergabe_versicherer';
  }
  const provider = booking ? booking.provider : c.rework?.provider;
  if (!provider || booking?.status === 'erledigt') return undefined;
  const ok = findActiveConsent(consents, c.reportedBy, 'weitergabe_betrieb', c.id, provider.id);
  return ok ? undefined : 'weitergabe_betrieb';
}

/** Die Fakten eines Falls. Ohne den Fall: undefined. */
export function selectCaseFacts(s: CaseFactsSource, caseId: Id): CaseFacts | undefined {
  const c = s.cases[caseId];
  if (!c) return undefined;
  const device = s.devices.find((d) => d.id === c.deviceId);
  const contract = device?.contractId
    ? s.contracts.find((k) => k.id === device.contractId)
    : undefined;
  const hasContract = !!contract;
  const deductible = contract?.deductible ?? 0;
  const quote = c.quoteId ? s.quotes.find((q) => q.id === c.quoteId) : undefined;
  const claim = claimState(c);

  const counting = currentBookings(c, s.bookings).filter(
    (b) => b.status !== 'storniert' && !lapsed(b, claim),
  );
  const bookings: Partial<Record<BookingKind, Booking>> = {};
  for (const b of counting) bookings[b.kind] = b;
  const booking = counting.at(-1);

  const activeConsents = [
    ...new Set(
      s.consents
        .filter(
          (k) =>
            k.personId === c.reportedBy &&
            !k.revokedAt &&
            (k.caseId === undefined || k.caseId === caseId),
        )
        .map((k) => k.purpose),
    ),
  ];

  const runs = c.guideRunIds.map((id) => s.guideRuns[id]).filter((r): r is GuideRun => !!r);
  const lastRun = runs.at(-1);
  const earlier = earlierRounds(c).findings;
  const finding = [...c.diagnosisIds]
    .reverse()
    .filter((id) => !earlier.has(id))
    .map((id) => s.diagnoses.find((d) => d.id === id))
    .find(isFinding);

  return {
    caseId,
    status: c.status,
    closed: isClosed(c.status),
    closedAs: c.status === 'erledigt' || c.status === 'abgebrochen' ? c.status : undefined,
    paused: !!c.pausedAt,
    hasContract,
    deductible,
    quote,
    rework: c.rework,
    claim,
    payer: payerOf(c, claim, hasContract, quote, bookings.reparatur),
    bookings,
    booking,
    bookingOpen: !!booking && booking.status !== 'erledigt',
    order: booking && isOrdered(c, booking) ? booking : undefined,
    bindingDue: bindingDueOf(c, claim, deductible, bookings),
    lastVideoSession: s.videoSessions.filter((v) => v.caseId === caseId).at(-1),
    activeConsents,
    hold: holdOf(c, s.consents, booking),
    guideRun: lastRun && !lastRun.endedAt ? lastRun : undefined,
    guideOutcome: lastRun?.outcome,
    finding,
    replacement: finding?.errorPattern === 'ersatzgeraet_noetig',
    otherOpenCase: Object.values(s.cases).find(
      (o) => o.id !== caseId && o.deviceId === c.deviceId && !isClosed(o.status),
    )?.id,
  };
}
