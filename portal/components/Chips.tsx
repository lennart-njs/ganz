import { de } from '@/i18n/de';
import type { WorkflowStatus } from '@/model/portal';

import type { Sla } from '../lib/sla';
import { initials } from '../lib/view';

const t = de.portal;

const tone: Record<WorkflowStatus, string> = {
  neu: 'accent',
  wartet_uns: 'ink',
  wartet_kunde: '',
  termin: 'ok',
  erledigt: 'muted',
};

export function WorkflowChip({
  status,
  revoked,
  cancelled,
}: {
  status: WorkflowStatus;
  revoked?: boolean;
  cancelled?: boolean;
}) {
  if (revoked) return <span className="chip muted">{t.revoked}</span>;
  if (cancelled) return <span className="chip muted">{t.cancelled}</span>;
  return (
    <span className={`chip ${tone[status]}`}>
      {status === 'neu' ? <span className="dot" aria-hidden /> : null}
      {t.workflow[status]}
    </span>
  );
}

export function SlaChip({ sla }: { sla: Pick<Sla, 'tone' | 'label'> | null | undefined }) {
  if (!sla) return null;
  return (
    <span className={`chip sla ${sla.tone}`}>
      <span className="dot" aria-hidden />
      <span className="sr">{t.sla.label}: </span>
      {sla.label}
    </span>
  );
}

export function Avatar({ name, size }: { name?: string; size?: 'sm' }) {
  if (!name) return <span className={`avatar none${size ? ` ${size}` : ''}`} aria-hidden />;
  return (
    <span className={`avatar${size ? ` ${size}` : ''}`} title={name} aria-hidden>
      {initials(name)}
    </span>
  );
}
