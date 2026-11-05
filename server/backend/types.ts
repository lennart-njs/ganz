// Schnittstelle des Backends (docs/BACKEND.md). Heute ein Dateispeicher für die Demo,
// später eine Datenbank. Wer es ersetzt, implementiert nur dieses Interface.
import type { AnonymousOutcome, DealerSettings } from '@/model/portal';
import type {
  RetailerAction,
  SharedCaseFile,
  SharedCaseRecord,
  WorkflowAction,
} from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

/** Mandant im Portal. Heute nur Händler, später auch Versicherer und Hersteller. */
export interface Tenant {
  kind: 'haendler';
  id: string;
  name: string;
  /** Wer im Portal angemeldet ist, steht als Absender an den Ereignissen */
  userName: string;
  /** Teammitglied der Anmeldung */
  memberId?: string;
}

/**
 * token: Fallnummer vergeben, aber ohne passendes Token (oder für einen anderen Händler).
 * widerrufen: Die Weitergabe ist widerrufen. doppelt: Die Bestätigung gehört schon zu einem Fall.
 */
export type ShareResult =
  | { ok: true; token: string; events: CaseEvent[] }
  | { ok: false; reason: 'token' | 'widerrufen' | 'doppelt' };

/** Massenaktion in der Arbeitsliste */
export type BulkAction =
  | { type: 'annehmen' }
  | { type: 'zuweisen'; assigneeId: string | null }
  | { type: 'stand'; status: import('@/model/portal').WorkflowStatus };

export interface CaseStore {
  /**
   * App: Fallakte nach Bestätigung anlegen oder aktualisieren. Ohne passendes Token: Fehler.
   * Eine Bestätigung (consentId) gehört zu genau einem Fall, der Empfänger bleibt derselbe.
   * Beim ersten Mal greifen die Regeln des Händlers (Begrüßung, annehmen, zuweisen, Kaufbeleg).
   * Die dabei entstandenen Ereignisse kommen gleich mit zurück.
   */
  upsertShare(file: SharedCaseFile, token: string | undefined): Promise<ShareResult>;
  /** App: Widerruf. Personendaten werden gelöscht, Fallnummer und Zeitpunkte bleiben. */
  revokeShare(caseId: string, token: string): Promise<boolean>;
  /** App: Ereignisse des Händlers seit einem Zeitpunkt */
  retailerEvents(caseId: string, token: string, since?: string): Promise<CaseEvent[] | null>;
  /** Portal: Fälle dieses Mandanten, neueste zuerst */
  listForTenant(tenant: Tenant): Promise<SharedCaseRecord[]>;
  /** Portal: ein Fall, nur wenn er an diesen Mandanten geteilt wurde. Mit Eintrag ins Zugriffsprotokoll. */
  getForTenant(tenant: Tenant, caseId: string): Promise<SharedCaseRecord | null>;
  /** Portal: Aktion des Händlers. Wird ein CaseEvent, das die App beim nächsten Abruf bekommt. */
  addRetailerAction(
    tenant: Tenant,
    caseId: string,
    action: RetailerAction,
  ): Promise<CaseEvent | null>;
  /** Portal: Notiz, Zuweisung oder Stand, nur im Portal sichtbar */
  applyWorkflow(tenant: Tenant, caseId: string, action: WorkflowAction): Promise<boolean>;
  /** Portal: dieselbe Aktion für mehrere Fälle */
  bulk(tenant: Tenant, caseIds: string[], action: BulkAction): Promise<number>;
  /** Portal: Einstellungen des Mandanten */
  getSettings(tenant: Tenant): Promise<DealerSettings>;
  saveSettings(tenant: Tenant, settings: DealerSettings): Promise<DealerSettings>;
  /** Portal: anonyme Zahlen zu Fällen an Geräten des Händlers ohne Weitergabe (Auswertung) */
  anonymousOutcomes(tenant: Tenant): Promise<AnonymousOutcome[]>;
}
