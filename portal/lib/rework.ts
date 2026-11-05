// Nachbesserung erkennen (Portal-Idee 3): Kommt zum selben Gerät ein neuer Fall, und eine
// Reparatur dieses Händlers liegt weniger als die Frist zurück, ist er eine Nachbesserung:
// derselbe Betrieb, keine neuen Kosten. Gleiche Frist und Rechnung wie in der App
// (model/policies/warranty.ts, ganz Nr. 32): ab Abschluss der Reparatur, Annahme bis zur
// Antwort des Anwalts (Rechtsfrage 52).
import { demoConfig } from '@/config/demo.config';
import { addMonths } from '@/model/policies/warranty';
import type { SharedCaseRecord } from '@/model/sharing';

import { decisionOf } from './view';

export interface PreviousRepair {
  caseId: string;
  /** Abschluss der früheren Reparatur */
  doneAt: string;
  /** Ende der Gewährleistung auf sie */
  until: string;
}

/** Abschluss eines Falls mit Reparatur: „Fall abschließen“ oder erledigt nach einer Zusage */
function repairDoneAt(r: SharedCaseRecord): string | undefined {
  const decision = decisionOf(r);
  if (decision !== 'gewaehrleistung' && decision !== 'kulanz') return undefined;
  const closed = r.retailerEvents.findLast(
    (e) => e.type === 'haendler_status' && e.payload.status === 'abgeschlossen',
  );
  if (closed) return closed.at;
  return r.workflow?.status === 'erledigt' ? r.workflow.since : undefined;
}

export function previousRepair(
  r: SharedCaseRecord,
  all: readonly SharedCaseRecord[],
  months: number = demoConfig.warranty.repairMonths,
): PreviousRepair | undefined {
  const serial = r.file.device.serialNumber?.trim();
  if (!serial || r.revokedAt) return undefined;
  const asOf = Date.parse(r.file.case.createdAt);
  const found = all
    .filter((x) => x.file.caseId !== r.file.caseId && !x.revokedAt)
    .filter((x) => x.file.device.serialNumber?.trim() === serial)
    .map((x) => ({ caseId: x.file.caseId, doneAt: repairDoneAt(x) }))
    .filter((x): x is { caseId: string; doneAt: string } => !!x.doneAt)
    .filter((x) => Date.parse(x.doneAt) <= asOf)
    .map((x) => ({ ...x, until: addMonths(x.doneAt, months) }))
    .filter((x) => asOf <= Date.parse(x.until))
    .sort((a, b) => b.doneAt.localeCompare(a.doneAt));
  return found[0];
}
