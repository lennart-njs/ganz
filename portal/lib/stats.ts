// Auswertung: Zahlen aus den Fällen der Demo (Entscheidung 37). Fälle mit Weitergabe und anonyme
// Fälle an Geräten des Händlers, die ohne ihn gelöst wurden oder woanders hin gingen.
import type { AnonymousOutcome, DealerSettings } from '@/model/portal';
import type { SharedCaseRecord } from '@/model/sharing';

const DAY = 86_400_000;
export const WEEKS = 12;

export const outcomeKeys = [
  'selbst_geloest',
  'im_call_geloest',
  'haendler',
  'versicherer',
  'betrieb',
] as const;
export type OutcomeKey = (typeof outcomeKeys)[number];

export interface Week {
  start: string;
  counts: Record<OutcomeKey, number>;
  total: number;
}

export interface Stats {
  weeks: Week[];
  total: number;
  /** Anteil ohne Einsatz gelöst, 0 bis 1 */
  selfShare: number;
  visits: number;
  returns: number;
  savedCents: number;
  /** Median in Tagen von Weitergabe bis erledigt */
  throughputDays?: number;
  /** Median in Stunden bis zur ersten Antwort eines Menschen */
  firstReplyHours?: number;
  ratingAvg?: number;
  ratingCount: number;
  top: { problem: string; model: string; count: number }[];
}

const median = (xs: number[]) => {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export function computeStats(
  cases: SharedCaseRecord[],
  anonymous: AnonymousOutcome[],
  s: DealerSettings,
  now = Date.now(),
): Stats {
  const from = now - WEEKS * 7 * DAY;
  const empty = () =>
    Object.fromEntries(outcomeKeys.map((k) => [k, 0])) as Record<OutcomeKey, number>;
  const weeks: Week[] = Array.from({ length: WEEKS }, (_, i) => ({
    start: new Date(from + i * 7 * DAY).toISOString(),
    counts: empty(),
    total: 0,
  }));
  const bucket = (at: string) => {
    const i = Math.floor((Date.parse(at) - from) / (7 * DAY));
    return i >= 0 && i < WEEKS ? weeks[i] : undefined;
  };
  const shared = cases.filter((r) => !r.revokedAt && Date.parse(r.file.sharedAt) >= from);
  const anon = anonymous.filter((a) => Date.parse(a.at) >= from);

  for (const a of anon) {
    const w = bucket(a.at);
    if (w) {
      w.counts[a.outcome]++;
      w.total++;
    }
  }
  for (const r of shared) {
    const w = bucket(r.file.sharedAt);
    if (w) {
      w.counts.haendler++;
      w.total++;
    }
  }

  const total = anon.length + shared.length;
  const selfAnon = anon.filter(
    (a) => a.outcome === 'selbst_geloest' || a.outcome === 'im_call_geloest',
  ).length;
  const selfShared = shared.filter((r) => r.file.case.resolution === 'selbst_geloest').length;
  const visits = selfAnon + selfShared;
  const returns = shared.filter(
    (r) =>
      r.file.case.resolution === 'repariert' || r.file.case.resolution === 'ersatzteil_eingebaut',
  ).length;

  const done = shared.filter((r) => r.file.case.closedAt);
  const throughputDays = median(
    done.map((r) => (Date.parse(r.file.case.closedAt!) - Date.parse(r.file.sharedAt)) / DAY),
  );
  const firstReplyHours = median(
    shared.flatMap((r) => {
      const first = r.retailerEvents.find((e) => !e.payload.auto);
      return first ? [(Date.parse(first.at) - Date.parse(r.file.sharedAt)) / 3_600_000] : [];
    }),
  );
  const ratings = shared.flatMap((r) => (r.file.rating ? [r.file.rating] : []));

  const groups = new Map<string, { problem: string; model: string; count: number }>();
  const add = (problem: string, model: string) => {
    const k = `${problem}|${model}`;
    const g = groups.get(k) ?? { problem, model, count: 0 };
    g.count++;
    groups.set(k, g);
  };
  for (const a of anon) add(a.problem, a.model);
  for (const r of shared)
    add(r.file.case.problemLabel, `${r.file.device.manufacturer} ${r.file.device.model}`);

  return {
    weeks,
    total,
    selfShare: total ? visits / total : 0,
    visits,
    returns,
    savedCents: visits * s.service.savings.visitCents + returns * s.service.savings.returnCents,
    throughputDays,
    firstReplyHours,
    ratingAvg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : undefined,
    ratingCount: ratings.length,
    top: [...groups.values()].sort((a, b) => b.count - a.count).slice(0, 8),
  };
}
