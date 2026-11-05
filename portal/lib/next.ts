// „Als Nächstes“ in der Fallakte: ein Schritt, der den Fall weiterbringt
import type { DealerSettings } from '@/model/portal';
import type { SharedCaseRecord } from '@/model/sharing';

import { warrantyCheck, type Verdict } from './check';
import type { PreviousRepair } from './rework';
import { decisionOf } from './view';

export type NextStep =
  | { kind: 'annehmen' }
  /** Entscheiden. Ohne Kaufdatum (offen) schlägt das Portal nichts vor, kein „Ablehnen“ als Knopf. */
  | { kind: 'entscheiden'; decision: Verdict }
  | { kind: 'antworten' }
  | { kind: 'termin' }
  /**
   * Der Termin steht. „Fall abschließen“ ist erst nach der Reparatur dran und darum kein großer
   * Knopf mehr (Portal-Prüfung 05.11.: Er stand schon vor der Reparatur da).
   */
  | { kind: 'termin_steht'; partner?: string; slot?: string }
  | { kind: 'warten' }
  /** Die Kundschaft hat den Fall in der App abgebrochen (Nr. 34) */
  | { kind: 'abgebrochen' }
  | { kind: 'erledigt' };

/** Der zuletzt bestätigte Termin: Betrieb und Zeitfenster */
export function appointmentOf(r: SharedCaseRecord): { partner?: string; slot?: string } {
  const booked = r.retailerEvents.findLast((e) => e.type === 'haendler_betrieb' && e.payload.slot);
  if (!booked) return {};
  return {
    partner: booked.payload.partnerName ? String(booked.payload.partnerName) : undefined,
    slot: String(booked.payload.slot),
  };
}

export function nextStep(
  r: SharedCaseRecord,
  s: DealerSettings,
  rework?: PreviousRepair,
): NextStep | undefined {
  if (r.revokedAt) return undefined;
  if (r.file.case.status === 'abgebrochen') return { kind: 'abgebrochen' };
  const status = r.workflow?.status ?? 'neu';
  if (status === 'erledigt') return { kind: 'erledigt' };
  if (status === 'neu') return { kind: 'annehmen' };
  const decision = decisionOf(r);
  if (!decision)
    return { kind: 'entscheiden', decision: warrantyCheck(r.file, s.rules, r, rework).verdict };
  if (status === 'termin') return { kind: 'termin_steht', ...appointmentOf(r) };
  const lastOurs = r.retailerEvents.filter((e) => !e.payload.auto).at(-1)?.at ?? '';
  const lastTheirs = r.workflow?.lastCustomerAt ?? '';
  if (status === 'wartet_uns' && lastTheirs > lastOurs) return { kind: 'antworten' };
  const repair = decision === 'gewaehrleistung' || decision === 'kulanz';
  const planned = r.retailerEvents.some(
    (e) => e.type === 'haendler_termin' || (e.type === 'haendler_betrieb' && e.payload.slot),
  );
  if (repair && !planned) return { kind: 'termin' };
  if (status === 'wartet_kunde') return { kind: 'warten' };
  return { kind: 'antworten' };
}
