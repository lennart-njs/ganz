// Geteilte Fallakte: was ein Empfänger (heute der Händler) nach deiner Bestätigung bekommt.
// Gleiches Format für App, Backend und Händlerportal (Entscheidung 28, docs/BACKEND.md).
// Nicht dabei: das Gespräch mit dem Reparatur-Assistenten und die Vertragsnummer.
import type {
  Address,
  CaseEntry,
  CaseEvent,
  CaseResolution,
  CaseStatus,
  Confidence,
  DeviceCategory,
  GuideRun,
  ISODateTime,
  Id,
  PartnerRef,
  PhotoPurpose,
  Quote,
} from './types';
import {
  isWorkflowStatus,
  type AccessEntry,
  type InternalNote,
  type Workflow,
  type WorkflowStatus,
} from './portal';

export const SHARE_FORMAT_VERSION = 1;

export interface SharedPhoto {
  id: Id;
  takenAt: ISODateTime;
  purpose: PhotoPurpose;
  source: 'in_app_camera' | 'betrieb' | 'demo';
  /** Verkleinertes JPEG als base64 (ohne Präfix). Fehlt bei Beispielfotos. */
  jpegBase64?: string;
}

export interface SharedCaseFile {
  version: typeof SHARE_FORMAT_VERSION;
  caseId: Id;
  recipient: PartnerRef;
  /** Consent mit purpose 'weitergabe_haendler', ohne ihn gibt es keine Fallakte */
  consentId: Id;
  sharedAt: ISODateTime;
  updatedAt: ISODateTime;
  /** Beispieldaten aus dem Demo-Modus */
  isExample: boolean;
  customer: { name: string; address?: Address; email?: string };
  device: {
    manufacturer: string;
    model: string;
    category: DeviceCategory;
    categoryLabel: string;
    materialNumber?: string;
    serialNumber?: string;
    purchaseDate?: ISODateTime;
    soldBy?: PartnerRef;
  };
  /** Zusätzlicher Schutz, ohne Vertragsnummer */
  protection?: { provider: string; product: string; validUntil: ISODateTime };
  case: {
    status: CaseStatus;
    statusLabel: string;
    entry: CaseEntry;
    problemLabel: string;
    createdAt: ISODateTime;
    updatedAt: ISODateTime;
    closedAt?: ISODateTime;
    resolution?: CaseResolution;
  };
  results: {
    component?: string;
    displayMessage?: string;
    confidence: Confidence;
    source: 'fehlererkennung' | 'nutzerangabe' | 'fachkraft' | 'betrieb';
    at: ISODateTime;
  }[];
  guide?: {
    title: string;
    source: string;
    total: number;
    completed: string[];
    abortedAt?: { step: number; title: string };
    note?: string;
    outcome?: GuideRun['outcome'];
  };
  finding?: { label: string; by: string; at: ISODateTime };
  quote?: Pick<Quote, 'repair' | 'replacement' | 'saving' | 'payer' | 'deductible' | 'isExample'>;
  booking?: { provider: string; slotLabel: string; status: string };
  photos: SharedPhoto[];
  /** Zeitstrahl wie in der Fallakte der App, schon lesbar */
  timeline: { at: ISODateTime; type: CaseEvent['type']; label: string; actor: string }[];
  /** Rückfragen des Händlers und deine Antworten */
  answers: { questionEventId: Id; answer: string; at: ISODateTime }[];
  /** Nachrichten der Kundschaft an den Händler (Entscheidung 32) */
  messages?: { id: Id; at: ISODateTime; text: string; photoId?: Id }[];
  /** Bewertung des Betriebs nach der Reparatur, 1 bis 5 */
  rating?: number;
}

// ---------- Aktionen im Händlerportal ----------

export type RetailerDecision = 'gewaehrleistung' | 'kulanz' | 'an_versicherer' | 'abgelehnt';
export type RetailerStatus = 'in_pruefung' | 'ersatzteil_bestellt' | 'abgeschlossen';

export type PartStatus = 'bestellt' | 'geliefert';

/** Stand eines Ersatzteils aus dem Ereignis haendler_ersatzteil. Ohne „geliefert“: bestellt. */
export function partStatusOf(payload: Readonly<Record<string, unknown>>): PartStatus {
  return payload.status === 'geliefert' ? 'geliefert' : 'bestellt';
}

/** Aktionen, die beim Haushalt im Gespräch ankommen */
export type RetailerAction =
  | { type: 'annehmen' }
  | { type: 'rueckfrage'; question: string; options: string[] }
  | { type: 'entscheidung'; decision: RetailerDecision; note?: string }
  | { type: 'betrieb'; partnerName: string; slot?: string }
  | { type: 'status'; status: RetailerStatus; note?: string }
  | { type: 'nachricht'; text: string }
  | { type: 'termin'; partnerName: string; slots: string[] }
  | { type: 'ersatzteil'; part: string; status: PartStatus; eta?: string };

export const retailerEventType = {
  annehmen: 'haendler_angenommen',
  rueckfrage: 'haendler_rueckfrage',
  entscheidung: 'haendler_entscheidung',
  betrieb: 'haendler_betrieb',
  status: 'haendler_status',
  nachricht: 'haendler_nachricht',
  termin: 'haendler_termin',
  ersatzteil: 'haendler_ersatzteil',
} as const satisfies Record<RetailerAction['type'], CaseEvent['type']>;

/** Aktionen nur im Portal, ohne Nachricht an den Haushalt */
export type WorkflowAction =
  | { type: 'notiz'; text: string }
  | { type: 'zuweisen'; assigneeId: string | null }
  | { type: 'stand'; status: WorkflowStatus }
  /** Ein Foto aus dem Fall gilt als Kaufbeleg, etwa eins aus dem Chat (Portal-Prüfung 05.11.) */
  | { type: 'kaufbeleg'; photoId: string };

/** Ein Fall im Backend: die geteilte Akte, die Ereignisse des Händlers und der Widerruf */
export interface SharedCaseRecord {
  file: SharedCaseFile;
  retailerEvents: CaseEvent[];
  /** Nach dem Widerruf bleiben nur Fallnummer und Zeitpunkte, keine Personendaten */
  revokedAt?: ISODateTime;
  /** Bearbeitungsstand im Portal */
  workflow?: Workflow;
  /** Interne Notizen des Teams */
  notes?: InternalNote[];
  /** Zugriffsprotokoll */
  access?: AccessEntry[];
  /** Foto, das das Team als Kaufbeleg markiert hat */
  proofPhotoId?: string;
}

const ACTION_TEXT_MAX = 500;

/** Prüft eine Aktion aus dem Portal. null: ungültig. */
export function parseRetailerAction(body: unknown): RetailerAction | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const text = (x: unknown, required = false) =>
    typeof x === 'string' &&
    x.trim().length <= ACTION_TEXT_MAX &&
    (!required || x.trim().length > 0);
  switch (o.type) {
    case 'annehmen':
      return { type: 'annehmen' };
    case 'rueckfrage': {
      const options = Array.isArray(o.options) ? o.options : [];
      if (!text(o.question, true) || options.length > 4 || !options.every((x) => text(x, true)))
        return null;
      return {
        type: 'rueckfrage',
        question: (o.question as string).trim(),
        options: (options as string[]).map((x) => x.trim()),
      };
    }
    case 'entscheidung':
      if (
        !['gewaehrleistung', 'kulanz', 'an_versicherer', 'abgelehnt'].includes(o.decision as string)
      )
        return null;
      if (o.note !== undefined && !text(o.note)) return null;
      return {
        type: 'entscheidung',
        decision: o.decision as RetailerDecision,
        ...(typeof o.note === 'string' && o.note.trim() ? { note: o.note.trim() } : {}),
      };
    case 'betrieb':
      if (!text(o.partnerName, true) || (o.slot !== undefined && !text(o.slot))) return null;
      return {
        type: 'betrieb',
        partnerName: (o.partnerName as string).trim(),
        ...(typeof o.slot === 'string' && o.slot.trim() ? { slot: o.slot.trim() } : {}),
      };
    case 'status':
      if (!['in_pruefung', 'ersatzteil_bestellt', 'abgeschlossen'].includes(o.status as string))
        return null;
      if (o.note !== undefined && !text(o.note)) return null;
      return {
        type: 'status',
        status: o.status as RetailerStatus,
        ...(typeof o.note === 'string' && o.note.trim() ? { note: o.note.trim() } : {}),
      };
    case 'nachricht':
      if (typeof o.text !== 'string' || !o.text.trim() || o.text.length > MESSAGE_MAX) return null;
      return { type: 'nachricht', text: o.text.trim() };
    case 'termin': {
      const slots = Array.isArray(o.slots) ? o.slots : [];
      if (!text(o.partnerName, true) || slots.length < 1 || slots.length > 4) return null;
      if (!slots.every((x) => text(x, true))) return null;
      return {
        type: 'termin',
        partnerName: (o.partnerName as string).trim(),
        slots: (slots as string[]).map((x) => x.trim()),
      };
    }
    case 'ersatzteil':
      if (!text(o.part, true) || !['bestellt', 'geliefert'].includes(o.status as string))
        return null;
      if (o.eta !== undefined && !text(o.eta)) return null;
      return {
        type: 'ersatzteil',
        part: (o.part as string).trim(),
        status: o.status as PartStatus,
        ...(typeof o.eta === 'string' && o.eta.trim() ? { eta: o.eta.trim() } : {}),
      };
    default:
      return null;
  }
}

const MESSAGE_MAX = 2000;

/** Prüft eine Aktion, die nur im Portal wirkt. null: ungültig. */
export function parseWorkflowAction(body: unknown): WorkflowAction | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  switch (o.type) {
    case 'notiz':
      if (typeof o.text !== 'string' || !o.text.trim() || o.text.length > MESSAGE_MAX) return null;
      return { type: 'notiz', text: o.text.trim() };
    case 'zuweisen':
      if (o.assigneeId !== null && (typeof o.assigneeId !== 'string' || o.assigneeId.length > 80))
        return null;
      return { type: 'zuweisen', assigneeId: o.assigneeId as string | null };
    case 'stand':
      if (!isWorkflowStatus(o.status)) return null;
      return { type: 'stand', status: o.status };
    case 'kaufbeleg':
      if (typeof o.photoId !== 'string' || !o.photoId || o.photoId.length > 80) return null;
      return { type: 'kaufbeleg', photoId: o.photoId };
    default:
      return null;
  }
}
