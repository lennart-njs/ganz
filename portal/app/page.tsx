import { de } from '@/i18n/de';
import { workflowStatuses, type WorkflowStatus } from '@/model/portal';

import { Nav } from '../components/Nav';
import { Worklist } from '../components/Worklist';
import { getSettings, listCases } from '../lib/api';
import { toRows } from '../lib/rows';

const t = de.portal;

export const dynamic = 'force-dynamic';

export default async function Faelle({
  searchParams,
}: {
  searchParams: Promise<{ stand?: string; ansicht?: string }>;
}) {
  const { stand, ansicht } = await searchParams;
  const [{ tenant, cases }, { settings }] = await Promise.all([listCases(), getSettings()]);
  const rows = toRows(cases, settings);
  const queue = workflowStatuses.includes(stand as WorkflowStatus)
    ? (stand as WorkflowStatus)
    : stand === 'alle'
      ? 'alle'
      : undefined;
  const team = settings.team
    .filter((m) => m.active && m.role !== 'lesen')
    .map((m) => ({ id: m.id, name: m.name }));

  return (
    <>
      <Nav dealer={tenant.name} user={tenant.userName} current="faelle" />
      <Worklist
        title={t.list.title}
        rows={rows}
        team={team}
        me={tenant.memberId}
        initialQueue={queue}
        initialView={ansicht === 'tafel' ? 'tafel' : 'liste'}
      />
    </>
  );
}
