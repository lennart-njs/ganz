// Fristenampel: erste Reaktion auf neue Fälle, Antwort auf die Kundschaft (Regeln des Händlers).
// Mit Servicezeiten zählt nur die Zeit, in der der Händler arbeitet (Portal-Idee 4): Ein Fall vom
// Samstagabend ist am Montag um 8 nicht schon überfällig. Außerhalb der Servicezeit ruht die Frist.
// Gerechnet über den Berliner Zeitversatz aus model/policies/regulator.ts, ohne Intl je Schritt.
import { de } from '@/i18n/de';
import { berlinOffset } from '@/model/policies/regulator';
import type { DealerSettings } from '@/model/portal';
import type { SharedCaseRecord } from '@/model/sharing';

const MIN = 60_000;
const H = 60 * MIN;
const t = de.portal;

export type SlaTone = 'ok' | 'warn' | 'over';
export interface Sla {
  tone: SlaTone;
  label: string;
  dueAt: string;
  /** Millisekunden bis zur Frist, negativ: überfällig. Mit Servicezeiten: nur Servicezeit. */
  left: number;
  /** Gerade keine Servicezeit: Die Frist ruht */
  paused?: boolean;
}

type Hours = DealerSettings['profile']['hours'];
const DAY = 24 * H;
const minutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
/** Berliner Wandzeit (als UTC-Zahl) → Zeitpunkt */
const fromWall = (wall: number) => wall - berlinOffset(wall - berlinOffset(wall));

/** Servicezeit-Fenster [Beginn, Ende) ab dem Berliner Tag von t, höchstens 60 Tage weit */
function* windows(t: number, hours: Hours): Generator<[number, number]> {
  const wall = t + berlinOffset(t);
  let day = Math.floor(wall / DAY) * DAY;
  for (let i = 0; i < 60; i++, day += DAY) {
    const wd = new Date(day).getUTCDay();
    if (!hours.days.includes(wd === 0 ? 7 : wd)) continue;
    const start = fromWall(day + minutes(hours.from) * MIN);
    const end = fromWall(day + minutes(hours.to) * MIN);
    if (end > start) yield [start, end];
  }
}

/** Servicezeit zwischen a und b (a ≤ b) */
export function serviceTime(a: number, b: number, hours: Hours): number {
  let sum = 0;
  for (const [s, e] of windows(a, hours)) {
    if (s >= b) break;
    sum += Math.max(0, Math.min(e, b) - Math.max(s, a));
  }
  return sum;
}

/** Der Zeitpunkt, an dem ab a so viel Servicezeit vergangen ist */
export function addServiceTime(a: number, ms: number, hours: Hours): number {
  let rest = ms;
  for (const [s, e] of windows(a, hours)) {
    const from = Math.max(s, a);
    if (e <= from) continue;
    if (rest <= e - from) return from + rest;
    rest -= e - from;
  }
  return a + ms;
}

const inWindow = (t: number, hours: Hours) => serviceTime(t, t + MIN, hours) > 0;

/** „35 Min.“, „5 Std.“, „3 Tage“ */
export function duration(ms: number): string {
  const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return t.duration.min(m);
  const h = Math.round(ms / H);
  if (h < 48) return t.duration.h(h);
  return t.duration.d(Math.round(ms / (24 * H)));
}

/** service: Servicezeiten des Händlers. Ohne sie (oder ohne Tage) zählt jede Stunde. */
export function sla(
  r: SharedCaseRecord,
  rules: DealerSettings['rules'],
  now = Date.now(),
  service?: Hours,
): Sla | null {
  const wf = r.workflow;
  if (!wf || r.revokedAt) return null;
  let start: string;
  let hours: number;
  if (wf.status === 'neu') {
    start = r.file.sharedAt;
    hours = rules.slaFirstHours;
  } else if (wf.status === 'wartet_uns') {
    start = wf.lastCustomerAt ?? wf.since;
    hours = rules.slaReplyHours;
  } else return null;
  const from = Date.parse(start);
  const budget = hours * H;
  const timed = !!service?.days.length;
  const due = timed ? addServiceTime(from, budget, service) : from + budget;
  const left = !timed
    ? due - now
    : now <= due
      ? serviceTime(now, due, service)
      : -serviceTime(due, now, service);
  const paused = timed && !inWindow(now, service);
  const tone: SlaTone = left < 0 ? 'over' : left < Math.max(budget * 0.25, H) ? 'warn' : 'ok';
  const text = left < 0 ? t.sla.overdue(duration(-left)) : t.sla.left(duration(left));
  return {
    tone,
    left,
    dueAt: new Date(due).toISOString(),
    label: paused ? t.sla.paused(text) : text,
    ...(paused ? { paused } : {}),
  };
}
