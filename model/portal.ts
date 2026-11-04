// Händlerportal: Einstellungen, Team und Bearbeitungsstand (Entscheidung 33).
// Gleiche Typen für Backend (server/backend) und Portal (portal/).
import type { DeviceCategory, ISODateTime, Id } from './types';

// ---------- Bearbeitungsstand im Portal ----------

/** Warteschlangen der Arbeitsliste */
export type WorkflowStatus = 'neu' | 'wartet_uns' | 'wartet_kunde' | 'termin' | 'erledigt';
export const workflowStatuses: WorkflowStatus[] = [
  'neu',
  'wartet_uns',
  'wartet_kunde',
  'termin',
  'erledigt',
];

/** Ist der Wert ein Stand der Arbeitsliste? Für Eingaben von außen, etwa die Sammelaktion. */
export function isWorkflowStatus(x: unknown): x is WorkflowStatus {
  return (workflowStatuses as readonly unknown[]).includes(x);
}

export interface Workflow {
  status: WorkflowStatus;
  /** Teammitglied, das den Fall bearbeitet */
  assigneeId?: Id;
  /** Seit wann der Fall in diesem Stand ist (für die Fristen) */
  since: ISODateTime;
  /** Letzte Nachricht oder Antwort der Kundschaft */
  lastCustomerAt?: ISODateTime;
  /** Gelesen: zuletzt im Portal geöffnet */
  seenAt?: ISODateTime;
}

/** Interne Notiz, nur für das Team, nie in der App */
export interface InternalNote {
  id: Id;
  at: ISODateTime;
  by: string;
  text: string;
}

/** Zugriffsprotokoll: wer hat die Fallakte wann geöffnet (Datenschutz) */
export interface AccessEntry {
  at: ISODateTime;
  by: string;
}

/** Anonyme Zahlen zu Fällen an Geräten des Händlers, die nicht an ihn gesendet wurden */
export interface AnonymousOutcome {
  at: ISODateTime;
  category: DeviceCategory;
  model: string;
  /** selbst gelöst, im Videocall gelöst, über den Versicherer oder einen Betrieb */
  outcome: 'selbst_geloest' | 'im_call_geloest' | 'versicherer' | 'betrieb';
  problem: string;
}

// ---------- Einstellungen je Händler ----------

export type TeamRole = 'leitung' | 'sachbearbeitung' | 'technik' | 'lesen';

export interface TeamMember {
  id: Id;
  name: string;
  role: TeamRole;
  email: string;
  branchId?: Id;
  active: boolean;
}

export interface Branch {
  id: Id;
  name: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
}

export interface MessageTemplate {
  id: Id;
  title: string;
  text: string;
}

export interface QuestionTemplate {
  id: Id;
  question: string;
  options: string[];
}

export interface DealerSettings {
  profile: {
    name: string;
    shortName: string;
    email: string;
    phone: string;
    website: string;
    branches: Branch[];
    /** Servicezeiten: Wochentage (1 = Montag) und Uhrzeit */
    hours: { days: number[]; from: string; to: string };
  };
  messages: {
    greeting: { enabled: boolean; text: string };
    away: { enabled: boolean; text: string };
    templates: MessageTemplate[];
    questions: QuestionTemplate[];
  };
  team: TeamMember[];
  rules: {
    autoAccept: boolean;
    /** Automatisch zuweisen je Gerätetyp */
    autoAssign: { category: DeviceCategory; assigneeId: Id }[];
    /** Fehlt der Kaufbeleg, fragt das Portal automatisch danach */
    requestProof: boolean;
    warrantyMonths: number;
    /** Kulanz bis so viele Monate nach Ende der Gewährleistung */
    goodwillMonths: number;
    /** Kulanz bis zu diesem Betrag in Cent */
    goodwillMaxCents: number;
    /** Fristen: erste Reaktion und Antwort auf die Kundschaft, in Stunden */
    slaFirstHours: number;
    slaReplyHours: number;
  };
  service: {
    ownService: boolean;
    serviceName: string;
    /** Einsatzgebiet: Postleitzahlen, die so beginnen */
    zipPrefixes: string[];
    slots: string[];
    prices: { travelCents: number; hourCents: number };
    partners: { name: string; authorized: boolean }[];
    /** Kosten, die ein vermiedener Einsatz oder eine vermiedene Rücksendung spart (Auswertung) */
    savings: { visitCents: number; returnCents: number };
  };
  notifications: {
    newCase: { email: boolean; push: boolean };
    overdue: { email: boolean; push: boolean };
    customerReply: { email: boolean; push: boolean };
    dailyReport: boolean;
    recipients: string;
  };
  privacy: {
    retentionMonths: number;
    avvSignedAt?: ISODateTime;
    accessLog: boolean;
  };
  /** Schnittstellen: Schlüssel wie in portal/lib/integrations.ts */
  integrations: Record<string, 'verbunden' | 'getrennt'>;
}

export type SettingsSection = keyof DealerSettings;
export const settingsSections: SettingsSection[] = [
  'profile',
  'messages',
  'team',
  'rules',
  'service',
  'notifications',
  'privacy',
  'integrations',
];

/** Platzhalter in Nachrichten: {kunde}, {fall}, {haendler}, {telefon} */
export function fillTemplate(
  text: string,
  values: { kunde?: string; fall?: string; haendler?: string; telefon?: string },
): string {
  return text
    .replaceAll('{kunde}', values.kunde ?? '')
    .replaceAll('{fall}', values.fall ?? '')
    .replaceAll('{haendler}', values.haendler ?? '')
    .replaceAll('{telefon}', values.telefon ?? '');
}

/** Ist jetzt Servicezeit? Ortszeit Berlin. */
export function inServiceHours(hours: DealerSettings['profile']['hours'], now = new Date()) {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const day = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'].findIndex((d) => wd.startsWith(d));
  const hm = `${parts.find((p) => p.type === 'hour')?.value}:${parts.find((p) => p.type === 'minute')?.value}`;
  return hours.days.includes(day === 0 ? 7 : day) && hm >= hours.from && hm < hours.to;
}
