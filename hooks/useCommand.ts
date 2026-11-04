// Führt einen Befehl des Stores aus, für Buttons, die nur einmal zählen: Termin anfragen,
// Schadenfall melden, Anleitung starten und fortsetzen, Call starten, im Gespräch auch die Antwort
// auf die Rückfrage und „Passt, weiter“ zum Befund. ZUKUNFTSPLAN Phase 1, „Befehle ohne Absturz“.
import { useEffect, useRef, useState } from 'react';

import { de } from '@/i18n/de';
import type { Refusal, Result } from '@/model/result';

/** So lange zählt ein weiterer Tap als Doppeltap und bleibt ohne Wirkung */
export const TAP_LOCK_MS = 800;
/** So lange steht der Hinweis nach einer Ablehnung, wie in der Anleitung */
export const TOAST_MS = 2600;

/** Ruhiger Satz zu einer Ablehnung. Die Ablehnung selbst bleibt intern. */
export function refusalText(refusal: Refusal): string {
  const t = de.command.refused;
  switch (refusal.code) {
    case 'unbekannt':
      return t.unbekannt;
    case 'bestaetigung':
      return t.bestaetigung;
    case 'vertrag':
      return t.vertrag;
    case 'nur_betrieb':
      return t.nurBetrieb;
    case 'betrag':
      return t.betrag;
    default:
      return t.other;
  }
}

export interface CommandHandle<A extends unknown[]> {
  /** Für onPress. Während der Befehl läuft und kurz danach passiert bei weiteren Taps nichts. */
  run: (...args: A) => void;
  /** Der Befehl läuft, oder die Sperre gegen Doppeltaps gilt noch */
  busy: boolean;
  /** Hinweis nach einer Ablehnung, für <Toast>. Sonst undefined. */
  toast?: string;
}

/**
 * Führt command aus und sperrt dabei weitere Taps. Gelingt er, folgt onDone mit dem Wert, etwa
 * der nächste Screen. Lehnt der Store ab, kommt ein ruhiger Hinweis aus de.command, nie der
 * Fehlertext der Domäne. Ein Promise, das scheitert, bekommt denselben ruhigen Hinweis.
 */
export function useCommand<A extends unknown[], T>(
  command: (...args: A) => Result<T> | Promise<Result<T>>,
  onDone?: (value: T) => void,
): CommandHandle<A> {
  const locked = useRef(false);
  const mounted = useRef(true);
  const lockTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(lockTimer.current);
      clearTimeout(toastTimer.current);
    };
  }, []);

  const finish = (result: Result<T> | undefined) => {
    if (!mounted.current) return;
    clearTimeout(toastTimer.current);
    if (result?.ok) {
      setToast(undefined);
      onDone?.(result.value);
    } else {
      setToast(result ? refusalText(result.refusal) : de.command.failed);
      toastTimer.current = setTimeout(() => setToast(undefined), TOAST_MS);
    }
    lockTimer.current = setTimeout(() => {
      locked.current = false;
      setBusy(false);
    }, TAP_LOCK_MS);
  };

  const run = (...args: A) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    let result: Result<T> | Promise<Result<T>>;
    try {
      result = command(...args);
    } catch (error) {
      // Ein Befehl wirft nicht. Tut er es doch, ist das ein Programmfehler und bleibt sichtbar.
      locked.current = false;
      setBusy(false);
      throw error;
    }
    if (result instanceof Promise) {
      result.then(finish, () => finish(undefined));
    } else {
      finish(result);
    }
  };

  return { run, busy, toast };
}
