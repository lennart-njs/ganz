// Fakten eines Falls: eine kleine, reine Struktur, aus der die Regeln in actions.ts lesen.
// Screens fragen can() und availableActions(), statt selbst den Status zu vergleichen.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import { findActiveConsent, isClosed } from '../caseMachine';
import { currentBookings, earlierRounds, isFinding } from './rounds';
import type {
  Booking,
  Case,
  CaseStatus,
  Consent,
  ConsentPurpose,
  Contract,
  Device,
  Diagnosis,
  GuideRun,
  Id,
  Quote,
  VideoSession,
} from '../types';

export type BookingKind = Booking['kind'];

/** Stand des Schadenfalls */
export type ClaimState = 'keiner' | 'in_pruefung' | 'freigegeben' | 'abgelehnt';

/** Wer die Reparatur zahlt, sobald es feststeht */
export type PayerKind = 'versicherer' | 'haushalt';

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
  /** Kostenvoranschlag der laufenden Runde (model/policies/rounds.ts) */
  quote?: Quote;
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
  if (claim === 'freigegeben') return 'versicherer';
  if (claim === 'in_pruefung') return undefined;
  // Ohne Freigabe in der Reparatur: Der Haushalt hat selbst zahlen gewählt
  if ((c.status === 'in_reparatur' || c.status === 'erledigt') && repair) return 'haushalt';
  if (quote && !hasContract) return 'haushalt';
  return undefined;
}

/**
 * Übergangsregel für den Widerruf bei lit. b, bis Entscheidung Nr. 16 steht: Die Entscheidung des
 * Versicherers braucht weitergabe_versicherer, jeder Schritt des Betriebs weitergabe_betrieb an
 * genau den gebuchten Betrieb. Gibt den Zweck zurück, dessen Bestätigung fehlt.
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
  if (!booking || booking.status === 'erledigt') return undefined;
  const ok = findActiveConsent(
    consents,
    c.reportedBy,
    'weitergabe_betrieb',
    c.id,
    booking.provider.id,
  );
  return ok ? undefined : 'weitergabe_betrieb';
}

/** Die Fakten eines Falls. Ohne den Fall: undefined. */
export function selectCaseFacts(s: CaseFactsSource, caseId: Id): CaseFacts | undefined {
  const c = s.cases[caseId];
  if (!c) return undefined;
  const device = s.devices.find((d) => d.id === c.deviceId);
  const hasContract = !!device?.contractId && s.contracts.some((k) => k.id === device.contractId);
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
    quote,
    claim,
    payer: payerOf(c, claim, hasContract, quote, bookings.reparatur),
    bookings,
    booking,
    bookingOpen: !!booking && booking.status !== 'erledigt',
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
