import { de } from '@/i18n/de';

import { Nav } from '../../components/Nav';
import { WeeklyChart } from '../../components/WeeklyChart';
import { getAnonymous, getSettings, listCases } from '../../lib/api';
import { formatEuro } from '../../lib/format';
import { computeStats } from '../../lib/stats';

const t = de.portal.stats;

export const dynamic = 'force-dynamic';

const dec = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

export default async function Auswertung() {
  const [{ tenant, cases }, { settings }, anonymous] = await Promise.all([
    listCases(),
    getSettings(),
    getAnonymous(),
  ]);
  const s = computeStats(cases, anonymous, settings);
  const topMax = Math.max(1, ...s.top.map((x) => x.count));

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: t.cases, value: String(s.total), sub: t.range },
    { label: t.selfSolved, value: t.share(pct.format(s.selfShare * 100)) },
    { label: t.saved, value: formatEuro(s.savedCents), sub: t.savedSub(s.visits, s.returns) },
    {
      label: t.throughput,
      value: s.throughputDays !== undefined ? t.days(dec.format(s.throughputDays)) : '–',
      sub:
        s.firstReplyHours !== undefined
          ? t.throughputSub(t.hours(dec.format(s.firstReplyHours)))
          : undefined,
    },
    {
      label: t.rating,
      value: s.ratingAvg !== undefined ? `${dec.format(s.ratingAvg)} ★` : '–',
      sub: t.ratingSub(s.ratingCount),
    },
  ];

  return (
    <>
      <Nav dealer={tenant.name} user={tenant.userName} current="auswertung" />
      <section className="panel chambray head">
        <div className="wrap stack">
          <h1 className="h1">{t.title}</h1>
          <p className="eyebrow">{t.range}</p>
        </div>
      </section>
      <main className="wrap dash">
        <ul className="kpis">
          {tiles.map((x) => (
            <li key={x.label} className="card kpi">
              <span className="h3">{x.label}</span>
              <b className="kpi-v num">{x.value}</b>
              {x.sub ? <span className="row-sub">{x.sub}</span> : null}
            </li>
          ))}
        </ul>
        <section className="card">
          <h2 className="h2">{t.perWeek}</h2>
          <WeeklyChart weeks={s.weeks} />
        </section>
        <section className="card">
          <h2 className="h2">{t.topProblems}</h2>
          <ol className="bars">
            {s.top.map((x) => (
              <li key={`${x.problem}|${x.model}`}>
                <span className="bar-label">
                  <b>{x.problem}</b>
                  <span className="row-sub">{x.model}</span>
                </span>
                <span className="bar-track" aria-hidden>
                  <span className="bar-fill" style={{ width: `${(x.count / topMax) * 100}%` }} />
                </span>
                <span className="bar-v num">{x.count}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
