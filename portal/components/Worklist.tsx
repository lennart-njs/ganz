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
import { typing } from './Shortcuts';

const t = de.portal;
type Queue = WorkflowStatus | 'offen' | 'alle';
const queues: Queue[] = ['offen', ...workflowStatuses];

const inQueue = (r: Row, q: Queue) =>
  q === 'alle' ? true : q === 'offen' ? r.status !== 'erledigt' : r.status === q;

/** Dringendes zuerst: Fristen aufsteigend, dann neueste */
const byUrgency = (a: Row, b: Row) =>
  (a.sla?.left ?? Infinity) - (b.sla?.left ?? Infinity) || b.sharedAt.localeCompare(a.sharedAt);

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
  // Tafel: Verschieben sofort zeigen, bis der Server es bestätigt
  const [moved, setMoved] = useState<Record<string, WorkflowStatus>>({});
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
                    <Link
                      className="row-link"
                      href={`/faelle/${encodeURIComponent(r.id)}`}
                      aria-label={t.list.open(r.id)}
                      onFocus={() => setFocus(i)}
                    >
                      <span>
                        <span className="row-id num">
                          {r.unread ? <span className="unread" title={t.list.unread} /> : null}
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
                        <WorkflowChip status={r.status} revoked={r.revoked} />
                        <SlaChip sla={r.sla} />
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
                        <Link
                          href={`/faelle/${encodeURIComponent(r.id)}`}
                          aria-label={t.list.open(r.id)}
                        >
                          <span className="kline">
                            <span className="row-id num">
                              {r.unread ? <span className="unread" title={t.list.unread} /> : null}
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
                        <label className="sr">
                          {t.list.moveTo('')}
                          <select
                            value={r.status}
                            onChange={(e) => move(r.id, e.target.value as WorkflowStatus)}
                          >
                            {workflowStatuses.map((s) => (
                              <option key={s} value={s}>
                                {t.workflow[s]}
                              </option>
                            ))}
                          </select>
                        </label>
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
          <label className="bulk-select">
            <span className="sr">{t.list.bulkAssign}</span>
            <select
              className="input"
              value=""
              disabled={pending}
              onChange={(e) =>
                runBulk({
                  type: 'zuweisen',
                  assigneeId: e.target.value === '-' ? null : e.target.value,
                })
              }
            >
              <option value="" disabled>
                {t.list.bulkAssign}
              </option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
              <option value="-">{t.list.unassigned}</option>
            </select>
          </label>
          <label className="bulk-select">
            <span className="sr">{t.list.bulkState}</span>
            <select
              className="input"
              value=""
              disabled={pending}
              onChange={(e) => runBulk({ type: 'stand', status: e.target.value as WorkflowStatus })}
            >
              <option value="" disabled>
                {t.list.bulkState}
              </option>
              {workflowStatuses.map((s) => (
                <option key={s} value={s}>
                  {t.workflow[s]}
                </option>
              ))}
            </select>
          </label>
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
