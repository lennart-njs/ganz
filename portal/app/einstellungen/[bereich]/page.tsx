import Link from 'next/link';
import { notFound } from 'next/navigation';

import { messagePreview } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import {
  fillTemplate,
  formatOptions,
  settingsSections,
  type DealerSettings,
  type SettingsSection,
} from '@/model/portal';
import type { DeviceCategory } from '@/model/types';

import { Nav } from '../../../components/Nav';
import { SettingsForm } from '../../../components/SettingsForm';
import { getSettings, listCases } from '../../../lib/api';
import { formatDate, formatWhen } from '../../../lib/format';
import { PURCHASE_WARRANTY_MONTHS } from '../../../lib/check';
import { integrationGroups, integrations } from '../../../lib/integrations';
import { sectionSlugs } from '../../../lib/settingsForm';
import { initials } from '../../../lib/view';
import { save, toggleIntegration } from './actions';

const t = de.portal.settings;

export const dynamic = 'force-dynamic';

const euro = (cents: number) => String(Math.round(cents) / 100).replace('.', ',');
const categories = Object.keys(de.deviceCategory) as DeviceCategory[];

function Text({
  name,
  label,
  value,
  type = 'text',
  wide,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  wide?: boolean;
}) {
  return (
    <div className={`field${wide ? ' wide' : ''}`}>
      <label htmlFor={`s-${name}`}>{label}</label>
      <input
        id={`s-${name}`}
        name={name}
        className="input"
        type={type}
        defaultValue={value}
        inputMode={type === 'number' ? 'decimal' : undefined}
      />
    </div>
  );
}

/** Mehrere Werte, einer pro Zeile (z. B. Antworten auf eine Rückfrage) */
function Lines({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div className="field">
      <label htmlFor={`s-${name}`}>{label}</label>
      <textarea id={`s-${name}`} name={name} className="input" rows={3} defaultValue={value} />
    </div>
  );
}

function Switch({ name, label, on }: { name: string; label: string; on: boolean }) {
  return (
    <label className="switch">
      <input type="checkbox" name={name} defaultChecked={on} />
      <span className="track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

function Remove({ name }: { name: string }) {
  return (
    <label className="remove">
      <input type="checkbox" name={name} />
      <span>{t.remove}</span>
    </label>
  );
}

function Profile({ s }: { s: DealerSettings }) {
  const p = s.profile;
  const days = de.sharing.hours.days;
  return (
    <>
      <div className="fgrid">
        <Text name="name" label={t.profile.name} value={p.name} />
        <Text name="shortName" label={t.profile.shortName} value={p.shortName} />
        <Text name="email" label={t.profile.email} value={p.email} type="email" />
        <Text name="phone" label={t.profile.phone} value={p.phone} type="tel" />
        <Text name="website" label={t.profile.website} value={p.website} />
      </div>
      <fieldset>
        <legend>{t.profile.hours}</legend>
        <div className="choices">
          {days.map((d, i) => (
            <label key={d} className="choice">
              <input
                type="checkbox"
                name="days"
                value={i + 1}
                defaultChecked={p.hours.days.includes(i + 1)}
              />
              <span>{d}</span>
            </label>
          ))}
        </div>
        <div className="fgrid narrow">
          <Text name="from" label={t.profile.from} value={p.hours.from} type="time" />
          <Text name="to" label={t.profile.to} value={p.hours.to} type="time" />
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.profile.branches}</legend>
        {[...p.branches, undefined].map((b, i) => (
          <div key={b?.id ?? 'neu'} className="rowform">
            <input type="hidden" name={`branch.${i}.id`} defaultValue={b?.id ?? ''} />
            <Text name={`branch.${i}.name`} label={t.profile.branch} value={b?.name} />
            <Text name={`branch.${i}.street`} label={t.profile.street} value={b?.street} />
            <Text name={`branch.${i}.zip`} label={t.profile.zip} value={b?.zip} />
            <Text name={`branch.${i}.city`} label={t.profile.city} value={b?.city} />
            <Text name={`branch.${i}.phone`} label={t.profile.phone} value={b?.phone} type="tel" />
            {b ? (
              <Remove name={`branch.${i}.remove`} />
            ) : (
              <span className="chip muted">{t.add}</span>
            )}
          </div>
        ))}
      </fieldset>
    </>
  );
}

function Messages({ s }: { s: DealerSettings }) {
  const m = s.messages;
  const example = {
    kunde: messagePreview.customer,
    fall: messagePreview.caseNumber,
    haendler: s.profile.shortName,
    telefon: s.profile.phone,
  };
  const block = (key: 'greeting' | 'away', label: string) => (
    <fieldset>
      <legend>{label}</legend>
      <Switch name={`${key}.enabled`} label={t.messages.enabled} on={m[key].enabled} />
      <div className="field">
        <label htmlFor={`s-${key}`} className="sr">
          {label}
        </label>
        <textarea
          id={`s-${key}`}
          name={`${key}.text`}
          className="input"
          rows={3}
          defaultValue={m[key].text}
        />
      </div>
      <div className="chips">
        <span className="row-sub">{t.messages.placeholders}</span>
        {['{kunde}', '{fall}', '{haendler}', '{telefon}'].map((x) => (
          <code key={x} className="chip">
            {x}
          </code>
        ))}
      </div>
      <p className="preview-bubble" aria-label={t.messages.preview}>
        {fillTemplate(m[key].text, example)}
      </p>
    </fieldset>
  );
  return (
    <>
      {block('greeting', t.messages.greeting)}
      {block('away', t.messages.away)}
      <fieldset>
        <legend>{t.messages.templates}</legend>
        {[...m.templates, undefined].map((x, i) => (
          <div key={x?.id ?? 'neu'} className="rowform two">
            <input type="hidden" name={`template.${i}.id`} defaultValue={x?.id ?? ''} />
            <Text name={`template.${i}.title`} label={t.messages.templateTitle} value={x?.title} />
            <div className="field wide">
              <label htmlFor={`s-template-${i}`}>{t.messages.templateText}</label>
              <textarea
                id={`s-template-${i}`}
                name={`template.${i}.text`}
                className="input"
                rows={2}
                defaultValue={x?.text}
              />
            </div>
            {x ? (
              <Remove name={`template.${i}.remove`} />
            ) : (
              <span className="chip muted">{t.add}</span>
            )}
          </div>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t.messages.questions}</legend>
        {[...m.questions, undefined].map((x, i) => (
          <div key={x?.id ?? 'neu'} className="rowform two">
            <input type="hidden" name={`question.${i}.id`} defaultValue={x?.id ?? ''} />
            <Text name={`question.${i}.question`} label={t.messages.question} value={x?.question} />
            <Lines
              name={`question.${i}.options`}
              label={t.messages.options}
              value={x ? formatOptions(x.options) : ''}
            />
            {x ? (
              <Remove name={`question.${i}.remove`} />
            ) : (
              <span className="chip muted">{t.add}</span>
            )}
          </div>
        ))}
      </fieldset>
    </>
  );
}

function Team({ s, me }: { s: DealerSettings; me?: string }) {
  const roles = Object.keys(t.team.roles) as (keyof typeof t.team.roles)[];
  return (
    <div className="team">
      {[...s.team, undefined].map((x, i) => (
        <div key={x?.id ?? 'neu'} className={`rowform team-row${x && !x.active ? ' off' : ''}`}>
          <span className="avatar" aria-hidden>
            {x ? initials(x.name) : '+'}
          </span>
          <input type="hidden" name={`member.${i}.id`} defaultValue={x?.id ?? ''} />
          <Text name={`member.${i}.name`} label={t.team.name} value={x?.name} />
          <Text name={`member.${i}.email`} label={t.team.email} value={x?.email} type="email" />
          <div className="field">
            <label htmlFor={`s-role-${i}`}>{t.team.role}</label>
            <select
              id={`s-role-${i}`}
              name={`member.${i}.role`}
              className="input"
              defaultValue={x?.role ?? 'sachbearbeitung'}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {t.team.roles[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`s-branch-${i}`}>{t.team.branch}</label>
            <select
              id={`s-branch-${i}`}
              name={`member.${i}.branchId`}
              className="input"
              defaultValue={x?.branchId ?? ''}
            >
              <option value="">{t.team.none}</option>
              {s.profile.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <Switch name={`member.${i}.active`} label={t.team.active} on={x?.active ?? true} />
          {x?.id === me ? (
            <span className="chip accent">{t.team.you}</span>
          ) : x ? (
            <Remove name={`member.${i}.remove`} />
          ) : (
            <span className="chip muted">{t.add}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function Rules({ s }: { s: DealerSettings }) {
  const r = s.rules;
  const team = s.team.filter((m) => m.active && m.role !== 'lesen');
  return (
    <>
      <fieldset>
        <legend>{t.rules.intake}</legend>
        <Switch name="autoAccept" label={t.rules.autoAccept} on={r.autoAccept} />
        <Switch name="requestProof" label={t.rules.requestProof} on={r.requestProof} />
      </fieldset>
      <fieldset>
        <legend>{t.rules.autoAssign}</legend>
        <div className="fgrid">
          {categories.map((c) => (
            <div key={c} className="field">
              <input type="hidden" name="assignCategory" value={c} />
              <label htmlFor={`s-assign-${c}`}>{de.deviceCategory[c]}</label>
              <select
                id={`s-assign-${c}`}
                name={`assign.${c}`}
                className="input"
                defaultValue={r.autoAssign.find((a) => a.category === c)?.assigneeId ?? ''}
              >
                <option value="">{t.team.none}</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.rules.warranty}</legend>
        <div className="fgrid">
          {/* Gesetzlich und gleich mit der App: nicht einstellbar (Portal-Prüfung 05.11.) */}
          <div className="field">
            <span className="flabel">{t.rules.warrantyMonths}</span>
            <p className="fvalue">{t.rules.warrantyFixed(PURCHASE_WARRANTY_MONTHS)}</p>
          </div>
          <Text
            name="goodwillMonths"
            label={t.rules.goodwillMonths}
            value={r.goodwillMonths}
            type="number"
          />
          <Text name="goodwillMax" label={t.rules.goodwillMax} value={euro(r.goodwillMaxCents)} />
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.rules.sla}</legend>
        <div className="fgrid">
          <Text
            name="slaFirstHours"
            label={t.rules.slaFirst}
            value={r.slaFirstHours}
            type="number"
          />
          <Text
            name="slaReplyHours"
            label={t.rules.slaReply}
            value={r.slaReplyHours}
            type="number"
          />
        </div>
      </fieldset>
    </>
  );
}

function Service({ s }: { s: DealerSettings }) {
  const v = s.service;
  return (
    <>
      <fieldset>
        <Switch name="ownService" label={t.service.own} on={v.ownService} />
        <div className="fgrid">
          <Text name="serviceName" label={t.service.name} value={v.serviceName} />
          <Text name="zipPrefixes" label={t.service.area} value={v.zipPrefixes.join(', ')} />
        </div>
        <div className="field">
          <label htmlFor="s-slots">{t.service.slots}</label>
          <textarea
            id="s-slots"
            name="slots"
            className="input"
            rows={4}
            defaultValue={v.slots.join('\n')}
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.service.prices}</legend>
        <div className="fgrid">
          <Text name="travel" label={t.service.travel} value={euro(v.prices.travelCents)} />
          <Text name="hour" label={t.service.hour} value={euro(v.prices.hourCents)} />
        </div>
      </fieldset>
      <fieldset>
        <legend>{t.service.partners}</legend>
        {[...v.partners, undefined].map((p, i) => (
          <div key={p?.name ?? 'neu'} className="rowform two">
            <Text name={`partner.${i}.name`} label={t.service.name} value={p?.name} />
            <Switch
              name={`partner.${i}.authorized`}
              label={t.service.authorized}
              on={p?.authorized ?? false}
            />
            {p ? (
              <Remove name={`partner.${i}.remove`} />
            ) : (
              <span className="chip muted">{t.add}</span>
            )}
          </div>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t.service.savings}</legend>
        <div className="fgrid">
          <Text name="visit" label={t.service.visit} value={euro(v.savings.visitCents)} />
          <Text name="return" label={t.service.return} value={euro(v.savings.returnCents)} />
        </div>
      </fieldset>
    </>
  );
}

function Notifications({ s }: { s: DealerSettings }) {
  const n = s.notifications;
  const rows = ['newCase', 'overdue', 'customerReply'] as const;
  return (
    <>
      <table className="matrix">
        <thead>
          <tr>
            <th scope="col">{t.notifications.event}</th>
            <th scope="col">{t.notifications.email}</th>
            <th scope="col">{t.notifications.push}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th scope="row">{t.notifications[r]}</th>
              {(['email', 'push'] as const).map((c) => (
                <td key={c}>
                  <label className="switch">
                    <input type="checkbox" name={`${r}.${c}`} defaultChecked={n[r][c]} />
                    <span className="track" aria-hidden />
                    <span className="sr">
                      {t.notifications[r]}, {t.notifications[c]}
                    </span>
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <Switch name="dailyReport" label={t.notifications.dailyReport} on={n.dailyReport} />
      <Text name="recipients" label={t.notifications.recipients} value={n.recipients} wide />
    </>
  );
}

async function Privacy({ s }: { s: DealerSettings }) {
  const p = s.privacy;
  const { cases } = await listCases();
  const log = cases
    .flatMap((r) => (r.access ?? []).map((a) => ({ ...a, caseId: r.file.caseId })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 25);
  return (
    <>
      <div className="fgrid">
        <div className="field">
          <label htmlFor="s-retention">{t.privacy.retention}</label>
          <select
            id="s-retention"
            name="retentionMonths"
            className="input"
            defaultValue={p.retentionMonths}
          >
            {[12, 24, 36, 60, 120].map((m) => (
              <option key={m} value={m}>
                {t.privacy.months(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="flabel">{t.privacy.avv}</span>
          <span className={`chip ${p.avvSignedAt ? 'ok' : 'warn'}`}>
            {p.avvSignedAt ? t.privacy.avvSigned(formatDate(p.avvSignedAt)) : t.privacy.avvMissing}
          </span>
        </div>
      </div>
      <Switch name="accessLog" label={t.privacy.accessLog} on={p.accessLog} />
      <h3 className="h3">{t.privacy.log}</h3>
      <table className="matrix log-table">
        <thead>
          <tr>
            <th scope="col">{t.privacy.logAt}</th>
            <th scope="col">{t.privacy.logCase}</th>
            <th scope="col">{t.privacy.logBy}</th>
          </tr>
        </thead>
        <tbody>
          {log.map((a, i) => (
            <tr key={i}>
              <td className="num">{formatWhen(a.at)}</td>
              <td>
                <Link href={`/faelle/${encodeURIComponent(a.caseId)}`} className="num">
                  {a.caseId}
                </Link>
              </td>
              <td>{a.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Integrations({ s }: { s: DealerSettings }) {
  const g = t.integrations;
  return (
    <div className="stack">
      {integrationGroups.map((group) => (
        <section key={group} className="stack tight">
          <h2 className="h3">{g.groups[group]}</h2>
          <ul className="tiles">
            {integrations
              .filter((x) => x.group === group)
              .map((x) => {
                const on = s.integrations[x.key] === 'verbunden';
                return (
                  <li key={x.key} className={`tile${on ? ' on' : ''}`}>
                    <span className="logo" aria-hidden>
                      {x.icon ? (
                        <svg viewBox="0 0 24 24">
                          <path d={x.icon} />
                        </svg>
                      ) : (
                        <span className="mono">{initials(x.name)}</span>
                      )}
                    </span>
                    <span className="tile-name">{x.name}</span>
                    {on ? <span className="chip ok">{g.connected}</span> : null}
                    <form action={toggleIntegration}>
                      <input type="hidden" name="key" value={x.key} />
                      <input type="hidden" name="value" value={on ? 'getrennt' : 'verbunden'} />
                      <button
                        className={`btn btn-sm${on ? ' btn-2' : ''}`}
                        type="submit"
                        aria-label={on ? g.disconnectLabel(x.name) : g.connectLabel(x.name)}
                      >
                        {on ? g.disconnect : g.connect}
                      </button>
                    </form>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default async function Bereich({ params }: { params: Promise<{ bereich: string }> }) {
  const { bereich } = await params;
  const section = settingsSections.find((x) => sectionSlugs[x] === bereich);
  if (!section) notFound();
  const { tenant, settings } = await getSettings();
  const body: Record<SettingsSection, React.ReactNode> = {
    profile: <Profile s={settings} />,
    messages: <Messages s={settings} />,
    team: <Team s={settings} me={tenant.memberId} />,
    rules: <Rules s={settings} />,
    service: <Service s={settings} />,
    notifications: <Notifications s={settings} />,
    privacy: <Privacy s={settings} />,
    integrations: <Integrations s={settings} />,
  };
  return (
    <>
      <Nav dealer={tenant.name} user={tenant.userName} current="einstellungen" />
      <section className="panel chambray head">
        <div className="wrap stack">
          <h1 className="h1">{t.title}</h1>
        </div>
      </section>
      <main className="wrap settings">
        <nav className="snav" aria-label={t.title}>
          {settingsSections.map((x) => (
            <Link
              key={x}
              href={`/einstellungen/${sectionSlugs[x]}`}
              aria-current={x === section ? 'page' : undefined}
            >
              {t.sections[x]}
            </Link>
          ))}
        </nav>
        <section className="card scard">
          <h2 className="h2">{t.sections[section]}</h2>
          {section === 'integrations' ? (
            body[section]
          ) : (
            <SettingsForm action={save.bind(null, section)} label={t.sections[section]}>
              {body[section]}
            </SettingsForm>
          )}
        </section>
      </main>
    </>
  );
}
