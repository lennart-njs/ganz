// Fristenampel: erste Reaktion auf neue Fälle, Antwort auf die Kundschaft (Regeln des Händlers).
import { de } from '@/i18n/de';
import type { DealerSettings } from '@/model/portal';
import type { SharedCaseRecord } from '@/model/sharing';

const MIN = 60_000;
const H = 60 * MIN;
const t = de.portal;

export type SlaTone = 'ok' | 'warn' | 'over';
export interface Sla {
  tone: SlaTone;
  label: string;
  dueAt: string;
  /** Millisekunden bis zur Frist, negativ: überfällig */
  left: number;
}

/** „35 Min.“, „5 Std.“, „3 Tage“ */
export function duration(ms: number): string {
  const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return t.duration.min(m);
  const h = Math.round(ms / H);
  if (h < 48) return t.duration.h(h);
  return t.duration.d(Math.round(ms / (24 * H)));
}

export function sla(
  r: SharedCaseRecord,
  rules: DealerSettings['rules'],
  now = Date.now(),
): Sla | null {
  const wf = r.workflow;
  if (!wf || r.revokedAt) return null;
  let start: string;
  let hours: number;
  if (wf.status === 'neu') {
    start = r.file.sharedAt;
    hours = rules.slaFirstHours;
  } else if (wf.status === 'wartet_uns') {
    start = wf.lastCustomerAt ?? wf.since;
    hours = rules.slaReplyHours;
  } else return null;
  const due = Date.parse(start) + hours * H;
  const left = due - now;
  const tone: SlaTone = left < 0 ? 'over' : left < Math.max(hours * H * 0.25, H) ? 'warn' : 'ok';
  return {
    tone,
    left,
    dueAt: new Date(due).toISOString(),
    label: left < 0 ? t.sla.overdue(duration(-left)) : t.sla.left(duration(left)),
  };
}
