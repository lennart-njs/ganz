import Link from 'next/link';

import { de } from '@/i18n/de';

import { Nav } from '../components/Nav';
import { StateChip } from '../components/StateChip';
import { listCases } from '../lib/api';
import { formatWhen } from '../lib/format';
import { matches, retailerState, type Filter } from '../lib/state';

const t = de.portal;
const filters: Filter[] = ['alle', 'neu', 'offen', 'erledigt'];

export const dynamic = 'force-dynamic';

export default async function Faelle({
  searchParams,
}: {
  searchParams: Promise<{ stand?: string }>;
}) {
  const { stand } = await searchParams;
  const filter: Filter = filters.includes(stand as Filter) ? (stand as Filter) : 'alle';
  const { tenant, cases } = await listCases();
  const rows = cases.map((r) => ({ r, state: retailerState(r) }));
  const shown = rows.filter((x) => matches(x.state, filter));

  return (
    <>
      <Nav dealer={tenant.name} current="faelle" />
      <section className="panel chambray head">
        <div className="wrap">
          <h1 className="h1">{t.list.title}</h1>
          <nav className="filters" aria-label={t.list.filter}>
            {filters.map((f) => (
              <Link
                key={f}
                className="filter"
                href={f === 'alle' ? '/' : `/?stand=${f}`}
                aria-current={f === filter ? 'page' : undefined}
              >
                {t.list.filters[f]}
                <span className="n">{rows.filter((x) => matches(x.state, f)).length}</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <main className="wrap">
        {shown.length === 0 ? (
          <p className="empty">{t.list.empty}</p>
        ) : (
          <ul className="rows">
            {shown.map(({ r, state }) => {
              const f = r.file;
              const revoked = state === 'widerrufen';
              return (
                <li key={f.caseId}>
                  <Link
                    className={`row${revoked ? ' off' : ''}`}
                    href={`/faelle/${encodeURIComponent(f.caseId)}`}
                    aria-label={t.list.open(f.caseId)}
                  >
                    <span>
                      <span className="row-id num">{f.caseId}</span>
                      <br />
                      <span className="row-when">{formatWhen(f.sharedAt)}</span>
                    </span>
                    <span>
                      <span className="row-who">{revoked ? '–' : f.customer.name}</span>
                      <br />
                      <span className="row-sub">
                        {revoked ? '' : `${f.device.manufacturer} ${f.device.model}`}
                      </span>
                    </span>
                    <span className="row-problem">{revoked ? '' : f.case.problemLabel}</span>
                    <StateChip state={state} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
