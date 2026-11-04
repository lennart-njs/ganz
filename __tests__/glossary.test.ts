// Glossar für UX-Texte (docs/REVIEW.md Abschnitt 6, B-46): Die Wörter aus „Nicht verwenden“
// stehen in keinem Text der App. Nachweis für docs/BEFUNDE.md statt einer Durchsicht von Hand.
import { de } from '@/i18n/de';

/** Alle Texte aus i18n/de.ts, auch die aus Funktionen mit Platzhaltern */
function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') {
    // Platzhalter als Text, sonst als Liste (z. B. de.common.list)
    const fn = value as (...a: unknown[]) => unknown;
    const placeholders = Array.from({ length: value.length }, (_, i) => `{${i}}`);
    try {
      return texts(fn(...placeholders));
    } catch {
      return texts(fn(...placeholders.map((p) => [p])));
    }
  }
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

const all = texts(de);

describe('Glossar (B-46)', () => {
  test.each([
    ['Fehlercode', /Fehlercode/],
    ['Vorgang', /\bVorgang/],
    ['Ticket', /\bTicket/],
    ['Diagnose-Protokoll', /Diagnose-Protokoll/],
    ['Techniker', /Techniker/],
    ['Hotline', /Hotline/],
    ['KI oder AI', /\bKI\b|\bAI\b/],
  ])('kein „%s“', (_, pattern) => {
    expect(all.filter((t) => pattern.test(t))).toEqual([]);
  });

  test('„Werkstatt“ nur in „Freie Werkstatt“, der Art des Betriebs aus der Demo', () => {
    const hits = all.filter((t) => /Werkstatt/.test(t));
    expect(hits.length).toBeGreaterThan(0);
    for (const t of hits) expect(t.replace(/Freie Werkstatt/g, '')).not.toMatch(/Werkstatt/);
  });

  test('„Defekt“ und „Störung“ stehen auf keinem Button', () => {
    const buttons = [
      ...texts(de.common),
      de.problem.photo,
      de.result.startGuide,
      de.result.doesNotFit,
      de.result.helpInstead,
      de.result.getHelp,
      de.costs.report,
      de.costs.selfPay,
      de.costs.toAppointment,
      de.appointment.request,
      de.appointment.requestPaid,
      de.finish.runsAgain,
      de.finish.stillBroken,
      de.thread.callStart,
      de.thread.onSite,
    ];
    expect(buttons.filter((t) => /Defekt|Störung/.test(t))).toEqual([]);
  });

  test('Schadenfall, Fachkraft, Betrieb und Kundendienst sind die Wörter der App', () => {
    for (const word of ['Schadenfall', 'Fachkraft', 'Betrieb', 'Fallakte']) {
      expect([word, all.some((t) => t.includes(word))]).toEqual([word, true]);
    }
  });
});
