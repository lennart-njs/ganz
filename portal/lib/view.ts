// Kleine Helfer für Liste und Fallakte
import type { DealerSettings } from '@/model/portal';
import type { RetailerDecision, SharedCaseRecord } from '@/model/sharing';

export const initials = (name: string) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join('');

export const member = (s: DealerSettings, id: string | undefined) =>
  id ? s.team.find((m) => m.id === id) : undefined;

/** Hat die Kundschaft seit dem letzten Öffnen geschrieben? */
export function unread(r: SharedCaseRecord): boolean {
  const wf = r.workflow;
  if (!wf?.lastCustomerAt || r.revokedAt || wf.status === 'erledigt') return false;
  if (!wf.seenAt) return (r.file.messages?.length ?? 0) + r.file.answers.length > 0;
  return wf.lastCustomerAt > wf.seenAt;
}

export function decisionOf(r: SharedCaseRecord): RetailerDecision | undefined {
  return r.retailerEvents.findLast((e) => e.type === 'haendler_entscheidung')?.payload.decision as
    RetailerDecision | undefined;
}

/** Letzte Nachricht im Fall, für die Vorschau in der Liste */
export function lastMessage(
  r: SharedCaseRecord,
): { text: string; fromCustomer: boolean; at: string } | undefined {
  const own = r.retailerEvents
    .filter(
      (e) =>
        (e.type === 'haendler_nachricht' || e.type === 'haendler_rueckfrage') && !e.payload.auto,
    )
    .map((e) => ({
      text: String(e.payload.text ?? e.payload.question ?? ''),
      fromCustomer: false,
      at: e.at,
    }));
  const theirs = [
    ...(r.file.messages ?? []).map((m) => ({ text: m.text, fromCustomer: true, at: m.at })),
    ...r.file.answers.map((a) => ({ text: a.answer, fromCustomer: true, at: a.at })),
  ];
  return [...own, ...theirs].sort((a, b) => a.at.localeCompare(b.at)).at(-1);
}
