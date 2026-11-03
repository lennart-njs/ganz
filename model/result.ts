// Ergebnis eines Befehls: erledigt oder abgelehnt, ohne Exception (ZUKUNFTSPLAN Phase 1,
// „Befehle ohne Absturz“). Die Ablehnung nennt nur Schlüssel. Den Text dazu wählt die App,
// nie die Domäne (hooks/useCommand.ts).
import type { CaseCommand } from './caseMachine';
import type { ActionKey } from './policies/actions';
import type { CaseStatus, ConsentPurpose, Id } from './types';

/** Was es unter der Nummer nicht gibt */
export type MissingThing = 'fall' | 'anleitung' | 'videocall' | 'termin' | 'betrieb';

export type Refusal =
  /** Fall, Anleitung, Call, Termin oder Betrieb gibt es nicht oder nicht mehr */
  | { readonly code: 'unbekannt'; readonly what: MissingThing; readonly id: Id }
  /** Die Status-Maschine erlaubt den Befehl in diesem Status nicht */
  | { readonly code: 'uebergang'; readonly from: CaseStatus; readonly command: CaseCommand }
  /** Eine Regel aus model/policies/actions.ts erlaubt die Aktion gerade nicht */
  | { readonly code: 'regel'; readonly action: ActionKey }
  /** Die Bestätigung oder Einwilligung fehlt, oder sie ist widerrufen */
  | { readonly code: 'bestaetigung'; readonly purpose: ConsentPurpose }
  /** Ohne Schutz kein Schadenfall */
  | { readonly code: 'vertrag' }
  /** Eine Freigabe braucht eine Schadenmeldung */
  | { readonly code: 'schadenfall' }
  /** Pumpe und Sensor bestellt und baut immer der Betrieb ein (Ökodesign) */
  | { readonly code: 'nur_betrieb'; readonly part: string };

export type RefusalCode = Refusal['code'];

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Refused {
  readonly ok: false;
  readonly refusal: Refusal;
}

export type Result<T> = Ok<T> | Refused;

export function ok(): Ok<void>;
export function ok<T>(value: T): Ok<T>;
export function ok<T>(value?: T): Ok<T | undefined> {
  return { ok: true, value };
}

export function refuse(refusal: Refusal): Refused {
  return { ok: false, refusal };
}

/** Für Aufrufer, die eine Ablehnung als Programmfehler werten, z. B. Tests und Skripte */
export class RefusalError extends Error {
  constructor(readonly refusal: Refusal) {
    super(`Abgelehnt: ${JSON.stringify(refusal)}`);
    this.name = 'RefusalError';
  }
}
