import { RefusalError, type Result } from '@/model/result';

/** Für Ausgangslagen in Tests: der Wert eines erledigten Befehls. Eine Ablehnung ist ein Fehler. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new RefusalError(result.refusal);
  return result.value;
}
