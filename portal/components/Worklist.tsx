'use client';

// Arbeitsliste: Warteschlangen, Suche, „Mir zugewiesen“, Liste oder Tafel, Sammelaktionen und
// Tastatur (j, k, x, Enter). Die Daten kommen fertig vom Server, gefiltert wird hier sofort.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { de } from '@/i18n/de';
import { workflowStatuses, type WorkflowStatus } from '@/model/portal';

import { bulkAction, moveCase } from '../app/actions';
import type { Row } from '../lib/rows';
import { Avatar, SlaChip, WorkflowChip } from './Chips';
import { useIntentionalChange } from './Small';
import { typing } from './Shortcuts';

const t = de.portal;
type Queue = WorkflowStatus | 'offen' | 'alle';
const queues: Queue[] = ['offen', ...workflowStatuses];

const inQueue = (r: Row, q: Queue) =>
  q === 'alle' ? true : q === 'offen' ? r.status !== 'erledigt' : r.status === q;

const toneRank = { over: 0, warn: 1, ok: 2 } as const;
const rankOf = (r: Row) => (r.sla ? toneRank[r.sla.tone] : 3);
/**
 * Überfällige und knappe Fristen zuerst, die dringendste oben. Danach die neuesten zuerst: Ein Fall,
 * der gerade hereinkommt, steht oben in seinem Block und nicht unter Fällen mit mehr Zeit.
 */
const byUrgency = (a: Row, b: Row) => {
  const d = rankOf(a) - rankOf(b);
  if (d) return d;
  if (rankOf(a) < 2) return a.sla!.left - b.sla!.left || b.sharedAt.localeCompare(a.sharedAt);
  return b.sharedAt.localeCompare(a.sharedAt);
};

export function Worklist({
  title,
  rows,
  team,
  me,
  initialQueue,
  initialView,
}: {
  title: string;
  rows: Row[];
  team: { id: string; name: string }[];
  me?: string;
  initialQueue?: Queue;
  initialView: 'liste' | 'tafel';
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<Queue>(initialQueue ?? 'offen');
  const [query, setQuery] = useState('');
  const [mine, setMine] = useState(false);
  const [view, setView] = useState(initialView);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focus, setFocus] = useState(0);
  const [flash, setFlash] = useState<string>();
  const [pending, start] = useTransition();
  // Tafel: Verschieben sofort zeigen, bis der Server es bestätigt. Neue Daten vom Server lösen
  // den eigenen Stand ab, sonst bliebe eine Karte stehen, die jemand anders weiterbewegt hat.
  const [moved, setMoved] = useState<Record<string, WorkflowStatus>>({});
  const [seenRows, setSeenRows] = useState(rows);
  if (rows !== seenRows) {
    setSeenRows(rows);
    setMoved({});
  }
  const listRef = useRef<HTMLUListElement>(null);

  const all = useMemo(
    () => rows.map((r) => (moved[r.id] ? { ...r, status: moved[r.id]! } : r)),
    [rows, moved],
  );
  const q = query.trim().toLowerCase();
  const base = all.filter(
    (r) =>
      (!mine || r.assignee?.id === me) &&
      (!q || q.split(/\s+/).every((w) => r.haystack.includes(w))),
  );
  // Beim Suchen zählen alle Warteschlangen
  const shown = base.filter((r) => q || inQueue(r, queue)).sort(byUrgency);
  const count = (x: Queue) => base.filter((r) => inQueue(r, x)).length;
  const focusIndex = Math.min(focus, Math.max(0, shown.length - 1));

  // Warteschlange und Ansicht in der Adresse, damit Neuladen und Zurück passen
  useEffect(() => {
    const u = new URL(window.location.href);
    u.searchParams.set('stand', queue);
    if (view === 'tafel') u.searchParams.set('ansicht', 'tafel');
    else u.searchParams.delete('ansicht');
    window.history.replaceState(null, '', u);
  }, [queue, view]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Tastatur: j, k, x, Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e) || view !== 'liste') return;
      const row = shown[focusIndex];
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocus(Math.min(shown.length - 1, focusIndex + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocus(Math.max(0, focusIndex - 1));
      } else if (e.key === 'x' && row) {
        toggle(row.id);
      } else if ((e.key === 'Enter' || e.key === 'o') && row) {
        if ((e.target as HTMLElement).closest('a,button')) return;
        router.push(`/faelle/${encodeURIComponent(row.id)}`);
      } else if (e.key === 'Escape') {
        setSelected(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${focusIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focusIndex]);

  const runBulk = (action: Parameters<typeof bulkAction>[1]) => {
    const ids = [...selected];
    start(async () => {
      const n = await bulkAction(ids, action);
      setSelected(new Set());
      setFlash(t.list.bulkDone(n));
      router.refresh();
    });
  };

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(undefined), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  const move = (id: string, status: WorkflowStatus) => {
    setMoved((m) => ({ ...m, [id]: status }));
    start(async () => {
      await moveCase(id, status);
      router.refresh();
    });
  };

  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(r.id));

  return (
    <>
      <section className="panel chambray head">
        <div className="wrap stack">
          <div className="titlebar">
            <h1 className="h1">{title}</h1>
            <div className="tools">
              <label className="search">
                <span className="sr">{t.list.search}</span>
                <input
                  data-search
                  type="search"
                  className="input"
                  placeholder={t.list.searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setFocus(0);
                  }}
                />
                <kbd aria-hidden>/</kbd>
              </label>
            </div>
          </div>
          <div className="filterbar">
            <nav className="filters" aria-label={t.list.queues}>
              {queues.map((x) => (
                <button
                  key={x}
                  type="button"
                  className="filter"
                  aria-pressed={!q && x === queue}
                  onClick={() => {
                    setQueue(x);
                    setFocus(0);
                  }}
                >
                  {x === 'offen' ? t.list.open_ : x === 'alle' ? t.list.all : t.workflow[x]}
                  <span className="n">{count(x)}</span>
                </button>
              ))}
            </nav>
            <div className="filters">
              <button
                type="button"
                className="filter"
                aria-pressed={mine}
                onClick={() => setMine((m) => !m)}
              >
                {t.list.mine}
              </button>
              <div className="seg" role="group" aria-label={t.list.view}>
                {(['liste', 'tafel'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                  >
                    {v === 'liste' ? t.list.viewList : t.list.viewBoard}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className={view === 'tafel' ? 'boardwrap' : 'wrap'}>
        {view === 'liste' ? (
          shown.length === 0 ? (
            <p className="empty">{t.list.empty}</p>
          ) : (
            <>
              <div className="listhead">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={() =>
                      setSelected(allShownSelected ? new Set() : new Set(shown.map((r) => r.id)))
                    }
                  />
                  <span className="sr">{t.list.selectAll}</span>
                </label>
                <span>{t.list.columns.case}</span>
                <span>{t.list.columns.customer}</span>
                <span>{t.list.columns.problem}</span>
                <span>{t.list.columns.assignee}</span>
                <span>{t.list.columns.due}</span>
              </div>
              <ul className="rows" ref={listRef}>
                {shown.map((r, i) => (
                  <li
                    key={r.id}
                    data-index={i}
                    className={`row${r.revoked ? ' off' : ''}${i === focusIndex ? ' focus' : ''}${selected.has(r.id) ? ' sel' : ''}`}
                  >
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                      <span className="sr">{t.list.select(r.id)}</span>
                    </label>
                    {/* Kein aria-label: Screenreader lesen die ganze Zeile, Kundschaft, Problem,
                        Stand und Frist, nicht nur „Fall … öffnen“ */}
                    <Link
                      className="row-link"
                      href={`/faelle/${encodeURIComponent(r.id)}`}
                      onFocus={() => setFocus(i)}
                    >
                      <span className="sr">{t.list.open(r.id)}: </span>
                      <span>
                        <span className="row-id num">
                          {r.unread ? <Unread /> : null}
                          {r.id}
                        </span>
                        <span className="row-when">{r.when}</span>
                      </span>
                      <span>
                        <span className="row-who">{r.revoked ? '–' : r.customer}</span>
                        <span className="row-sub">{r.device}</span>
                      </span>
                      <span className="row-problem">
                        <span>{r.problem}</span>
                        {r.preview ? (
                          <span
                            className={`row-sub preview${r.preview.fromCustomer ? ' them' : ''}`}
                          >
                            {r.preview.text}
                          </span>
                        ) : null}
                      </span>
                      <span className="row-who-col">
                        <Avatar name={r.assignee?.name} />
                        <span className="row-sub">{r.assignee?.name ?? t.list.unassigned}</span>
                      </span>
                      <span className="row-state">
                        <WorkflowChip
                          status={r.status}
                          revoked={r.revoked}
                          cancelled={r.cancelled}
                        />
                        <SlaChip sla={r.sla} />
                        {r.rework ? <span className="chip ok">{t.list.rework}</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : (
          <div className="board">
            {workflowStatuses.map((col) => {
              const cards = base.filter((r) => r.status === col).sort(byUrgency);
              return (
                <section
                  key={col}
                  className="col"
                  aria-label={t.workflow[col]}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) move(id, col);
                  }}
                >
                  <h2 className="colhead">
                    {t.workflow[col]} <span className="n">{cards.length}</span>
                  </h2>
                  <ul className="cards">
                    {cards.map((r) => (
                      <li
                        key={r.id}
                        draggable={!r.revoked}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                        className={`kcard${r.revoked ? ' off' : ''}`}
                      >
                        <Link href={`/faelle/${encodeURIComponent(r.id)}`}>
                          <span className="sr">{t.list.open(r.id)}: </span>
                          <span className="kline">
                            <span className="row-id num">
                              {r.unread ? <Unread /> : null}
                              {r.id}
                            </span>
                            <Avatar name={r.assignee?.name} size="sm" />
                          </span>
                          <span className="row-who">{r.customer || '–'}</span>
                          <span className="row-sub">{r.problem}</span>
                          <span className="chips">
                            <SlaChip sla={r.sla} />
                            {r.decision ? <span className="chip">{r.decision}</span> : null}
                          </span>
                        </Link>
                        {r.revoked ? null : (
                          <MoveSelect
                            key={r.status}
                            id={r.id}
                            status={r.status}
                            onMove={(s) => move(r.id, s)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {selected.size ? (
        <div className="bulk" role="region" aria-label={t.list.selected(selected.size)}>
          <span className="bulk-n">{t.list.selected(selected.size)}</span>
          <button
            className="btn btn-sm"
            type="button"
            disabled={pending}
            onClick={() => runBulk({ type: 'annehmen' })}
          >
            {t.list.bulkAccept}
          </button>
          <BulkSelect
            label={t.list.bulkAssign}
            disabled={pending}
            options={[
              ...team.map((m) => ({ value: m.id, label: m.name })),
              { value: '-', label: t.list.unassigned },
            ]}
            onPick={(v) => runBulk({ type: 'zuweisen', assigneeId: v === '-' ? null : v })}
          />
          <BulkSelect
            label={t.list.bulkState}
            disabled={pending}
            options={workflowStatuses.map((s) => ({ value: s, label: t.workflow[s] }))}
            onPick={(v) => runBulk({ type: 'stand', status: v as WorkflowStatus })}
          />
          <button className="btn btn-2 btn-sm" type="button" onClick={() => setSelected(new Set())}>
            {t.list.bulkClear}
          </button>
        </div>
      ) : null}
      {flash ? (
        <p className="flash floating" role="status">
          <span className="dot" aria-hidden />
          {flash}
        </p>
      ) : null}
    </>
  );
}

/** Auswahl in der Sammelleiste: mit Maus sofort, mit Tastatur erst mit „Übernehmen“ */
function BulkSelect({
  label,
  options,
  disabled,
  onPick,
}: {
  label: string;
  options: { value: string; label: string }[];
  disabled: boolean;
  onPick: (value: string) => void;
}) {
  const [value, setValue] = useState('');
  const pick = (v: string) => {
    setValue('');
    change.reset();
    if (v) onPick(v);
  };
  const change = useIntentionalChange((el) => pick(el.value));
  return (
    <>
      <label className="bulk-select">
        <span className="sr">{label}</span>
        <select
          className="input"
          value={value}
          disabled={disabled}
          {...change.props}
          onChange={(e) => {
            const v = e.target.value;
            if (change.immediate()) pick(v);
            else setValue(v);
          }}
        >
          <option value="" disabled>
            {label}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {change.pending && value ? (
        <button
          className="btn btn-sm"
          type="button"
          disabled={disabled}
          onClick={() => pick(value)}
        >
          {t.apply}
        </button>
      ) : null}
    </>
  );
}

/**
 * Verschieben ohne Ziehen, für Tastatur und Screenreader. Erst sichtbar, wenn es den Fokus hat.
 * Mit der Tastatur wirkt es erst mit „Übernehmen“ oder Enter.
 */
function MoveSelect({
  id,
  status,
  onMove,
}: {
  id: string;
  status: WorkflowStatus;
  onMove: (status: WorkflowStatus) => void;
}) {
  const [value, setValue] = useState<WorkflowStatus>(status);
  const go = (v: string) => {
    change.reset();
    if (v !== status) onMove(v as WorkflowStatus);
  };
  const change = useIntentionalChange((el) => go(el.value));
  return (
    <div className={`kmove${change.pending ? ' open' : ''}`}>
      <label className="field">
        <span>{t.list.moveCase(id)}</span>
        <select
          className="input"
          value={value}
          {...change.props}
          onChange={(e) => {
            const v = e.target.value as WorkflowStatus;
            setValue(v);
            if (change.immediate()) go(v);
          }}
        >
          {workflowStatuses.map((s) => (
            <option key={s} value={s}>
              {t.workflow[s]}
            </option>
          ))}
        </select>
      </label>
      {change.pending && value !== status ? (
        <button className="btn btn-sm" type="button" onClick={() => go(value)}>
          {t.apply}
        </button>
      ) : null}
    </div>
  );
}

/** Punkt für eine neue Nachricht, für Screenreader mit Wort */
function Unread() {
  return (
    <>
      <span className="unread" title={t.list.unread} aria-hidden />
      <span className="sr">{t.list.unread}, </span>
    </>
  );
}
