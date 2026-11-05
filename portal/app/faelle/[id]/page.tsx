import Link from 'next/link';
import { notFound } from 'next/navigation';

import { portalSeed } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { fillTemplate, templateValues, workflowStatuses } from '@/model/portal';
import type { SharedPhoto } from '@/model/sharing';

import { Avatar, SlaChip, WorkflowChip } from '../../../components/Chips';
import { Composer } from '../../../components/Composer';
import { DecisionButton } from '../../../components/Decide';
import { Nav } from '../../../components/Nav';
import { AutoSelect, OpenComposer, ScrollBox } from '../../../components/Small';
import { Submit } from '../../../components/Submit';
import { getCase, getSettings, listCases } from '../../../lib/api';
import { allowedDecisions, warrantyCheck } from '../../../lib/check';
import { previousRepair } from '../../../lib/rework';
import { partnerOptions, slotLoad } from '../../../lib/schedule';
import { conversation, type ConvItem } from '../../../lib/conversation';
import { formatDate, formatEuro, formatWhen } from '../../../lib/format';
import { nextStep } from '../../../lib/next';
import { photoLabel } from '../../../lib/photos';
import { sla } from '../../../lib/sla';
import { decisionOf, member } from '../../../lib/view';
import { compose, quick } from './actions';

const t = de.portal;
const f = t.file;

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: t.file.case(decodeURIComponent(id)) };
}

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

/** Foto mit Bild, ein Beispielfoto ohne Bild mit Beschriftung und Zeitpunkt */
function Photo({ p, label, alt }: { p: SharedPhoto; label: string; alt: string }) {
  return (
    <figure className="photo">
      {p.jpegBase64 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/jpeg;base64,${p.jpegBase64}`} alt={alt} />
      ) : (
        <figcaption>
          {label}
          <br />
          {formatWhen(p.takenAt)}
        </figcaption>
      )}
    </figure>
  );
}

/** Tag einer Zeile im Verlauf, z. B. „Do., 05.11.“ */
const dayOf = (at: string) => formatWhen(at).split(' · ')[0];

function Bubble({ x, customer, day }: { x: ConvItem; customer: string; day: boolean }) {
  if (x.kind === 'system') {
    const lines = x.texts;
    const show = (l: { at: string; text: string }, i: number) => (
      <li key={i}>
        <span className="num">{time.format(new Date(l.at))}</span> {l.text}
      </li>
    );
    return (
      <div className="sys">
        {/* Der Tag nur, wenn er sich gegenüber dem Eintrag davor ändert */}
        {day ? <span className="sys-day">{dayOf(lines[0]!.at)}</span> : null}
        {lines.length > 4 ? (
          <>
            {/* Eingeklappt: die ersten zwei und die letzte Zeile, dazwischen die Zahl */}
            <details>
              <summary>
                <ul>{lines.slice(0, 2).map(show)}</ul>
                <span className="more">{t.conversation.more(lines.length - 3)}</span>
              </summary>
              <ul>{lines.slice(2, -1).map((l, i) => show(l, i + 2))}</ul>
            </details>
            <ul>{show(lines.at(-1)!, lines.length - 1)}</ul>
          </>
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
          {x.photo ? (
            <Photo
              p={x.photo}
              label={f.photoMessage}
              alt={f.photoAlt(f.photoMessage, formatWhen(x.at))}
            />
          ) : null}
          {/* Nur ein Foto ohne Worte: kein „Foto“ als Text darunter */}
          {x.photo && x.text === de.chat.photoLabel ? null : <p>{x.text}</p>}
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
  const [data, { settings }, { cases }] = await Promise.all([
    getCase(id),
    getSettings(),
    listCases(),
  ]);
  if (!data) notFound();
  const { tenant, record } = data;
  const file = record.file;
  const revoked = !!record.revokedAt;
  const status = revoked ? 'erledigt' : (record.workflow?.status ?? 'neu');
  const due = sla(record, settings.rules, Date.now(), settings.profile.hours);
  const who = member(settings, record.workflow?.assigneeId);
  const rework = previousRepair(record, cases);
  const check = warrantyCheck(file, settings.rules, record, rework);
  const decided = decisionOf(record);
  const next = nextStep(record, settings, rework);
  // Schon nach dem Kaufbeleg gefragt (von Hand oder automatisch beim Eingang)?
  const proofQuestion = settings.messages.questions.find((q) => q.id === 'beleg')?.question;
  const askedProof = record.retailerEvents.some(
    (e) => e.type === 'haendler_rueckfrage' && e.payload.question === proofQuestion,
  );
  const items = conversation(record, settings.profile.shortName);
  const values = templateValues(settings, file.customer.name, file.caseId);
  const goodwill = {
    maxCents: settings.rules.goodwillMaxCents,
    totalCents: file.quote?.repair.total,
  };
  const templates = settings.messages.templates.map((x) => ({
    ...x,
    text: fillTemplate(x.text, values),
  }));
  // Betrieb nach Postleitzahl, belegte Zeitfenster aus den offenen Fällen (Portal-Idee 4)
  const partners = partnerOptions(settings, file.customer.address?.zip);
  const load = slotLoad(cases);
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
              <WorkflowChip status={status} cancelled={file.case.status === 'abgebrochen'} />
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
                  items.map((x, i) => (
                    <Bubble
                      key={i}
                      x={x}
                      customer={file.customer.name}
                      day={i === 0 || dayOf(items[i - 1]!.at) !== dayOf(x.at)}
                    />
                  ))
                ) : (
                  <p className="empty">{t.conversation.empty}</p>
                )}
              </ScrollBox>
              <Composer
                action={compose.bind(null, file.caseId)}
                customer={values.kunde ?? file.customer.name}
                templates={templates}
                questions={settings.messages.questions}
                slots={settings.service.slots}
                partners={partners}
                load={load}
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
                      <Submit className="btn btn-block">{t.next.accept}</Submit>
                    </form>
                  ) : next.kind === 'entscheiden' ? (
                    next.decision === 'offen' ? (
                      // Ohne Kaufdatum kein Vorschlag: erst den Kaufbeleg, entschieden wird unten
                      askedProof ? (
                        <p className="h2">{t.next.awaitProof}</p>
                      ) : (
                        <OpenComposer what="rueckfrage" label={t.next.askProof} />
                      )
                    ) : (
                      <DecisionButton
                        action={act}
                        decision={next.decision}
                        big
                        goodwill={goodwill}
                      />
                    )
                  ) : next.kind === 'antworten' ? (
                    <OpenComposer what="antworten" label={t.next.reply} />
                  ) : next.kind === 'termin' ? (
                    <OpenComposer what="termin" label={t.next.termin} />
                  ) : next.kind === 'termin_steht' ? (
                    <>
                      <p className="h2">{t.next.booked}</p>
                      {next.slot ? (
                        <p>{[next.partner, next.slot].filter(Boolean).join(' · ')}</p>
                      ) : null}
                      {/* Abschließen erst nach der Reparatur, darum klein */}
                      <form action={act}>
                        <input type="hidden" name="kind" value="abschliessen" />
                        <Submit className="btn btn-2 btn-sm">{t.next.close}</Submit>
                      </form>
                    </>
                  ) : (
                    <p className="h2">
                      {next.kind === 'warten'
                        ? t.next.waiting
                        : next.kind === 'abgebrochen'
                          ? t.next.cancelled
                          : t.next.done}
                    </p>
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
                  {check.rework ? <span className="chip ok">{t.check.reworkChip}</span> : null}
                </div>
                {check.rework ? (
                  <p className="row-sub">
                    <Link href={`/faelle/${encodeURIComponent(check.rework.caseId)}`}>
                      {t.check.reworkOf(check.rework.caseId, formatDate(check.rework.doneAt))}
                    </Link>
                  </p>
                ) : null}
                <Facts
                  items={[
                    [
                      t.check.basis,
                      check.rework
                        ? t.check.basisLine.rework(
                            settings.profile.shortName,
                            formatDate(check.rework.until),
                          )
                        : check.until === undefined
                          ? t.check.basisLine.open(settings.profile.shortName)
                          : check.inWarranty
                            ? t.check.basisLine.in(
                                settings.profile.shortName,
                                formatDate(check.until),
                              )
                            : t.check.basisLine.ended(
                                settings.profile.shortName,
                                formatDate(check.until),
                              ),
                    ],
                    [
                      f.purchased,
                      file.device.purchaseDate && check.months !== undefined
                        ? t.check.purchased(formatDate(file.device.purchaseDate), check.months)
                        : t.check.unknown,
                    ],
                    [
                      f.protection,
                      file.protection
                        ? t.check.insured(
                            file.protection.provider,
                            file.protection.product,
                            formatDate(file.protection.validUntil),
                          )
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
                {revoked || next?.kind === 'abgebrochen' ? null : (
                  // Ohne Vorschlag offen, sonst eingeklappt. Nach einer Entscheidung lässt sie sich
                  // ändern, die Kundschaft bekommt dann die neue (Portal-Prüfung 05.11.).
                  <details className="more-actions" open={!decided && check.verdict === 'offen'}>
                    <summary>{decided ? t.check.change : t.check.other}</summary>
                    <div className="choices">
                      {allowedDecisions(check)
                        .filter((d) => d !== (decided ?? check.verdict))
                        .map((d) => (
                          <DecisionButton key={d} action={act} decision={d} goodwill={goodwill} />
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
                  <p className="stars" role="img" aria-label={f.rating(file.rating)}>
                    <span aria-hidden>{de.symbols.star.repeat(file.rating)}</span>
                    <span className="off" aria-hidden>
                      {de.symbols.star.repeat(5 - file.rating)}
                    </span>
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
                      <div key={p.id} className="photo-item">
                        <Photo
                          p={p}
                          label={photoLabel(file, p)}
                          alt={f.photoAlt(photoLabel(file, p), formatWhen(p.takenAt))}
                        />
                        {/* Ein Beleg aus dem Chat zählt, sobald das Team ihn markiert */}
                        {p.purpose === 'kaufbeleg' || record.proofPhotoId === p.id ? (
                          <span className="chip ok">{t.check.proof}</span>
                        ) : revoked || check.proof ? null : (
                          <form action={act}>
                            <input type="hidden" name="kind" value="kaufbeleg" />
                            <input type="hidden" name="photoId" value={p.id} />
                            <Submit className="btn btn-2 btn-sm">{f.markProof}</Submit>
                          </form>
                        )}
                      </div>
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
