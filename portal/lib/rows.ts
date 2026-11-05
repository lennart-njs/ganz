// Zeilen der Arbeitsliste: alles, was Liste und Tafel brauchen, schon lesbar
import 'server-only';

import { de } from '@/i18n/de';
import type { DealerSettings, WorkflowStatus } from '@/model/portal';
import type { SharedCaseRecord } from '@/model/sharing';

import { formatWhen } from './format';
import { sla, type SlaTone } from './sla';
import { decisionOf, lastMessage, member, unread } from './view';

export interface Row {
  id: string;
  sharedAt: string;
  when: string;
  customer: string;
  device: string;
  problem: string;
  status: WorkflowStatus;
  revoked: boolean;
  /** Die Kundschaft hat den Fall in der App abgebrochen (Nr. 34) */
  cancelled: boolean;
  assignee?: { id: string; name: string };
  sla?: { tone: SlaTone; label: string; left: number };
  unread: boolean;
  preview?: { text: string; fromCustomer: boolean };
  decision?: string;
  /** Kleingeschrieben: Fallnummer, Name, Gerät, Seriennummer, Problem */
  haystack: string;
}

export function toRows(cases: SharedCaseRecord[], s: DealerSettings): Row[] {
  const now = Date.now();
  return cases.map((r): Row => {
    const f = r.file;
    const revoked = !!r.revokedAt;
    const who = member(s, r.workflow?.assigneeId);
    const due = sla(r, s.rules, now);
    const last = lastMessage(r);
    const decision = decisionOf(r);
    return {
      id: f.caseId,
      sharedAt: f.sharedAt,
      when: formatWhen(f.sharedAt),
      customer: revoked ? '' : f.customer.name,
      device: revoked ? '' : `${f.device.manufacturer} ${f.device.model}`,
      problem: revoked ? '' : f.case.problemLabel,
      status: revoked ? 'erledigt' : (r.workflow?.status ?? 'neu'),
      revoked,
      cancelled: f.case.status === 'abgebrochen',
      assignee: who ? { id: who.id, name: who.name } : undefined,
      sla: due ? { tone: due.tone, label: due.label, left: due.left } : undefined,
      unread: unread(r),
      preview: last && !revoked ? { text: last.text, fromCustomer: last.fromCustomer } : undefined,
      decision: decision ? de.portal.decisions[decision] : undefined,
      haystack: [
        f.caseId,
        f.customer.name,
        f.device.manufacturer,
        f.device.model,
        f.device.serialNumber,
        f.device.materialNumber,
        f.case.problemLabel,
        f.customer.address?.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });
}
