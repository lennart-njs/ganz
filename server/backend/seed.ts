// Beispielfälle für das Händlerportal (Demo, Entscheidung 37). 42 Fälle mit Weitergabe und anonyme
// Zahlen für die Auswertung, verteilt über zwölf Wochen. Jeder Fall erzählt eine kurze, stimmige
// Geschichte zu seinem Stand und zur Entscheidung: Eine Antwort kommt nur auf eine Frage, ein
// Wochentag nur nach dem Termin. Fründ handelt in seinen Öffnungszeiten, die Kundschaft schreibt
// tagsüber. Zufall mit festem Startwert, damit die Demo jedes Mal gleich aussieht. Wer und was hängt
// nicht von der Uhrzeit ab, nur die Zeitpunkte. Namen, Preise und Texte aus config/.
import { demoConfig } from '@/config/demo.config';
import { fruendSettings, portalSeed } from '@/config/portal.demo';
import { catalog, manufacturers } from '@/data/catalog';
import { de } from '@/i18n/de';
import { caseStatusLabel } from '@/lib/caseView';
import { getGuide } from '@/lib/guideCatalog';
import { DEFAULT_REGULATOR_RULES } from '@/model/policies/regulator';
import {
  fillTemplate,
  inServiceHours,
  type AnonymousOutcome,
  type DealerSettings,
  type InternalNote,
  type WorkflowStatus,
} from '@/model/portal';
import {
  SHARE_FORMAT_VERSION,
  retailerEventType,
  type PartStatus,
  type RetailerAction,
  type RetailerDecision,
  type SharedCaseFile,
  type SharedCaseRecord,
} from '@/model/sharing';
import type { CaseEvent, CaseResolution, CaseStatus, DeviceCategory } from '@/model/types';

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;
const WEEK = 7 * D;

const iso = (t: number) => new Date(t).toISOString();

/** Zufall mit festem Startwert (mulberry32) */
function random(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mischt eine Liste mit festem Zufall */
function shuffle<T>(list: readonly T[], r: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// ---------- Uhrzeit in Löhne ----------

type Hours = { days: number[]; from: string; to: string };
type Gap = readonly [number, number];

const service: Hours = fruendSettings.profile.hours;
const awake: Hours = portalSeed.customerHours;
/** Wann die Beispielfälle geteilt wurden: meist tagsüber, manche am Abend nach Ladenschluss */
const shareHours: Hours = { ...service, from: '07:00', to: '20:00' };

const berlin = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
  weekday: 'short',
});
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Der Tag in Berlin: Beginn als Zeitpunkt und Wochentag (1 = Montag bis 7 = Sonntag) */
function berlinDay(t: number): { start: number; weekday: number } {
  const p = Object.fromEntries(berlin.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  const [y, m, d] = [Number(p.year), Number(p.month) - 1, Number(p.day)];
  const offset = Date.UTC(y, m, d, Number(p.hour), Number(p.minute)) - Math.floor(t / MIN) * MIN;
  return { start: Date.UTC(y, m, d) - offset, weekday: WEEKDAYS.indexOf(String(p.weekday)) + 1 };
}

const clock = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return ((h ?? 0) * 60 + (m ?? 0)) * MIN;
};

/** Zeitfenster zwischen a und b, in denen jemand da ist */
function windows(a: number, b: number, hours: Hours): [number, number][] {
  const out: [number, number][] = [];
  const first = berlinDay(a).start;
  for (let k = 0; k < 120; k++) {
    const day = berlinDay(first + k * D + 12 * H);
    if (day.start > b) break;
    if (!hours.days.includes(day.weekday)) continue;
    const s = Math.max(a, day.start + clock(hours.from));
    const e = Math.min(b, day.start + clock(hours.to));
    if (e > s) out.push([s, e]);
  }
  return out;
}

/**
 * Geht von t aus so viel offene Zeit vor (dir 1) oder zurück (dir -1). Offene Zeit zählt nur in den
 * Fenstern: Vier Stunden ab Freitag 16 Uhr enden am Montag um 10 Uhr.
 */
function walk(t: number, amount: number, hours: Hours, dir: 1 | -1): number {
  let rest = amount;
  let from = t;
  for (let k = 0; k < 20; k++) {
    const [a, b] = dir > 0 ? [from, from + 2 * D] : [from - 2 * D, from];
    const ws = windows(a, b, hours);
    for (const [s, e] of dir > 0 ? ws : ws.reverse()) {
      if (rest <= e - s) return dir > 0 ? s + rest : e - rest;
      rest -= e - s;
    }
    from = dir > 0 ? b : a;
  }
  return t + dir * amount;
}

/** Nächster Schritt: min bis max Stunden offene Zeit nach t, f wählt dazwischen */
const after = (t: number, [min, max]: Gap, hours: Hours, f: number) =>
  walk(t, (min + f * (max - min)) * H, hours, 1);

/** Voriger Schritt: min bis max Stunden offene Zeit vor t */
const before = (t: number, [min, max]: Gap, hours: Hours, f: number) =>
  walk(t, (min + f * (max - min)) * H, hours, -1);

/** t, wenn jemand da ist. Sonst das nähere Fenster davor oder danach, aber nicht nach latest. */
function nearest(t: number, hours: Hours, latest: number, f: number): number {
  if (windows(t, t + MIN, hours).length) return t;
  const next = walk(t, f * 20 * MIN, hours, 1);
  const prev = walk(t, f * 20 * MIN, hours, -1);
  return next <= latest && next - t < t - prev ? next : prev;
}

// ---------- Zeitfenster für Termine („Mo, 8–12 Uhr“) ----------

const dayNames: Record<string, string> = {
  Mo: 'Montag',
  Di: 'Dienstag',
  Mi: 'Mittwoch',
  Do: 'Donnerstag',
  Fr: 'Freitag',
  Sa: 'Samstag',
  So: 'Sonntag',
};

function parseSlot(slot: string) {
  const m = /^(\w\w),\s*(\d{1,2})[–-](\d{1,2})/.exec(slot);
  const weekday = m ? Object.keys(dayNames).indexOf(m[1]!) + 1 : 0;
  if (!m || weekday < 1) return undefined;
  return { weekday, from: Number(m[2]) * H, to: Number(m[3]) * H, day: dayNames[m[1]!]! };
}

/** Besuch zu einem Zeitfenster: der erste, der ab t beginnt (dir 1), oder der letzte, der bis t endet */
function visitOf(slot: string, t: number, dir: 1 | -1) {
  const s = parseSlot(slot);
  if (!s) return undefined;
  for (let k = 0; k < 9; k++) {
    const day = berlinDay(berlinDay(t).start + dir * k * D + 12 * H);
    const v = { start: day.start + s.from, end: day.start + s.to };
    if (day.weekday === s.weekday && (dir > 0 ? v.start >= t : v.end <= t)) return v;
  }
  return undefined;
}

// ---------- Geräte und Probleme ----------

interface SeedDevice {
  manufacturer: string;
  model: string;
  category: DeviceCategory;
  problems: string[];
  /** Anleitung zum Wasserablauf aus der Gebrauchsanweisung, falls im Katalog */
  guide?: { title: string; source: string; steps: string[] };
}

function seedDevices(): SeedDevice[] {
  const fromCatalog = catalog.map((m): SeedDevice => {
    const g = getGuide(m.patterns.ablauf);
    const problems = m.problems?.length
      ? m.problems.map((p) => p.label)
      : m.category === 'waschmaschine'
        ? de.problems.map((p) => p.label)
        : de.appliance[m.category].symptoms.map((s) => s.label);
    return {
      manufacturer: manufacturers[m.manufacturerId] ?? m.manufacturerId,
      model: m.model,
      category: m.category,
      problems,
      guide: g ? { title: g.title, source: m.manual, steps: g.steps.map((s) => s.t) } : undefined,
    };
  });
  const others = portalSeed.otherDevices.map((d): SeedDevice => ({
    manufacturer: d.manufacturer,
    model: d.model,
    category: d.category,
    problems: [...new Set([d.problem, ...de.appliance[d.category].symptoms.map((s) => s.label)])],
  }));
  return [...fromCatalog, ...others];
}

type Issue = (typeof portalSeed.issues)[number];

interface Combo {
  device: SeedDevice;
  issue: Issue;
  /** Problem, wie es die App ohne Anleitung nennt. Fehlt: nur mit Anleitung. */
  label?: string;
}

/** Gerät und Problem, so oft wie das Gewicht sagt. Wasserablauf nur mit Anleitung im Katalog. */
function seedCombos(devices: SeedDevice[]): Combo[] {
  return devices.flatMap((device) =>
    portalSeed.issues.flatMap((issue) => {
      const labels = device.problems.filter((p) => (issue.labels as string[]).includes(p));
      const options = issue.ablauf
        ? device.guide
          ? labels.length
            ? labels
            : [undefined]
          : []
        : labels;
      return options.flatMap((label) =>
        Array.from({ length: issue.weight }, (): Combo => ({ device, issue, label })),
      );
    }),
  );
}

// ---------- Schritte und Geschichten ----------

type Step = { gap?: Gap } & (
  | { k: 'accept' }
  | { k: 'decide' }
  | { k: 'say'; text: string; tech?: boolean }
  | { k: 'ask'; question: string; options: string[]; tech?: boolean }
  | { k: 'part'; status: PartStatus; eta: string }
  | { k: 'offer' }
  | { k: 'close' }
  | { k: 'note'; text: string; by?: string }
  | { k: 'proof'; yes: boolean }
  | { k: 'write'; text: string | ((day: string) => string) }
  | { k: 'answer'; text: string }
  | { k: 'pick' }
  | { k: 'visit' }
);

const fromCustomer = (s: Step) => ['proof', 'write', 'answer', 'pick'].includes(s.k);
const hoursOf = (s: Step) => (fromCustomer(s) ? awake : service);

/**
 * Abstand zum vorigen Schritt in Stunden offener Zeit: frühestens, spätestens. Für Fründ zählen die
 * Öffnungszeiten, für die Kundschaft der Tag. visit: vom gewählten Zeitfenster bis zum Besuch.
 */
const gaps: Record<Step['k'], Gap> = {
  accept: [0.1, 2.5],
  decide: [0.2, 8],
  say: [0.05, 2],
  ask: [0.1, 5],
  part: [0.05, 1],
  offer: [0.05, 5],
  close: [0.3, 4],
  note: [0.05, 0.8],
  proof: [0.1, 4],
  write: [0.3, 10],
  answer: [0.2, 8],
  pick: [0.5, 12],
  visit: [4, 30],
};
/** Lieferzeit in Stunden der Öffnungszeiten (zehn am Tag) */
const delivery: Record<string, Gap> = {
  '3 Werktagen': [25, 40],
  '5 Werktagen': [45, 60],
  '10 Werktagen': [95, 110],
  '2 Wochen': [100, 120],
};
const gapOf = (s: Step): Gap =>
  s.gap ?? (s.k === 'part' && s.status === 'geliefert' ? delivery[s.eta] : undefined) ?? gaps[s.k];

/**
 * Eine Geschichte: head läuft vorwärts ab der Weitergabe. tail läuft rückwärts vom letzten Schritt
 * aus, der bei offenen Fällen Stand und Frist bestimmt. trail folgt danach, bis jetzt.
 */
interface Story {
  head: Step[];
  tail?: Step[];
  trail?: Step[];
}

/** N: neu, U: wartet auf uns, K: wartet auf die Kundschaft, T: Termin, E: erledigt */
type StoryId = `${'N' | 'U' | 'K' | 'T'}${1 | 2 | 3 | 4}` | 'U5' | `E${1 | 2 | 3 | 4 | 5}`;

interface StoryContext {
  verdict: RetailerDecision;
  proofAtShare: boolean;
  proofYes: boolean;
  detailEarly: boolean;
  detail: () => string;
  eta: string;
  withPart: boolean;
  branch: string;
  works: string;
  ok: string;
}

function storyOf(id: StoryId, c: StoryContext): Story {
  const { talk: t, notes: n } = portalSeed;
  const laeuft = fruendSettings.messages.questions.find((x) => x.id === 'laeuft')!;
  const abschluss = fruendSettings.messages.templates.find((x) => x.id === 'abschluss')!.text;
  const lead = fruendSettings.team.find((m) => m.role === 'leitung')?.name;
  const repairs = c.verdict === 'gewaehrleistung' || c.verdict === 'kulanz';
  const write = (text: string | ((day: string) => string), gap?: Gap): Step => ({
    k: 'write',
    text,
    gap,
  });
  const note = (text: string, by?: string, gap?: Gap): Step => ({ k: 'note', text, by, gap });
  const part = (status: PartStatus, eta = c.eta): Step => ({ k: 'part', status, eta });
  const ask = (x: { question: string; options: string[] }, gap?: Gap, tech?: boolean): Step => ({
    k: 'ask',
    ...x,
    gap,
    tech,
  });
  const offer = (gap?: Gap): Step => ({ k: 'offer', gap });
  const pick = (gap?: Gap): Step => ({ k: 'pick', gap });
  const decide = (gap?: Gap): Step => ({ k: 'decide', gap });
  const proof = (yes: boolean): Step => ({ k: 'proof', yes });
  const accept: Step = { k: 'accept' };
  const visit: Step = { k: 'visit' };
  const close: Step = { k: 'close' };
  // Annehmen, dann was die Kundschaft nachreicht und was das Team dazu notiert
  const opening: Step[] = [
    accept,
    ...(c.detailEarly ? [write(c.detail())] : []),
    ...(c.proofAtShare ? [] : [proof(c.proofYes)]),
    ...(!c.proofAtShare && !c.proofYes && repairs ? [note(n.sap)] : []),
    ...(c.verdict === 'kulanz' ? [note(n.kulanz)] : []),
  ];
  // Reparatur: Ersatzteil, Termin, Besuch, Nachfrage, Abschluss
  const booked = [offer(), pick(), visit];
  const checked: Step[] = [
    ask(laeuft, [0.5, 6], true),
    { k: 'answer', text: laeuft.options[0]! },
    close,
  ];
  const ordered = (eta = c.eta) => [decide(), part('bestellt', eta)];
  const arrived = [part('geliefert'), offer([0.5, 5]), pick([1, 20])];

  switch (id) {
    case 'N1':
      return { head: [proof(false), write(c.detail())] };
    case 'N2':
      return { head: [proof(true)] };
    case 'N3':
      return { head: [write(c.detail())] };
    case 'N4':
      return { head: [] };
    case 'U1':
      return { head: [accept], tail: [proof(false), write(t.noProof(c.branch), [0.02, 0.2])] };
    case 'U2':
      return {
        head: [...opening, ...ordered('5 Werktagen')],
        tail: [part('geliefert'), offer([0.5, 5]), write(t.otherTime, [1, 20])],
      };
    case 'U3':
      return { head: opening, tail: [decide(), write(t.cost, [1, 20])] };
    case 'U4':
      return {
        head: [...opening, ...ordered('3 Werktagen'), note(n.part(3))],
        tail: [write(t.partLate)],
        trail: [note(n.called, lead, [1, 3])],
      };
    case 'U5':
      return { head: opening, tail: [decide(), note(n.insurer), write(t.insurer, [3, 30])] };
    case 'K1':
      return {
        head: [...opening, ...ordered('5 Werktagen')],
        tail: [part('geliefert'), ask(t.builtIn, [0.5, 6])],
      };
    case 'K2':
      return {
        head: [...opening, ...ordered('5 Werktagen')],
        tail: [
          part('geliefert'),
          { k: 'say', text: t.partWithTech, gap: [0.5, 4] },
          offer([0.01, 0.05]),
        ],
      };
    case 'K3':
      return {
        head: [...opening, ...ordered('5 Werktagen')],
        tail: [...arrived, visit, ask(laeuft, undefined, true)],
      };
    case 'K4':
      return {
        head: [accept],
        tail: [proof(true), decide([0.5, 6]), ask(t.offerOrNew, [0.02, 0.2])],
      };
    case 'T1':
      return {
        head: [...opening, ...ordered('3 Werktagen')],
        tail: arrived,
        trail: [write(t.afterBooking[0]!, [0.2, 3])],
      };
    case 'T2':
      return { head: [...opening, ...ordered('5 Werktagen')], tail: arrived };
    case 'T3':
      return {
        head: [accept, proof(false), note(n.sap), ...ordered('2 Wochen')],
        tail: arrived,
        trail: [write(t.afterBooking[1]!, [0.2, 3]), note(n.bell, undefined, [0.5, 4])],
      };
    case 'T4':
      return {
        head: [...opening, ...ordered('10 Werktagen'), note(n.part(10))],
        tail: arrived,
        trail: [write(t.afterBooking[2]!, [0.2, 3])],
      };
    case 'E1':
      return {
        head: [
          ...opening,
          decide(),
          ...(c.withPart ? [part('bestellt'), part('geliefert')] : []),
          ...booked,
          ...checked,
        ],
      };
    case 'E2':
      return { head: [...opening, decide(), ...booked, ...checked] };
    case 'E3':
      return {
        head: [
          ...opening,
          decide(),
          ...(c.withPart ? [part('bestellt'), part('geliefert')] : []),
          ...booked,
          { k: 'say', text: abschluss, tech: true, gap: [0.5, 6] },
          write(c.works),
          close,
        ],
      };
    case 'E4':
      return { head: [...opening, decide(), note(n.insurer), write(c.ok), close] };
    case 'E5':
      return {
        head: [
          ...opening,
          decide(),
          ask(t.offerOrNew, [0.02, 0.2]),
          { k: 'answer', text: t.offerOrNew.options[1]! },
          { k: 'say', text: t.newDevice },
          close,
        ],
      };
  }
}

// ---------- Plan ----------

interface Plan {
  status: WorkflowStatus;
  story: StoryId;
  verdict: RetailerDecision;
  /** Weitergabe vor so vielen Millisekunden */
  ago: number;
  /** Letzter Schritt vor so vielen Millisekunden (offene Fälle außer neu) */
  last?: number;
  /** Kaufbeleg schon bei der Weitergabe. Fehlt: zufällig. */
  proof?: boolean;
}

const plan = (
  status: WorkflowStatus,
  story: StoryId,
  verdict: RetailerDecision,
  ago: number,
  last?: number,
  proof?: boolean,
): Plan => ({ status, story, verdict, ago, last, proof });

/**
 * Die offenen Fälle. Neue sind von heute, die übrigen über drei Wochen verteilt: Was auf ein
 * Ersatzteil oder eine Antwort wartet, ist älter. So wächst die letzte Woche der Auswertung nicht
 * über die anderen. Fristen von Fründ: neue Fälle in 4 Stunden annehmen, in 24 Stunden antworten.
 */
const openPlan: Plan[] = [
  plan('neu', 'N4', 'gewaehrleistung', 0.4 * H, undefined, true),
  plan('neu', 'N3', 'kulanz', 1.5 * H, undefined, true),
  plan('neu', 'N2', 'gewaehrleistung', 3.2 * H, undefined, false),
  plan('neu', 'N1', 'an_versicherer', 6.5 * H, undefined, false),
  plan('wartet_uns', 'U1', 'gewaehrleistung', 2.6 * D, 1.5 * H, false),
  plan('wartet_uns', 'U3', 'abgelehnt', 3.4 * D, 6 * H),
  plan('wartet_uns', 'U5', 'an_versicherer', 4 * D, 28 * H),
  plan('wartet_uns', 'U2', 'kulanz', 8 * D, 19.5 * H),
  plan('wartet_uns', 'U4', 'gewaehrleistung', 15 * D, 33 * H),
  plan('wartet_kunde', 'K1', 'gewaehrleistung', 7.5 * D, 4 * H),
  plan('wartet_kunde', 'K2', 'gewaehrleistung', 9 * D, 22 * H),
  plan('wartet_kunde', 'K4', 'abgelehnt', 9.5 * D, 3.5 * D, false),
  plan('wartet_kunde', 'K3', 'kulanz', 16.5 * D, 2 * D),
  plan('termin', 'T1', 'gewaehrleistung', 8 * D, 20 * H),
  plan('termin', 'T2', 'kulanz', 10 * D, 1.8 * D),
  plan('termin', 'T4', 'gewaehrleistung', 16 * D, 2.5 * D),
  plan('termin', 'T3', 'gewaehrleistung', 20 * D, 3 * D, false),
];

/** Erledigte Fälle je Woche, von der ältesten an. In den letzten Wochen kommen die offenen dazu. */
const donePerWeek = [1, 2, 2, 2, 3, 3, 3, 4, 4, 1];

/** Erledigt: Reparatur, Kulanz, Reparatur mit Abschlussnachricht, Versicherung, Neugerät */
const doneStories: [StoryId, RetailerDecision, number][] = [
  ['E1', 'gewaehrleistung', 10],
  ['E2', 'kulanz', 4],
  ['E3', 'gewaehrleistung', 5],
  ['E4', 'an_versicherer', 3],
  ['E5', 'abgelehnt', 3],
];

function plans(rc: () => number, rt: () => number): Plan[] {
  const stories = shuffle(
    doneStories.flatMap(([story, verdict, n]) =>
      Array.from({ length: n }, () => ({ story, verdict })),
    ),
    rc,
  );
  // Die jüngste erledigte Woche bekommt eine kurze Geschichte (Versicherung)
  const quick = stories.findIndex((x) => x.story === 'E4');
  if (quick >= 0) stories.push(...stories.splice(quick, 1));
  const weeks = portalSeed.days / 7;
  const done = donePerWeek.flatMap((n, w) =>
    Array.from({ length: n }, () => {
      const x = stories.shift()!;
      const ago = (weeks - w) * WEEK - (0.08 + 0.84 * rt()) * WEEK;
      return plan('erledigt', x.story, x.verdict, ago);
    }),
  );
  return [...openPlan, ...done].slice(0, portalSeed.cases);
}

// ---------- Zeitpunkte der Schritte ----------

interface Timed {
  step: Step;
  at: number;
  /** Gewähltes Zeitfenster beim Schritt pick */
  slot?: string;
}

/** Vorwärts ab der Weitergabe. f wählt den Abstand, mit 0 der kürzeste. */
function forward(steps: Step[], from: number, f: () => number): Timed[] {
  const slots = fruendSettings.service.slots;
  const out: Timed[] = [];
  let prev = from;
  let visit: { start: number; end: number } | undefined;
  for (const step of steps) {
    if (step.k === 'visit') {
      const at = visit ? visit.start + f() * Math.max(0, visit.end - visit.start - H) : prev + D;
      out.push({ step, at });
      prev = at + H; // Der Besuch dauert etwa eine Stunde
      continue;
    }
    const at = after(prev, gapOf(step), hoursOf(step), f());
    let slot: string | undefined;
    if (step.k === 'pick') {
      // Das früheste Zeitfenster ab dem nächsten Tag
      const first = slots
        .map((x) => ({ x, v: visitOf(x, at + 12 * H, 1) }))
        .sort((p, q) => (p.v?.start ?? Infinity) - (q.v?.start ?? Infinity))[0];
      slot = first?.x;
      visit = first?.v;
    }
    out.push({ step, at, slot });
    prev = at;
  }
  return out;
}

/** Rückwärts vom letzten Schritt aus, der genau bei end liegt */
function backward(steps: Step[], end: number, f: () => number): Timed[] {
  const slots = fruendSettings.service.slots;
  let next = end;
  const out: Timed[] = [{ step: steps.at(-1)!, at: end }];
  let seen: { start: number; end: number; slot: string } | undefined;
  for (let j = steps.length - 2; j >= 0; j--) {
    const step = steps[j]!;
    const later = steps[j + 1]!;
    if (step.k === 'visit') {
      // Der letzte Besuch, der vor dem nächsten Schritt vorbei war
      const o = slots
        .map((x) => ({ x, v: visitOf(x, next - H, -1) }))
        .sort((p, q) => (q.v?.end ?? 0) - (p.v?.end ?? 0))[0];
      seen = o?.v
        ? { ...o.v, slot: o.x }
        : { start: next - D, end: next - D + 4 * H, slot: slots[0]! };
      next = seen.start + f() * Math.max(0, seen.end - seen.start - H);
    } else next = before(next, later.k === 'visit' ? gaps.visit : gapOf(later), hoursOf(step), f());
    out.unshift({ step, at: next, slot: step.k === 'pick' ? seen?.slot : undefined });
  }
  return out;
}

function schedule(
  story: Story,
  sharedAt: number,
  last: number | undefined,
  now: number,
  rt: () => number,
): Timed[] {
  const latest = now - MIN;
  const tail = last !== undefined ? (story.tail ?? []) : [];
  const endStep = tail.at(-1);
  const end =
    last === undefined || !endStep
      ? undefined
      : fromCustomer(endStep)
        ? nearest(now - last, awake, now - 20 * MIN, rt())
        : before(now - last, [0, 0.5], service, rt());
  // Erst mit zufälligen Abständen, dann mit den kürzesten. Passt beides nicht: gleichmäßig verteilen.
  let out: Timed[] = [];
  for (const f of [rt, () => 0]) {
    const head = forward(story.head, sharedAt + MIN, f);
    const back = end !== undefined ? backward(tail, end, f) : [];
    out = [...head, ...back];
    if (!head.length || !back.length || head.at(-1)!.at < back[0]!.at) break;
  }
  if (end !== undefined && out.some((x, j) => j > 0 && x.at <= out[j - 1]!.at)) {
    const from = sharedAt + MIN;
    out.forEach((x, j) => {
      if (j < out.length - 1) x.at = from + ((end - from) * (j + 1)) / out.length;
    });
  }
  const final = out.at(-1);
  if (final && final.step.k === 'pick' && end !== undefined) {
    // Der Termin kommt noch: ein Zeitfenster ab morgen
    const slots = fruendSettings.service.slots;
    const tomorrow = berlinDay(now).start + D;
    const options = slots.filter((x) => (visitOf(x, final.at + 12 * H, 1)?.start ?? 0) >= tomorrow);
    final.slot = options[Math.floor(rt() * options.length)] ?? slots[0];
  }

  // Danach, solange es vor jetzt liegt
  let prev = final?.at ?? sharedAt;
  for (const step of end !== undefined ? (story.trail ?? []) : []) {
    const at = after(prev, gapOf(step), hoursOf(step), rt());
    if (at > latest) break;
    out.push({ step, at });
    prev = at;
  }

  // Neue Fälle sind erst Minuten alt: alles vor jetzt
  if ((out.at(-1)?.at ?? 0) > latest) {
    const from = sharedAt + MIN;
    out.forEach((x, j) => {
      x.at = Math.min(x.at, from + ((latest - from) * (j + 1)) / (out.length + 1));
    });
  }
  return out;
}

// ---------- Beispielfälle ----------

export function seedSettings(): Record<string, DealerSettings> {
  return { fruend: structuredClone(fruendSettings) };
}

export function seedRecords(now = Date.now()): SharedCaseRecord[] {
  // Getrennter Zufall für Inhalte (rc) und Zeitpunkte (rt): Wer und was bleibt zu jeder Uhrzeit gleich
  const rc = random(24816);
  const rt = random(4242);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rc() * arr.length)]!;
  const chance = (p: number) => rc() < p;
  const s = fruendSettings;
  const d = demoConfig.dealers.find((x) => x.id === 'fruend')!;
  const dealer = { id: d.id, kind: 'haendler' as const, name: d.name };
  const team = s.team.filter((m) => m.active);
  const techs = team.filter((m) => m.role === 'technik');
  const latest = now - MIN;

  // Gerät und Problem: gemischt. Offene Fälle nicht wie der Fall aus der Live-Demo, ein Gerät
  // höchstens dreimal und nie direkt nacheinander, kein Problem am selben Gerät zweimal.
  const combos = seedCombos(seedDevices());
  const live = catalog.find((m) => m.id === demoConfig.dealerDemo.catalogId)?.model;
  let deck: Combo[] = [];
  const dealt: Combo[] = [];
  const dealCombo = (open: boolean): Combo => {
    if (!deck.length) deck = shuffle(combos, rc);
    const ok = (c: Combo) => !open || !(c.device.model === live && c.issue.ablauf);
    const fresh = (c: Combo) =>
      !dealt.slice(-2).some((x) => x.device === c.device) &&
      dealt.filter((x) => x.device === c.device).length < 3 &&
      !dealt.some((x) => x.device === c.device && x.label === c.label && x.issue === c.issue);
    let i = deck.findIndex((c) => ok(c) && (!open || fresh(c)));
    if (i < 0) i = Math.max(0, deck.findIndex(ok));
    const c = deck.splice(i, 1)[0]!;
    if (open) dealt.push(c);
    return c;
  };
  const people = shuffle(portalSeed.customers, rc);
  // Sterne nach der Reparatur: meist 5, ein paar 4, manche geben keine
  const ratings = shuffle([...Array.from({ length: 13 }, () => 5), 4, 4, 4, 0, 0, 0], rc);
  const details = new Map<string, string[]>();
  const dealDetail = (issue: Issue) => {
    const list = details.get(issue.key)?.length
      ? details.get(issue.key)!
      : shuffle(issue.details, rc);
    details.set(issue.key, list.slice(1));
    return list[0]!;
  };

  // Inhalte je Fall, in fester Reihenfolge
  const drafts = plans(rc, rt).map((p, idx) => {
    const combo = dealCombo(p.status !== 'erledigt');
    const { device: dev, issue } = combo;
    const customer = people[idx % people.length]!;
    const city = pick(portalSeed.cities);
    const branch =
      s.profile.branches.find((b) => b.city === city.city)?.name ?? s.profile.branches[0]!.name;
    const monthsOld =
      p.verdict === 'gewaehrleistung'
        ? 3 + rc() * 18
        : p.verdict === 'kulanz'
          ? 25 + rc() * 4
          : 34 + rc() * 30;
    const withGuide = !!issue.ablauf && !!dev.guide && (!combo.label || chance(0.75));
    const stop = dev.guide ? Math.max(1, dev.guide.steps.length - 1 - Math.floor(rc() * 2)) : 0;
    const withFinding = !!issue.finding && chance(0.45);
    const proofAtShare = p.proof ?? chance(0.5);
    // Erst ziehen, wenn die Geschichte es braucht: So steht kein Satz zweimal kurz hintereinander
    let detail: string | undefined;
    const context: StoryContext = {
      verdict: p.verdict,
      proofAtShare,
      proofYes: chance(0.75),
      detailEarly: chance(0.35),
      detail: () => (detail ??= dealDetail(issue)),
      eta: pick(['3 Werktagen', '5 Werktagen']),
      withPart: chance(0.65),
      branch,
      works: pick(portalSeed.talk.works),
      ok: pick(portalSeed.talk.ok),
    };
    const clerkId = s.rules.autoAssign.find((x) => x.category === dev.category)?.assigneeId;
    const clerk = team.find((m) => m.id === clerkId) ?? team[0]!;
    const repaired =
      p.status === 'erledigt' && (p.verdict === 'gewaehrleistung' || p.verdict === 'kulanz');
    return {
      plan: p,
      combo,
      customer,
      city,
      monthsOld,
      withGuide,
      stop,
      withFinding,
      proofAtShare,
      clerk,
      tech: techs[idx % techs.length] ?? clerk,
      serial: chance(0.7)
        ? `${100 + Math.floor(rc() * 899)}/${10_000_000 + Math.floor(rc() * 89_999_999)}`
        : undefined,
      street: `${pick(portalSeed.streets)} ${1 + Math.floor(rc() * 40)}`,
      confidence: chance(0.7) ? ('hoch' as const) : ('mittel' as const),
      rating: repaired ? ratings.shift() || undefined : undefined,
      story: storyOf(p.story, context),
    };
  });

  // Weitergabe nach Plan, mit etwas Streuung über den Tag. Geteilt wird meist tagsüber. Neue Fälle
  // kommen genau dann, wann der Plan es sagt (Fristen).
  const timed = drafts
    .map((x) => {
      const target = now - x.plan.ago - (x.plan.last !== undefined ? (rt() - 0.5) * 10 * H : 0);
      return {
        ...x,
        sharedAt: x.plan.status === 'neu' ? target : nearest(target, shareHours, latest, rt()),
      };
    })
    .sort((a, b) => b.sharedAt - a.sharedAt);
  const ri = random(24816);

  const records = timed.map((x, i): SharedCaseRecord => {
    const { plan: p, combo, sharedAt } = x;
    const dev = combo.device;
    const a = de.appliance[dev.category];
    const status = p.status;
    const caseId = `GS-${24816 - i * 3 - Math.floor(ri() * 3)}`;
    const created = sharedAt - (0.2 + rt()) * H;
    const short = s.profile.shortName;
    const values = {
      kunde: x.customer.split(' ')[0],
      fall: caseId,
      haendler: short,
      telefon: s.profile.phone,
    };

    const events: CaseEvent[] = [];
    const answers: SharedCaseFile['answers'] = [];
    const messages: NonNullable<SharedCaseFile['messages']> = [];
    const notes: InternalNote[] = [];
    const access: { at: string; by: string }[] = [];
    const photos: SharedCaseFile['photos'] = [];
    const ev = (
      at: number,
      action: RetailerAction,
      by: string,
      extra: Record<string, unknown> = {},
    ) => {
      const { type: _t, ...payload } = action;
      const e: CaseEvent = {
        id: `hev_seed_${i}_${events.length}`,
        caseId,
        type: retailerEventType[action.type],
        at: iso(Math.min(at, latest)),
        actor: { kind: 'haendler', id: dealer.id, name: dealer.name },
        payload: { ...payload, by, ...extra },
      };
      events.push(e);
      return e;
    };
    // Stand wie im Backend (fileStore.ts): Aktionen von Fründ und Antworten der Kundschaft
    const wf = { status: 'neu' as WorkflowStatus, since: sharedAt, lastCustomerAt: sharedAt };
    const setStatus = (to: WorkflowStatus, at: number) => {
      if (wf.status !== to) Object.assign(wf, { status: to, since: at });
    };
    const heard = (at: number) => {
      wf.lastCustomerAt = at;
      if (wf.status === 'wartet_kunde') setStatus('wartet_uns', at);
    };
    const opened = (at: number, by: string) => {
      const prev = access.at(-1);
      if (prev?.by === by && at - Date.parse(prev.at) < 2 * H) return;
      access.push({ at: iso(Math.min(at, latest)), by });
    };
    const kaufbeleg = (at: number) =>
      photos.push({
        id: `photo_seed_${i}_0`,
        takenAt: iso(Math.min(at, latest)),
        purpose: 'kaufbeleg',
        source: 'demo',
      });

    // Regeln beim Eingang: Begrüßung, außerhalb der Öffnungszeiten der Hinweis, Kaufbeleg anfordern
    ev(
      sharedAt + 30_000,
      { type: 'nachricht', text: fillTemplate(s.messages.greeting.text, values) },
      short,
      {
        auto: true,
        contact: {
          name: s.service.serviceName,
          phone: s.profile.phone,
          email: s.profile.email,
          hours: s.profile.hours,
        },
      },
    );
    if (s.messages.away.enabled && !inServiceHours(s.profile.hours, new Date(sharedAt)))
      ev(
        sharedAt + 35_000,
        { type: 'nachricht', text: fillTemplate(s.messages.away.text, values) },
        short,
        {
          auto: true,
        },
      );
    const beleg = s.messages.questions.find((q) => q.id === 'beleg')!;
    const asked = x.proofAtShare
      ? undefined
      : ev(
          sharedAt + 40_000,
          { type: 'rueckfrage', question: beleg.question, options: beleg.options },
          short,
          {
            auto: true,
          },
        );
    if (x.proofAtShare) kaufbeleg(created + 2 * MIN);

    let question = asked;
    let offer: CaseEvent | undefined;
    let usedPart = false;
    let day = '';
    for (const { step, at, slot } of schedule(x.story, sharedAt, p.last, now, rt)) {
      const by =
        step.k === 'note'
          ? (step.by ?? x.clerk.name)
          : (step.k === 'say' || step.k === 'ask') && step.tech
            ? x.tech.name
            : x.clerk.name;
      if (!fromCustomer(step) && step.k !== 'visit') opened(at - (1 + rt() * 4) * MIN, by);
      switch (step.k) {
        case 'accept':
          ev(at, { type: 'annehmen' }, by);
          setStatus('wartet_uns', at);
          break;
        case 'decide':
          ev(at, { type: 'entscheidung', decision: p.verdict }, by);
          setStatus('wartet_uns', at);
          break;
        case 'say':
          ev(at, { type: 'nachricht', text: step.text }, by);
          setStatus('wartet_kunde', at);
          break;
        case 'ask':
          question = ev(
            at,
            { type: 'rueckfrage', question: step.question, options: step.options },
            by,
          );
          setStatus('wartet_kunde', at);
          break;
        case 'part':
          usedPart = true;
          ev(
            at,
            {
              type: 'ersatzteil',
              part: combo.issue.part,
              status: step.status,
              ...(step.status === 'bestellt' ? { eta: step.eta } : {}),
            },
            by,
          );
          break;
        case 'offer':
          offer = ev(
            at,
            { type: 'termin', partnerName: s.service.serviceName, slots: [...s.service.slots] },
            by,
          );
          setStatus('wartet_kunde', at);
          break;
        case 'close':
          ev(at, { type: 'status', status: 'abgeschlossen' }, by);
          setStatus('erledigt', at);
          break;
        case 'note':
          notes.push({ id: `note_seed_${i}_${notes.length}`, at: iso(at), by, text: step.text });
          break;
        case 'proof':
          if (!asked) break;
          answers.push({
            questionEventId: asked.id,
            answer: beleg.options[step.yes ? 0 : 1]!,
            at: iso(at),
          });
          if (step.yes) kaufbeleg(at + (1 + rt() * 2) * MIN);
          heard(at);
          break;
        case 'write':
          messages.push({
            id: `msg_seed_${i}_${messages.length}`,
            at: iso(at),
            text: typeof step.text === 'function' ? step.text(day) : step.text,
          });
          heard(at);
          break;
        case 'answer':
          if (question)
            answers.push({ questionEventId: question.id, answer: step.text, at: iso(at) });
          heard(at);
          break;
        case 'pick':
          if (!offer || !slot) break;
          answers.push({ questionEventId: offer.id, answer: slot, at: iso(at) });
          day = parseSlot(slot)?.day ?? '';
          heard(at);
          // Zeitfenster gewählt: Fründ bestätigt den Termin gleich im Gespräch
          ev(at + MIN, { type: 'betrieb', partnerName: s.service.serviceName, slot }, short, {
            auto: true,
          });
          setStatus('termin', at + MIN);
          break;
        case 'visit':
          break;
      }
    }
    if (wf.status !== status)
      throw new Error(`Beispielfall ${caseId}: ${wf.status} statt ${status}`);
    // Gelesen: Bei „Wartet auf uns“ kam die letzte Nachricht nach dem letzten Öffnen, sonst nicht
    const lastOpen = access.at(-1);
    if (status !== 'wartet_uns' && lastOpen && Date.parse(lastOpen.at) < wf.lastCustomerAt) {
      const seen = after(wf.lastCustomerAt, [0.1, 2], service, rt());
      if (seen < latest) opened(seen, x.clerk.name);
    }

    const resolution: CaseResolution | undefined =
      status !== 'erledigt'
        ? undefined
        : p.verdict === 'abgelehnt'
          ? 'ersatzgeraet'
          : usedPart
            ? 'ersatzteil_eingebaut'
            : 'repariert';
    const caseStatus: CaseStatus =
      status === 'erledigt' ? 'erledigt' : status === 'termin' ? 'in_reparatur' : 'eskaliert';
    const updatedAt = Math.max(
      sharedAt,
      ...events.map((e) => Date.parse(e.at)),
      ...answers.map((y) => Date.parse(y.at)),
      ...messages.map((y) => Date.parse(y.at)),
    );
    const closedAt = status === 'erledigt' ? events.at(-1)!.at : undefined;
    const finding = created + 20 * MIN;

    const timeline: SharedCaseFile['timeline'] = [
      { at: iso(created), type: 'fall_angelegt' as const, label: de.caseEvent.fall_angelegt },
      ...(x.withGuide
        ? [
            {
              at: iso(created + MIN),
              type: 'anleitung_gestartet' as const,
              label: de.caseEvent.anleitung_gestartet,
            },
            {
              at: iso(created + 9 * MIN),
              type: 'schritt_geht_nicht' as const,
              label: de.caseEvent.schritt_geht_nicht,
            },
          ]
        : []),
      ...(x.withFinding
        ? [
            {
              at: iso(finding),
              type: 'befund_erstellt' as const,
              label: de.caseEvent.befund_erstellt,
            },
          ]
        : []),
      {
        at: iso(sharedAt),
        type: 'weitergabe_bestaetigt' as const,
        label: de.caseEvent.weitergabe_bestaetigt,
      },
    ].map((e) => ({ ...e, actor: de.app.name }));

    const repairTotal = demoConfig.prices.repair.parts + demoConfig.prices.repair.labor;
    const file: SharedCaseFile = {
      version: SHARE_FORMAT_VERSION,
      caseId,
      recipient: dealer,
      consentId: `consent_seed_${i}`,
      sharedAt: iso(sharedAt),
      updatedAt: iso(updatedAt),
      isExample: true,
      customer: {
        name: x.customer,
        address: { street: x.street, zip: x.city.zip, city: x.city.city },
      },
      device: {
        manufacturer: dev.manufacturer,
        model: dev.model,
        category: dev.category,
        categoryLabel: de.deviceCategory[dev.category],
        serialNumber: x.serial,
        purchaseDate: iso(created - x.monthsOld * 30.44 * D),
        soldBy: dealer,
      },
      protection:
        p.verdict === 'an_versicherer'
          ? {
              provider: demoConfig.insurers[1]!.name,
              product: demoConfig.contract.productName,
              validUntil: iso(sharedAt + 400 * D),
            }
          : undefined,
      case: {
        status: caseStatus,
        statusLabel: caseStatusLabel(caseStatus),
        entry: x.withGuide ? 'meldung' : 'symptom',
        problemLabel:
          x.withGuide && dev.guide ? dev.guide.title : (combo.label ?? dev.problems[0]!),
        createdAt: iso(created),
        updatedAt: iso(updatedAt),
        ...(closedAt ? { closedAt, resolution } : {}),
      },
      results: x.withFinding
        ? [
            {
              component: a.finding.component,
              confidence: x.confidence,
              source: 'fachkraft',
              at: iso(finding),
            },
          ]
        : [],
      guide:
        x.withGuide && dev.guide
          ? {
              title: dev.guide.title,
              source: dev.guide.source,
              total: dev.guide.steps.length,
              completed: dev.guide.steps.slice(0, x.stop),
              abortedAt: { step: x.stop + 1, title: dev.guide.steps[x.stop] ?? '' },
              outcome: 'geht_nicht',
            }
          : undefined,
      finding: x.withFinding
        ? {
            label: a.finding.title,
            by: `${d.service!.expert}, Fachkraft im Videocall`,
            at: iso(finding),
          }
        : undefined,
      // Kosten nur bei Gewährleistung. Bei Kulanz lägen sie über der Grenze aus den Regeln.
      quote:
        x.withFinding && p.verdict === 'gewaehrleistung'
          ? {
              repair: {
                partName: a.finding.part,
                originalPart: true,
                parts: demoConfig.prices.repair.parts,
                labor: demoConfig.prices.repair.labor,
                total: repairTotal,
              },
              replacement: { total: demoConfig.prices.replacement, note: '' },
              saving: demoConfig.prices.replacement - repairTotal,
              payer: { kind: 'haendler', name: dealer.name },
              deductible: 0,
              isExample: true,
            }
          : undefined,
      // Nur der Kaufbeleg. Beispielfotos haben kein Bild, eine leere Kachel „Display“ zeigt nichts.
      photos,
      timeline,
      answers,
      messages,
      ...(x.rating ? { rating: x.rating } : {}),
    };

    const seenAt = access.at(-1)?.at;
    return {
      file,
      retailerEvents: events,
      workflow: {
        status,
        // Mit dem Termin geht der Fall an die Technik
        assigneeId: status === 'termin' || p.story === 'K3' ? x.tech.id : x.clerk.id,
        since: iso(wf.since),
        lastCustomerAt: iso(wf.lastCustomerAt),
        ...(seenAt ? { seenAt } : {}),
      },
      notes,
      access,
    };
  });
  return withRework(records);
}

/**
 * Ein Beispiel für die Nachbesserung (Portal-Idee 3): Ein neuer Fall außerhalb der Frist auf den
 * Kauf kommt zu einem Gerät, das Fründ vor ein paar Monaten repariert hat. Dafür bekommt ein
 * erledigter Fall mit Reparatur dasselbe Gerät und dieselbe Kundschaft. Der Name in den
 * Nachrichten wird mitgetauscht. Ohne passendes Paar bleibt alles, wie es ist.
 */
function withRework(records: SharedCaseRecord[]): SharedCaseRecord[] {
  const live = catalog.find((m) => m.id === demoConfig.dealerDemo.catalogId);
  const open = records.find(
    (r) =>
      r.workflow?.status === 'neu' &&
      r.file.device.serialNumber &&
      r.file.device.model !== live?.model &&
      warrantyMonths(r) >= DEFAULT_REGULATOR_RULES.purchaseWarrantyMonths,
  );
  if (!open) return records;
  const created = Date.parse(open.file.case.createdAt);
  const done = records.find((r) => {
    if (r.workflow?.status !== 'erledigt' || r.file.device.category !== open.file.device.category)
      return false;
    const decision = r.retailerEvents.findLast((e) => e.type === 'haendler_entscheidung')?.payload
      .decision;
    const since = Date.parse(r.workflow.since);
    return (
      (decision === 'gewaehrleistung' || decision === 'kulanz') &&
      since < created &&
      created - since < 12 * 30 * D
    );
  });
  if (!done) return records;
  const from = done.file.customer.name.split(' ')[0]!;
  const to = open.file.customer.name.split(' ')[0]!;
  const rename = (x: unknown) => (typeof x === 'string' ? x.replaceAll(from, to) : x);
  const twin: SharedCaseRecord = {
    ...done,
    file: { ...done.file, customer: open.file.customer, device: open.file.device },
    retailerEvents: done.retailerEvents.map((e) => ({
      ...e,
      payload: Object.fromEntries(Object.entries(e.payload).map(([k, v]) => [k, rename(v)])),
    })),
  };
  return records.map((r) => (r === done ? twin : r));
}

/** Volle Monate vom Kauf bis zum Melden, grob genug für die Auswahl oben */
function warrantyMonths(r: SharedCaseRecord): number {
  const bought = Date.parse(r.file.device.purchaseDate ?? '');
  return Number.isNaN(bought) ? 0 : (Date.parse(r.file.case.createdAt) - bought) / (30.44 * D);
}

/** Anonyme Zahlen: Fälle an Geräten von Fründ, die ohne Weitergabe gelöst wurden oder woanders hin gingen */
export function seedAnonymous(now = Date.now()): Record<string, AnonymousOutcome[]> {
  const r = random(4711);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;
  const devices = seedDevices();
  const weeks = Math.round(portalSeed.days / 7);
  const n = portalSeed.anonymous;
  // Fälle mit Weitergabe je Woche, von der ältesten an
  const shared = Array.from({ length: weeks }, () => 0);
  for (const x of seedRecords(now)) {
    const w = weeks - 1 - Math.floor((now - Date.parse(x.file.sharedAt)) / WEEK);
    if (w >= 0 && w < weeks) shared[w] = (shared[w] ?? 0) + 1;
  }
  // Alle Fälle je Woche steigen leicht, die App ist neu bei Fründ. Die Weitergaben zählen mit,
  // damit keine Woche heraussticht.
  const total = n + shared.reduce((a, b) => a + b, 0);
  const counts = shared.map((k, w) =>
    Math.max(
      6,
      Math.round(total / weeks + (7 * (w - (weeks - 1) / 2)) / (weeks - 1) + (r() - 0.5) * 4) - k,
    ),
  );
  for (let sum = counts.reduce((a, b) => a + b, 0); sum !== n;) {
    const w = Math.floor(r() * weeks);
    if (sum < n) counts[w] = counts[w]! + 1;
    else if (counts[w]! > 6) counts[w] = counts[w]! - 1;
    else continue;
    sum += sum < n ? 1 : -1;
  }
  // Ausgang mit festen Anteilen, damit die Kacheln der Auswertung bei jedem Start gleich bleiben
  const quota = { selbst_geloest: 0.46, im_call_geloest: 0.21, versicherer: 0.14 };
  const outcomes = shuffle(
    (Object.keys(quota) as (keyof typeof quota)[])
      .flatMap((k): AnonymousOutcome['outcome'][] =>
        Array.from({ length: Math.round(quota[k] * n) }, () => k),
      )
      .concat(Array.from({ length: n }, () => 'betrieb' as const))
      .slice(0, n),
    r,
  );
  const list = counts
    .flatMap((count, w) =>
      Array.from({ length: count }, (): AnonymousOutcome => {
        const dev = pick(devices);
        const age = (weeks - w - (0.02 + 0.96 * r())) * WEEK;
        return {
          at: iso(now - age),
          category: dev.category,
          model: `${dev.manufacturer} ${dev.model}`,
          outcome: outcomes.pop()!,
          problem: dev.guide && r() < 0.5 ? dev.guide.title : pick(dev.problems),
        };
      }),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  return { fruend: list };
}
