import Link from 'next/link';
import { notFound } from 'next/navigation';

import { portalSeed } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { fillTemplate, workflowStatuses } from '@/model/portal';
import type { RetailerDecision, SharedPhoto } from '@/model/sharing';

import { Avatar, SlaChip, WorkflowChip } from '../../../components/Chips';
import { Composer } from '../../../components/Composer';
import { Nav } from '../../../components/Nav';
import { AutoSelect, OpenComposer, ScrollBox } from '../../../components/Small';
import { getCase, getSettings } from '../../../lib/api';
import { warrantyCheck } from '../../../lib/check';
import { conversation, type ConvItem } from '../../../lib/conversation';
import { formatDate, formatEuro, formatWhen } from '../../../lib/format';
import { nextStep } from '../../../lib/next';
import { sla } from '../../../lib/sla';
import { decisionOf, member } from '../../../lib/view';
import { compose, quick } from './actions';

const t = de.portal;
const f = t.file;
const decisions: RetailerDecision[] = ['gewaehrleistung', 'kulanz', 'an_versicherer', 'abgelehnt'];

export const dynamic = 'force-dynamic';

const time = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

function Facts({ items }: { items: [string, string | undefined][] }) {
  return (
    <dl className="facts">
      {items
        .filter((x): x is [string, string] => !!x[1])
        .map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function Photo({ p, alt }: { p: SharedPhoto; alt: string }) {
  const purpose = de.caseFile.photoPurpose[p.purpose] ?? p.purpose;
  return (
    <figure className="photo">
      {p.jpegBase64 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/jpeg;base64,${p.jpegBase64}`} alt={alt} />
      ) : (
        <figcaption>
          {purpose}
          <br />
          {formatWhen(p.takenAt)}
        </figcaption>
      )}
    </figure>
  );
}

function Bubble({ x, customer }: { x: ConvItem; customer: string }) {
  if (x.kind === 'system') {
    const lines = x.texts;
    const show = (l: { at: string; text: string }, i: number) => (
      <li key={i}>
        <span className="num">{time.format(new Date(l.at))}</span> {l.text}
      </li>
    );
    return (
      <div className="sys">
        <span className="sys-day">{formatWhen(lines[0]!.at).split(' · ')[0]}</span>
        {lines.length > 4 ? (
          <details>
            <summary>
              <ul>{lines.slice(0, 2).map(show)}</ul>
              <span className="more">{t.conversation.more(lines.length - 3)}</span>
            </summary>
            <ul>{lines.slice(2, -1).map((l, i) => show(l, i + 2))}</ul>
            <ul>{show(lines.at(-1)!, lines.length - 1)}</ul>
          </details>
        ) : (
          <ul>{lines.map(show)}</ul>
        )}
      </div>
    );
  }
  if (x.kind === 'note') {
    return (
      <div className="msg note-msg">
        <div className="bubble">
          <span className="tag">{f.internal}</span>
          <p>{x.text}</p>
        </div>
        <span className="meta">
          {x.by} · {time.format(new Date(x.at))}
        </span>
      </div>
    );
  }
  if (x.kind === 'customer') {
    return (
      <div className="msg them">
        <div className="bubble">
          {x.photo ? <Photo p={x.photo} alt={f.photoAlt('', formatWhen(x.at))} /> : null}
          <p>{x.text}</p>
        </div>
        <span className="meta">
          {customer} · {time.format(new Date(x.at))}
          {x.answer ? ` · ${t.conversation.answer}` : ''}
        </span>
      </div>
    );
  }
  return (
    <div className="msg ours">
      <div className="bubble">
        <p>{x.text}</p>
        {x.note ? <p className="sub">{x.note}</p> : null}
        {x.options?.length ? (
          <div className="opts">
            {x.options.map((o) => (
              <span key={o} className={`opt${x.chosen === o ? ' chosen' : ''}`}>
                {x.chosen === o ? '✓ ' : ''}
                {o}
              </span>
            ))}
          </div>
        ) : null}
        {x.contact ? <span className="opt">{t.conversation.contact}</span> : null}
      </div>
      <span className="meta">
        {x.by}
        {x.auto ? ` · ${t.conversation.auto}` : ''} · {time.format(new Date(x.at))}
      </span>
    </div>
  );
}

export default async function Fallakte({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, { settings }] = await Promise.all([getCase(id), getSettings()]);
  if (!data) notFound();
  const { tenant, record } = data;
  const file = record.file;
  const revoked = !!record.revokedAt;
  const status = revoked ? 'erledigt' : (record.workflow?.status ?? 'neu');
  const due = sla(record, settings.rules);
  const who = member(settings, record.workflow?.assigneeId);
  const check = warrantyCheck(file, settings.rules);
  const decided = decisionOf(record);
  const next = nextStep(record, settings);
  const items = conversation(record);
  const first = file.customer.name.split(' ')[0] ?? file.customer.name;
  const values = {
    kunde: first,
    fall: file.caseId,
    haendler: settings.profile.shortName,
    telefon: settings.profile.phone,
  };
  const templates = settings.messages.templates.map((x) => ({
    ...x,
    text: fillTemplate(x.text, values),
  }));
  const partners = [
    ...(settings.service.ownService ? [settings.service.serviceName] : []),
    ...settings.service.partners.map((p) => p.name),
  ];
  const team = settings.team.filter((m) => m.active && m.role !== 'lesen');
  const act = quick.bind(null, file.caseId);
  const g = file.guide;
  const done = g ? g.completed.length : 0;

  return (
    <>
      <Nav dealer={tenant.name} user={tenant.userName} current="faelle" />
      <section className="panel chambray head slim">
        <div className="wrap stack">
          <div className="chips">
            <Link className="back" href="/">
              ‹ {f.back}
            </Link>
          </div>
          <p className="eyebrow num">
            {f.case(file.caseId)} · {f.shared} {formatWhen(file.sharedAt)}
          </p>
          <h1 className="h1 h1-case">{revoked ? f.case(file.caseId) : file.case.problemLabel}</h1>
          {revoked ? (
            <div className="chips">
              <WorkflowChip status="erledigt" revoked />
            </div>
          ) : (
            <div className="chips">
              <WorkflowChip status={status} />
              <SlaChip sla={due} />
              <span className="chip">{file.customer.name}</span>
              <span className="chip">
                {file.device.manufacturer} {file.device.model}
              </span>
              {who ? (
                <span className="chip">
                  <Avatar name={who.name} size="sm" /> {who.name}
                </span>
              ) : null}
              {file.isExample ? <span className="chip muted">{t.example}</span> : null}
            </div>
          )}
        </div>
      </section>

      <main className="wrap">
        {revoked ? (
          <p className="empty">{f.revoked}</p>
        ) : (
          <div className="file">
            <section className="card convcard" aria-label={f.conversation}>
              <ScrollBox count={items.length} label={f.conversation}>
                {items.length ? (
                  items.map((x, i) => <Bubble key={i} x={x} customer={file.customer.name} />)
                ) : (
                  <p className="empty">{t.conversation.empty}</p>
                )}
              </ScrollBox>
              <Composer
                action={compose.bind(null, file.caseId)}
                customer={first}
                templates={templates}
                questions={settings.messages.questions}
                slots={settings.service.slots}
                partners={partners}
                parts={portalSeed.parts}
                photoText={templates.find((x) => x.id === 'foto')?.text}
                videoHref={`/faelle/${encodeURIComponent(file.caseId)}/videocall`}
              />
            </section>

            <aside className="stack side">
              {next ? (
                <section className="card paper">
                  <h2 className="h3">{f.next}</h2>
                  {next.kind === 'annehmen' ? (
                    <form action={act}>
                      <input type="hidden" name="kind" value="annehmen" />
                      <button className="btn btn-block" type="submit">
                        {t.next.accept}
                      </button>
                    </form>
                  ) : next.kind === 'entscheiden' ? (
                    <form action={act}>
                      <input type="hidden" name="kind" value="entscheidung" />
                      <input type="hidden" name="decision" value={next.decision} />
                      <button className="btn btn-block" type="submit">
                        {t.check.confirm[next.decision]}
                      </button>
                    </form>
                  ) : next.kind === 'antworten' ? (
                    <OpenComposer what="antworten" label={t.next.reply} />
                  ) : next.kind === 'termin' ? (
                    <OpenComposer what="termin" label={t.next.termin} />
                  ) : next.kind === 'abschliessen' ? (
                    <form action={act}>
                      <input type="hidden" name="kind" value="abschliessen" />
                      <button className="btn btn-block" type="submit">
                        {t.next.close}
                      </button>
                    </form>
                  ) : (
                    <p className="h2">{next.kind === 'warten' ? t.next.waiting : t.next.done}</p>
                  )}
                </section>
              ) : null}

              <section className="card">
                <h2 className="h3">{t.check.title}</h2>
                <div className="chips">
                  <span className={`chip ${decided ? 'ink' : `verdict ${check.verdict}`}`}>
                    {decided
                      ? `${t.check.decided}: ${t.decisions[decided]}`
                      : t.check.verdict[check.verdict]}
                  </span>
                  <span className={`chip ${check.proof ? 'ok' : 'warn'}`}>
                    {t.check.proof} {check.proof ? t.check.proofYes : t.check.proofNo}
                  </span>
                </div>
                <Facts
                  items={[
                    [
                      f.purchased,
                      file.device.purchaseDate && check.months !== undefined
                        ? t.check.purchased(formatDate(file.device.purchaseDate), check.months)
                        : t.check.unknown,
                    ],
                    [
                      f.protection,
                      file.protection
                        ? `${file.protection.provider} · ${file.protection.product}`
                        : undefined,
                    ],
                    [
                      t.decisions.kulanz,
                      check.verdict === 'kulanz'
                        ? t.check.goodwillMax(formatEuro(settings.rules.goodwillMaxCents))
                        : undefined,
                    ],
                  ]}
                />
                {decided ? null : (
                  <details className="more-actions">
                    <summary>{t.check.other}</summary>
                    <div className="choices">
                      {decisions
                        .filter((d) => d !== check.verdict)
                        .map((d) => (
                          <form key={d} action={act}>
                            <input type="hidden" name="kind" value="entscheidung" />
                            <input type="hidden" name="decision" value={d} />
                            <button className="btn btn-2 btn-sm" type="submit">
                              {t.check.confirm[d]}
                            </button>
                          </form>
                        ))}
                    </div>
                  </details>
                )}
              </section>

              <section className="card">
                <AutoSelect
                  action={act}
                  kind="zuweisen"
                  name="assigneeId"
                  label={f.assignee}
                  value={record.workflow?.assigneeId ?? ''}
                  options={[
                    { value: '', label: t.list.unassigned },
                    ...team.map((m) => ({ value: m.id, label: m.name })),
                  ]}
                />
                <AutoSelect
                  action={act}
                  kind="stand"
                  name="status"
                  label={f.state}
                  value={status}
                  options={workflowStatuses.map((s) => ({ value: s, label: t.workflow[s] }))}
                />
              </section>

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
                {file.rating ? (
                  <p className="stars" aria-label={f.rating(file.rating)}>
                    {'★'.repeat(file.rating)}
                    <span className="off">{'★'.repeat(5 - file.rating)}</span>
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

              {file.results.length || g || file.finding || file.quote ? (
                <section className="card">
                  <h2 className="h3">{f.details}</h2>
                  {file.results.map((r, i) => (
                    <div key={i} className="stack tight">
                      <p className="label">{r.component ?? r.displayMessage}</p>
                      <div className="chips">
                        <span className="chip">{f.source[r.source]}</span>
                        <span className="chip">{f.confidence[r.confidence]}</span>
                      </div>
                    </div>
                  ))}
                  {g ? (
                    <div className="stack tight">
                      <p className="label">
                        {f.guide}: {g.title} · {f.guideSteps(done, g.total)}
                      </p>
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
                      {g.abortedAt ? (
                        <p className="row-sub">
                          {f.guideAborted(g.abortedAt.step, g.abortedAt.title)}
                        </p>
                      ) : null}
                      {g.note ? (
                        <p className="note">
                          {f.note}: {g.note}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {file.finding ? (
                    <div className="stack tight">
                      <p className="label">
                        {f.finding}: {file.finding.label}
                      </p>
                      <p className="row-sub">{file.finding.by}</p>
                    </div>
                  ) : null}
                  {file.quote ? (
                    <div className="money">
                      <span>
                        {f.repair}
                        {file.quote.repair.partName ? ` · ${file.quote.repair.partName}` : ''}
                      </span>
                      <b className="num">{formatEuro(file.quote.repair.total)}</b>
                      <span>{f.replacement}</span>
                      <span className="num">{formatEuro(file.quote.replacement.total)}</span>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {file.photos.length ? (
                <section className="card">
                  <h2 className="h3">{f.photos}</h2>
                  <div className="photos">
                    {file.photos.map((p) => (
                      <Photo
                        key={p.id}
                        p={p}
                        alt={f.photoAlt(
                          de.caseFile.photoPurpose[p.purpose] ?? p.purpose,
                          formatWhen(p.takenAt),
                        )}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {record.access?.length ? (
                <details className="card">
                  <summary className="h3">
                    {f.access} · {record.access.length}
                  </summary>
                  <ol className="log">
                    {[...record.access].reverse().map((a, i) => (
                      <li key={i}>
                        <span className="tm">{formatWhen(a.at)}</span>
                        <span>{a.by}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
