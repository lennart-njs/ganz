// Ein offener Fall pro Gerät (Entscheidung Nr. 13). Hier steht genau einmal, welcher Fall eines
// Geräts offen ist, wann ein Fall Fortschritt hat und wann er leer ist.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import { isClosed } from '../caseMachine';
import type { Case, ChatMessage, Id } from '../types';
import type { CaseFactsSource } from './caseFacts';

/** Was die Regeln zum Öffnen eines Falls lesen. AppData aus dem Store passt dazu. */
export interface OpenCaseSource extends CaseFactsSource {
  chatMessages: readonly ChatMessage[];
}

/** Der offene Fall eines Geräts. Gibt es mehrere, der zuletzt geänderte. */
export function findOpenCase(s: OpenCaseSource, deviceId: Id): Case | undefined {
  let found: Case | undefined;
  for (const c of Object.values(s.cases)) {
    if (c.deviceId !== deviceId || isClosed(c.status)) continue;
    if (!found || c.updatedAt > found.updatedAt) found = c;
  }
  return found;
}

/**
 * Hat der Fall schon Inhalt, den ein neuer Versuch nicht einfach ersetzen darf? Fortschritt sind
 * ein Status nach der Selbsthilfe, Fotos, Schadenfall, Kostenvoranschlag, Chat, Videocall und
 * eine Anleitung mit erledigtem Schritt oder mit Ende. Ohne Fortschritt ersetzt ein neuer Versuch
 * den Fall (Entscheidung Nr. 13).
 */
export function hasProgress(s: OpenCaseSource, c: Case): boolean {
  if (c.status !== 'offen' && c.status !== 'selbsthilfe') return true;
  if (c.photoIds.length || c.claim || c.quoteId) return true;
  if (s.chatMessages.some((m) => m.caseId === c.id)) return true;
  if (s.videoSessions.some((v) => v.caseId === c.id)) return true;
  return c.guideRunIds.some((id) => {
    const run = s.guideRuns[id];
    return !!run && (run.completedSteps.length > 0 || !!run.endedAt);
  });
}

/**
 * Nur angelegt: ohne Fortschritt, noch gemeldet, nicht pausiert, ohne Ergebnis und ohne Anleitung.
 * So ein Fall bleibt nicht liegen, wenn du „Problem melden“ oder das Gespräch verlässt.
 * „Später weitermachen“ behält den Fall bewusst.
 */
export function isEmptyCase(s: OpenCaseSource, c: Case): boolean {
  return (
    c.status === 'offen' &&
    !c.pausedAt &&
    !c.diagnosisIds.length &&
    !c.guideRunIds.length &&
    !hasProgress(s, c)
  );
}
