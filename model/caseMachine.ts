// Status-Maschine eines Falls. Reine Funktionen, ohne Zustand und ohne Uhr.
// Diagramm und Regeln: docs/BUILD_PLAN.md Abschnitt 3.1.
import type {
  ActorKind,
  Case,
  CaseEvent,
  CaseEventType,
  CaseResolution,
  CaseStatus,
  Cents,
  Claim,
  Consent,
  ConsentPurpose,
  Id,
  ISODateTime,
  Quote,
} from './types';

export type CaseCommand =
  | 'anleitung_starten'
  | 'hilfe_holen'
  | 'selbst_geloest'
  | 'im_call_geloest'
  | 'schaden_melden'
  | 'freigabe_erteilt'
  | 'freigabe_abgelehnt'
  | 'termin_bestaetigt'
  | 'selbst_zahlen'
  | 'repariert'
  | 'problem_besteht_weiter'
  | 'abbrechen';

export const TRANSITIONS: Record<CaseStatus, Partial<Record<CaseCommand, CaseStatus>>> = {
  offen: { anleitung_starten: 'selbsthilfe', hilfe_holen: 'eskaliert', abbrechen: 'abgebrochen' },
  selbsthilfe: { selbst_geloest: 'erledigt', hilfe_holen: 'eskaliert', abbrechen: 'abgebrochen' },
  eskaliert: {
    im_call_geloest: 'erledigt',
    schaden_melden: 'freigabe_noetig',
    selbst_zahlen: 'in_reparatur',
    abbrechen: 'abgebrochen',
  },
  freigabe_noetig: {
    freigabe_erteilt: 'freigegeben',
    freigabe_abgelehnt: 'abgelehnt',
    abbrechen: 'abgebrochen',
  },
  freigegeben: { termin_bestaetigt: 'in_reparatur', abbrechen: 'abgebrochen' },
  abgelehnt: { selbst_zahlen: 'in_reparatur', abbrechen: 'abgebrochen' },
  in_reparatur: { repariert: 'erledigt', problem_besteht_weiter: 'eskaliert' },
  erledigt: { problem_besteht_weiter: 'eskaliert' },
  abgebrochen: {},
};

export const ALL_STATUSES = Object.keys(TRANSITIONS) as CaseStatus[];
export const ALL_COMMANDS: CaseCommand[] = [
  'anleitung_starten',
  'hilfe_holen',
  'selbst_geloest',
  'im_call_geloest',
  'schaden_melden',
  'freigabe_erteilt',
  'freigabe_abgelehnt',
  'termin_bestaetigt',
  'selbst_zahlen',
  'repariert',
  'problem_besteht_weiter',
  'abbrechen',
];

export class TransitionError extends Error {
  constructor(
    readonly from: CaseStatus,
    readonly command: CaseCommand,
  ) {
    super(`Übergang nicht erlaubt: ${from} → ${command}`);
    this.name = 'TransitionError';
  }
}

export class ConsentRequiredError extends Error {
  constructor(readonly purpose: ConsentPurpose) {
    super(`Bestätigung fehlt: ${purpose}`);
    this.name = 'ConsentRequiredError';
  }
}

export function canTransition(current: CaseStatus, command: CaseCommand): boolean {
  return TRANSITIONS[current][command] !== undefined;
}

export function nextStatus(current: CaseStatus, command: CaseCommand): CaseStatus {
  const next = TRANSITIONS[current][command];
  if (!next) throw new TransitionError(current, command);
  return next;
}

export function allowedCommands(current: CaseStatus): CaseCommand[] {
  return ALL_COMMANDS.filter((c) => canTransition(current, c));
}

export function isClosed(status: CaseStatus): boolean {
  return status === 'erledigt' || status === 'abgebrochen';
}

/** Gültige Bestätigung: von dieser Person, für diesen Zweck und Fall, nicht widerrufen. */
export function findActiveConsent(
  consents: readonly Consent[],
  personId: Id,
  purpose: ConsentPurpose,
  caseId?: Id,
): Consent | undefined {
  return consents.find(
    (c) =>
      c.personId === personId &&
      c.purpose === purpose &&
      !c.revokedAt &&
      (c.caseId === undefined || c.caseId === caseId),
  );
}

/** Der Videocall startet nur mit bestätigter Weitergabe an die Fachkraft. */
export function canStartVideoCall(consents: readonly Consent[], personId: Id, caseId: Id): boolean {
  return findActiveConsent(consents, personId, 'weitergabe_fachkraft', caseId) !== undefined;
}

export interface CommandContext {
  now: ISODateTime;
  /** Wer den Befehl auslöst */
  actor: CaseEvent['actor'];
  newId: (prefix: string) => Id;
  consents?: readonly Consent[];
  /** Für schaden_melden: Vertrag, über den gemeldet wird */
  contractId?: Id;
  /** Für freigabe_*: Mensch oder Regel (Art. 22 DSGVO) */
  decisionActor?: 'mensch' | 'regel';
  approvedAmount?: Cents;
  note?: string;
  /** Für abbrechen */
  cancelReason?: string;
  /** Andere Lösung als die Standard-Lösung des Befehls, z. B. 'pflege_erledigt' */
  resolution?: CaseResolution;
}

export interface CommandResult {
  case: Case;
  events: CaseEvent[];
}

const resolutions: Partial<Record<CaseCommand, CaseResolution>> = {
  selbst_geloest: 'selbst_geloest',
  im_call_geloest: 'im_call_geloest',
  repariert: 'repariert',
};

const commandEvents: Partial<Record<CaseCommand, CaseEventType>> = {
  anleitung_starten: 'anleitung_gestartet',
  schaden_melden: 'schaden_gemeldet',
  freigabe_erteilt: 'freigabe_entschieden',
  freigabe_abgelehnt: 'freigabe_entschieden',
  termin_bestaetigt: 'termin_bestaetigt',
  repariert: 'reparatur_abgeschlossen',
  problem_besteht_weiter: 'problem_besteht_weiter',
  abbrechen: 'abgebrochen',
};

function event(
  c: Case,
  ctx: CommandContext,
  type: CaseEventType,
  payload: Record<string, unknown> = {},
  actor: CaseEvent['actor'] = ctx.actor,
): CaseEvent {
  return { id: ctx.newId('ev'), caseId: c.id, type, at: ctx.now, actor, payload };
}

/**
 * Führt einen Befehl aus. Wirft bei verbotenen Übergängen und fehlender Bestätigung.
 * Jeder Statuswechsel erzeugt ein Ereignis 'status_geaendert'.
 */
export function applyCommand(c: Case, command: CaseCommand, ctx: CommandContext): CommandResult {
  const to = nextStatus(c.status, command);
  const events: CaseEvent[] = [];
  const next: Case = { ...c, status: to, updatedAt: ctx.now };

  if (command === 'schaden_melden') {
    // Die Schadenmeldung ist eine Erklärung der Versicherungsnehmerin (VVG § 30).
    // Sie entsteht nur durch ihre eigene, aktive Bestätigung.
    if (ctx.actor.kind !== 'haushalt' || ctx.actor.id !== c.reportedBy) {
      throw new ConsentRequiredError('weitergabe_versicherer');
    }
    const consent = findActiveConsent(
      ctx.consents ?? [],
      c.reportedBy,
      'weitergabe_versicherer',
      c.id,
    );
    if (!consent) throw new ConsentRequiredError('weitergabe_versicherer');
    if (!ctx.contractId) throw new Error('Schadenmeldung ohne Vertrag');
    const claim: Claim = {
      contractId: ctx.contractId,
      reportedAt: ctx.now,
      reportedBy: c.reportedBy,
      confirmationId: consent.id,
    };
    next.claim = claim;
    events.push(event(c, ctx, 'schaden_gemeldet', { contractId: ctx.contractId }));
  } else if (command === 'freigabe_erteilt' || command === 'freigabe_abgelehnt') {
    if (!c.claim) throw new Error('Freigabe ohne Schadenmeldung');
    const result = command === 'freigabe_erteilt' ? 'freigegeben' : 'abgelehnt';
    next.claim = {
      ...c.claim,
      decision: {
        result,
        at: ctx.now,
        actor: ctx.decisionActor ?? 'mensch',
        approvedAmount: ctx.approvedAmount,
        note: ctx.note,
      },
    };
    events.push(
      event(c, ctx, 'freigabe_entschieden', { result, actor: ctx.decisionActor ?? 'mensch' }),
    );
  } else {
    const type = commandEvents[command];
    if (type)
      events.push(event(c, ctx, type, command === 'abbrechen' ? { reason: ctx.cancelReason } : {}));
  }

  const resolution = resolutions[command] && (ctx.resolution ?? resolutions[command]);
  if (resolution) next.resolution = resolution;
  if (to === 'erledigt' || to === 'abgebrochen') next.closedAt = ctx.now;
  if (to === 'abgebrochen') next.cancelReason = ctx.cancelReason;
  if (command === 'problem_besteht_weiter') {
    next.closedAt = undefined;
    next.resolution = undefined;
  }
  next.pausedAt = undefined;

  events.push(event(c, ctx, 'status_geaendert', { from: c.status, to, command }));
  return { case: next, events };
}

/** „Später weitermachen“ ist kein Status. Es setzt nur pausedAt. */
export function pauseCase(c: Case, ctx: CommandContext): CommandResult {
  const next: Case = { ...c, pausedAt: ctx.now, updatedAt: ctx.now };
  return { case: next, events: [event(c, ctx, 'pausiert')] };
}

export function resumeCase(c: Case, ctx: CommandContext): CommandResult {
  const next: Case = { ...c, pausedAt: undefined, updatedAt: ctx.now };
  return { case: next, events: [event(c, ctx, 'fortgesetzt')] };
}

export type QuoteInput = Omit<Quote, 'saving' | 'repair'> & {
  repair: Omit<Quote['repair'], 'total'>;
};

/** Die Ersparnis wird berechnet, nie eingetragen. */
export function createQuote(input: QuoteInput): Quote {
  const total = input.repair.parts + input.repair.labor;
  return {
    ...input,
    repair: { ...input.repair, total },
    saving: input.replacement.total - total,
  };
}

export const systemActor = (kind: ActorKind = 'system'): CaseEvent['actor'] => ({ kind });
