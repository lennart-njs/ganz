// „Als Nächstes“ in der Fallakte: ein Schritt, der den Fall weiterbringt
import type { DealerSettings } from '@/model/portal';
import type { RetailerDecision, SharedCaseRecord } from '@/model/sharing';

import { warrantyCheck } from './check';
import { decisionOf } from './view';

export type NextStep =
  | { kind: 'annehmen' }
  | { kind: 'entscheiden'; decision: RetailerDecision }
  | { kind: 'antworten' }
  | { kind: 'termin' }
  | { kind: 'abschliessen' }
  | { kind: 'warten' }
  | { kind: 'erledigt' };

export function nextStep(r: SharedCaseRecord, s: DealerSettings): NextStep | undefined {
  if (r.revokedAt) return undefined;
  const status = r.workflow?.status ?? 'neu';
  if (status === 'erledigt') return { kind: 'erledigt' };
  if (status === 'neu') return { kind: 'annehmen' };
  const decision = decisionOf(r);
  if (!decision) return { kind: 'entscheiden', decision: warrantyCheck(r.file, s.rules).verdict };
  if (status === 'termin') return { kind: 'abschliessen' };
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
