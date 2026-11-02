import Link from 'next/link';
import { notFound } from 'next/navigation';

import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import type { RetailerDecision, RetailerStatus, SharedCaseRecord } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

import { Nav } from '../../../components/Nav';
import { StateChip } from '../../../components/StateChip';
import { getCase } from '../../../lib/api';
import { formatDate, formatEuro, formatWhen, warrantyEnd } from '../../../lib/format';
import { retailerState } from '../../../lib/state';
import { accept, ask, assign, decide, report } from './actions';

const t = de.portal;
const f = t.file;
const a = t.actions;

export const dynamic = 'force-dynamic';

const decisions: RetailerDecision[] = ['gewaehrleistung', 'kulanz', 'an_versicherer', 'abgelehnt'];
const statuses: RetailerStatus[] = ['in_pruefung', 'ersatzteil_bestellt', 'abgeschlossen'];

function Facts({ items }: { items: [string, string | undefined][] }) {
  return (
    <dl className="facts">
      {items
        .filter((x): x is [string, string] => !!x[1])
        .map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

/** Ereignis des Händlers als Zeile im Verlauf */
function retailerLine(e: CaseEvent): string {
  const p = e.payload;
  const base = de.caseEvent[e.type];
  const extra =
    e.type === 'haendler_rueckfrage'
      ? String(p.question ?? '')
      : e.type === 'haendler_entscheidung'
        ? de.sharing.eventDetail.decision[p.decision as RetailerDecision]
        : e.type === 'haendler_betrieb'
          ? [p.partnerName, p.slot].filter(Boolean).join(' · ')
          : e.type === 'haendler_status'
            ? de.sharing.eventDetail.status[p.status as RetailerStatus]
            : '';
  const note = p.note ? ` · ${String(p.note)}` : '';
  return extra ? `${base}: ${extra}${note}` : `${base}${note}`;
}

function timeline(r: SharedCaseRecord) {
  const app = r.file.timeline.map((x) => ({ at: x.at, text: x.label, who: x.actor, ours: false }));
  const ours = r.retailerEvents.map((e) => ({
    at: e.at,
    text: retailerLine(e),
    who: String(e.payload.by ?? e.actor.name ?? ''),
    ours: true,
  }));
  const answers = r.file.answers.map((x) => ({
    at: x.at,
    text: f.answer(x.answer),
    who: r.file.customer.name,
    ours: false,
  }));
  return [...app, ...ours, ...answers].sort((x, y) => y.at.localeCompare(x.at));
}

export default async function Fallakte({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; fehler?: string }>;
}) {
  const { id } = await params;
  const { ok, fehler } = await searchParams;
  const data = await getCase(id);
  if (!data) notFound();
  const { tenant, record } = data;
  const file = record.file;
  const state = retailerState(record);
  const revoked = state === 'widerrufen';
  const accepted = record.retailerEvents.length > 0;
  const dealer = demoConfig.dealers.find((d) => d.id === tenant.id);
  const partners = [
    ...(dealer && 'service' in dealer && dealer.service ? [dealer.service.name] : []),
    ...demoConfig.partners.map((p) => p.name),
  ];
  const warranty = file.device.purchaseDate ? warrantyEnd(file.device.purchaseDate) : undefined;
  const g = file.guide;
  const done = g ? g.completed.length : 0;

  return (
    <>
      <Nav dealer={tenant.name} />
      <section className="panel chambray head">
        <div className="wrap stack">
          <div className="chips">
            <Link className="back" href="/">
              ‹ {f.back}
            </Link>
          </div>
          <p className="eyebrow num">
            {f.case(file.caseId)} · {formatWhen(file.sharedAt)}
          </p>
          <h1 className="h1">{revoked ? f.case(file.caseId) : file.case.problemLabel}</h1>
          <div className="chips">
            <StateChip state={state} />
            {revoked ? null : (
              <>
                <span className="chip">
                  {file.device.manufacturer} {file.device.model}
                </span>
                {warranty ? (
                  <span className={`chip ${warranty.running ? 'accent' : 'muted'}`}>
                    {f.warranty}{' '}
                    {warranty.running
                      ? f.warrantyRunning(warranty.until)
                      : f.warrantyOver(warranty.until)}
                  </span>
                ) : null}
                {file.protection ? (
                  <span className="chip">
                    {f.protection}: {file.protection.provider}
                  </span>
                ) : null}
                {file.isExample ? <span className="chip muted">{t.example}</span> : null}
              </>
            )}
          </div>
          {ok ? (
            <p className="flash" role="status">
              <span className="dot" aria-hidden />
              {a.saved}
            </p>
          ) : fehler ? (
            <p className="flash bad" role="alert">
              <span className="dot" aria-hidden />
              {a.failed}
            </p>
          ) : null}
        </div>
      </section>

      <main className="wrap">
        {revoked ? (
          <p className="empty">{f.revoked}</p>
        ) : (
          <div className="file">
            <div className="stack">
              <div className="grid2">
                <section className="card">
                  <h2 className="h3">{f.customer}</h2>
                  <p className="h2">{file.customer.name}</p>
                  {file.customer.address ? (
                    <p>
                      {file.customer.address.street}
                      <br />
                      {file.customer.address.zip} {file.customer.address.city}
                    </p>
                  ) : null}
                </section>
                <section className="card">
                  <h2 className="h3">{f.device}</h2>
                  <Facts
                    items={[
                      [f.model, `${file.device.manufacturer} ${file.device.model}`],
                      [f.materialNumber, file.device.materialNumber],
                      [f.serialNumber, file.device.serialNumber],
                      [
                        f.purchased,
                        file.device.purchaseDate ? formatDate(file.device.purchaseDate) : undefined,
                      ],
                    ]}
                  />
                </section>
              </div>

              {file.results.length ? (
                <section className="card">
                  <h2 className="h3">{f.result}</h2>
                  {file.results.map((r, i) => (
                    <div key={i} className="stack" style={{ gap: 4 }}>
                      <p className="h2">{r.component ?? r.displayMessage}</p>
                      <div className="chips">
                        <span className="chip">{f.source[r.source]}</span>
                        <span className="chip">{f.confidence[r.confidence]}</span>
                        {r.displayMessage && r.component ? (
                          <span className="chip">„{r.displayMessage}“</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}

              {g ? (
                <section className="card">
                  <h2 className="h3">
                    {f.guide} · {f.guideSteps(done, g.total)}
                  </h2>
                  <p className="h2">{g.title}</p>
                  <div className="steps" aria-hidden>
                    {Array.from({ length: g.total }, (_, i) => (
                      <i
                        key={i}
                        className={
                          i < done ? 'f' : g.abortedAt && i === g.abortedAt.step - 1 ? 'x' : ''
                        }
                      />
                    ))}
                  </div>
                  <ul className="list">
                    {g.completed.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                    {g.abortedAt ? (
                      <li className="x">{f.guideAborted(g.abortedAt.step, g.abortedAt.title)}</li>
                    ) : null}
                  </ul>
                  {g.note ? (
                    <p className="note">
                      {f.note}: {g.note}
                    </p>
                  ) : null}
                  <p className="row-sub">{g.source}</p>
                </section>
              ) : null}

              {file.finding || file.quote || file.booking ? (
                <div className="grid2">
                  {file.finding ? (
                    <section className="card">
                      <h2 className="h3">{f.finding}</h2>
                      <p className="h2">{file.finding.label}</p>
                      <p className="row-sub">
                        {file.finding.by} · {formatWhen(file.finding.at)}
                      </p>
                    </section>
                  ) : null}
                  {file.quote ? (
                    <section className="card">
                      <h2 className="h3">{f.quote}</h2>
                      <div className="money">
                        <span>
                          {f.repair}
                          {file.quote.repair.partName ? ` · ${file.quote.repair.partName}` : ''}
                        </span>
                        <b className="num">{formatEuro(file.quote.repair.total)}</b>
                        <span>{f.replacement}</span>
                        <span className="num">{formatEuro(file.quote.replacement.total)}</span>
                      </div>
                    </section>
                  ) : null}
                  {file.booking ? (
                    <section className="card">
                      <h2 className="h3">{f.booking}</h2>
                      <p className="h2">{file.booking.slotLabel}</p>
                      <p className="row-sub">
                        {file.booking.provider} · {file.booking.status}
                      </p>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {file.photos.length ? (
                <section className="card">
                  <h2 className="h3">{f.photos}</h2>
                  <div className="photos">
                    {file.photos.map((p) => {
                      const purpose = de.caseFile.photoPurpose[p.purpose] ?? p.purpose;
                      return (
                        <figure key={p.id} className="photo" style={{ margin: 0 }}>
                          {p.jpegBase64 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`data:image/jpeg;base64,${p.jpegBase64}`}
                              alt={f.photoAlt(purpose, formatWhen(p.takenAt))}
                            />
                          ) : (
                            <figcaption>
                              {purpose}
                              <br />
                              {formatWhen(p.takenAt)}
                            </figcaption>
                          )}
                        </figure>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section className="card">
                <h2 className="h3">{f.timeline}</h2>
                <ol className="log">
                  {timeline(record).map((x, i) => (
                    <li key={i}>
                      <span className="tm">{formatWhen(x.at)}</span>
                      <span>
                        <b className={x.ours ? 'by' : undefined}>{x.text}</b>
                        {x.who ? <span className="row-sub"> · {x.who}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <aside className="card paper sticky" aria-label={a.title}>
              {accepted ? null : (
                <form action={accept.bind(null, file.caseId)} className="act">
                  <button className="btn btn-block" type="submit">
                    {a.accept}
                  </button>
                </form>
              )}

              <form action={ask.bind(null, file.caseId)} className="act">
                <div className="field">
                  <label htmlFor="question">{a.question}</label>
                  <input
                    id="question"
                    name="question"
                    className="input"
                    placeholder={a.questionPlaceholder}
                    maxLength={500}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="options">{a.optionsLabel}</label>
                  <input
                    id="options"
                    name="options"
                    className="input"
                    placeholder={a.optionsPlaceholder}
                    maxLength={200}
                  />
                </div>
                <button className="btn btn-2 btn-sm" type="submit">
                  {a.send}
                </button>
              </form>

              <form action={decide.bind(null, file.caseId)} className="act">
                <fieldset>
                  <legend>{a.decision}</legend>
                  <div className="choices">
                    {decisions.map((d, i) => (
                      <label key={d} className="choice">
                        <input type="radio" name="decision" value={d} required={i === 0} />
                        <span>{a.decisions[d]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="field">
                  <label htmlFor="decision-note">{a.note}</label>
                  <textarea id="decision-note" name="note" className="input" maxLength={500} />
                </div>
                <button className="btn btn-2 btn-sm" type="submit">
                  {a.send}
                </button>
              </form>

              <form action={assign.bind(null, file.caseId)} className="act">
                <div className="field">
                  <label htmlFor="partner">{a.partner}</label>
                  <select id="partner" name="partner" className="input" required>
                    {partners.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="slot">{a.slot}</label>
                  <select id="slot" name="slot" className="input" defaultValue="">
                    <option value="">{a.noSlot}</option>
                    {demoConfig.slots.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-2 btn-sm" type="submit">
                  {a.send}
                </button>
              </form>

              <form action={report.bind(null, file.caseId)} className="act">
                <fieldset>
                  <legend>{a.status}</legend>
                  <div className="choices">
                    {statuses.map((s, i) => (
                      <label key={s} className="choice">
                        <input type="radio" name="status" value={s} required={i === 0} />
                        <span>{a.statuses[s]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="field">
                  <label htmlFor="status-note">{a.note}</label>
                  <textarea id="status-note" name="note" className="input" maxLength={500} />
                </div>
                <button className="btn btn-2 btn-sm" type="submit">
                  {a.send}
                </button>
              </form>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
