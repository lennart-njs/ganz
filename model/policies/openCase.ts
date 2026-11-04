// Ein offener Fall pro Gerät (Entscheidung Nr. 13). Hier steht genau einmal, welcher Fall eines
// Geräts offen ist, wann ein Fall Fortschritt hat, wann er leer ist und was ein neuer Versuch
// ergibt. Die Store-Aktion openCaseFor führt das aus.
// Kein Import aus react, expo, i18n, config oder store (ZUKUNFTSPLAN 3.1).
import { isClosed } from '../caseMachine';
import type { Case, ChatMessage, Id } from '../types';
import { can } from './actions';
import { selectCaseFacts, type CaseFactsSource } from './caseFacts';

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
 * eine Anleitung mit erledigtem Schritt oder mit Ergebnis. Ohne Fortschritt ersetzt ein neuer
 * Versuch den Fall (Entscheidung Nr. 13).
 */
export function hasProgress(s: OpenCaseSource, c: Case): boolean {
  if (c.status !== 'offen' && c.status !== 'selbsthilfe') return true;
  if (c.photoIds.length || c.claim || c.quoteId) return true;
  if (s.chatMessages.some((m) => m.caseId === c.id)) return true;
  if (s.videoSessions.some((v) => v.caseId === c.id)) return true;
  return c.guideRunIds.some((id) => {
    const run = s.guideRuns[id];
    // Eine Anleitung, die ohne Ergebnis endete, weil es mit einem anderen Problem weiterging,
    // ist ohne erledigten Schritt kein Fortschritt
    return !!run && (run.completedSteps.length > 0 || !!run.outcome);
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

/** Was ein neuer Versuch für ein Gerät ergibt */
export type OpenCaseArt = 'neu' | 'ersetzt' | 'frage_weitermachen';

export interface OpenCaseOptions {
  /** Du änderst das Problem genau dieses Falls, mit dem Stift oder über „Passt nicht“ */
  aendern?: Id;
  /** Du hast beim laufenden Fall „Neues Problem melden“ gewählt */
  neuesProblem?: boolean;
  /** Mit dieser Anleitung geht es gleich weiter. Eine offene dazu bleibt offen, andere enden. */
  guideId?: string;
}

export type OpenCasePlan =
  /** Neuer Fall. Mit cancel wird der laufende Fall vorher abgebrochen. */
  | { art: 'neu'; cancel?: Id }
  /** Der offene Fall bekommt das neue Problem, er bleibt derselbe Fall */
  | { art: 'ersetzt'; caseId: Id }
  /** ganz fragt: „Weitermachen“, und nur bei canCancel auch „Neues Problem melden“ */
  | { art: 'frage_weitermachen'; caseId: Id; canCancel: boolean };

/**
 * Entscheidung Nr. 13: ein offener Fall pro Gerät. Ein neuer Versuch ohne Fortschritt ersetzt den
 * offenen Fall. Mit Fortschritt fragt ganz „Weitermachen“ oder „Neues Problem melden“. Erst nach
 * „Neues Problem melden“ wird der alte Fall abgebrochen, und nur, wo die Regeln das erlauben.
 * Ein Fall in der Reparatur bekommt also nur „Weitermachen“. Wer das Problem des offenen Falls
 * selbst ändert (aendern), behält den Fall, solange die Regeln das Ändern erlauben.
 */
export function planOpenCase(
  s: OpenCaseSource,
  deviceId: Id,
  options: OpenCaseOptions = {},
): OpenCasePlan {
  const open = findOpenCase(s, deviceId);
  if (!open) return { art: 'neu' };
  const facts = selectCaseFacts(s, open.id);
  if (open.id === options.aendern && can(facts, 'problem_aendern')) {
    return { art: 'ersetzt', caseId: open.id };
  }
  if (!hasProgress(s, open)) return { art: 'ersetzt', caseId: open.id };
  const canCancel = can(facts, 'abbrechen');
  if (options.neuesProblem && canCancel) return { art: 'neu', cancel: open.id };
  return { art: 'frage_weitermachen', caseId: open.id, canCancel };
}
