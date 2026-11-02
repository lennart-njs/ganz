// Die Anleitung als Teil des Fall-Gesprächs (Entscheidung 25).
// Aus den gespeicherten Ereignissen einer Anleitung entsteht die Folge der Nachrichten:
// Schritt gezeigt, „Erledigt“, „Schritt zurück“, Sicherheit bestätigt.
import type { CaseEvent, GuideRun } from '@/model/types';

export type GuideThreadItem =
  /** ganz zeigt Schritt `step` (0-basiert) */
  | { kind: 'schritt'; at: string; key: string; step: number }
  /** Haushalt: „Erledigt“ für Schritt `step` */
  | { kind: 'erledigt'; at: string; key: string; step: number }
  /** Haushalt: einen Schritt zurück, von `step` aus */
  | { kind: 'zurueck'; at: string; key: string; step: number }
  /** Haushalt bestätigt den Sicherheitshinweis in Schritt `step` */
  | { kind: 'sicherheit'; at: string; key: string; step: number };

const belongs = (run: GuideRun) => (e: CaseEvent) =>
  e.caseId === run.caseId && e.payload.guideRunId === run.id;

/** Nachrichten einer Anleitung in zeitlicher Reihenfolge */
export function guideThread(run: GuideRun, events: CaseEvent[], total: number): GuideThreadItem[] {
  const items: GuideThreadItem[] = [
    { kind: 'schritt', at: run.startedAt, key: `${run.id}-s0`, step: 0 },
  ];
  for (const e of events.filter(belongs(run))) {
    const n = Number(e.payload.step); // 1-basiert: der Schritt, in dem es passiert ist
    if (!Number.isFinite(n)) continue;
    if (e.type === 'schritt_erledigt') {
      items.push({ kind: 'erledigt', at: e.at, key: e.id, step: n - 1 });
      if (n < total) items.push({ kind: 'schritt', at: e.at, key: `${e.id}-s`, step: n });
    } else if (e.type === 'schritt_zurueck') {
      items.push({ kind: 'zurueck', at: e.at, key: e.id, step: n - 1 });
      items.push({ kind: 'schritt', at: e.at, key: `${e.id}-s`, step: Math.max(0, n - 2) });
    } else if (e.type === 'sicherheit_bestaetigt') {
      items.push({ kind: 'sicherheit', at: e.at, key: e.id, step: n - 1 });
    }
  }
  return items;
}

/** Ist der Sicherheitshinweis in diesem Schritt schon bestätigt? */
export function safetyConfirmed(run: GuideRun, events: CaseEvent[], step: number): boolean {
  return events.some(
    (e) =>
      e.type === 'sicherheit_bestaetigt' &&
      e.payload.guideRunId === run.id &&
      Number(e.payload.step) === step + 1,
  );
}
