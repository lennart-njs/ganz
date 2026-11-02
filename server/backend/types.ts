// Schnittstelle des Backends (docs/BACKEND.md). Heute ein Dateispeicher für die Demo,
// später eine Datenbank. Wer es ersetzt, implementiert nur dieses Interface.
import type { RetailerAction, SharedCaseFile, SharedCaseRecord } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

/** Mandant im Portal. Heute nur Händler, später auch Versicherer und Hersteller. */
export interface Tenant {
  kind: 'haendler';
  id: string;
  name: string;
  /** Wer im Portal angemeldet ist, steht als Absender an den Ereignissen */
  userName: string;
}

export interface CaseStore {
  /** App: Fallakte nach Bestätigung anlegen oder aktualisieren. Ohne passendes Token: Fehler. */
  upsertShare(
    file: SharedCaseFile,
    token: string | undefined,
  ): Promise<{ ok: true; token: string } | { ok: false; reason: 'token' | 'widerrufen' }>;
  /** App: Widerruf. Personendaten werden gelöscht, Fallnummer und Zeitpunkte bleiben. */
  revokeShare(caseId: string, token: string): Promise<boolean>;
  /** App: Ereignisse des Händlers seit einem Zeitpunkt */
  retailerEvents(caseId: string, token: string, since?: string): Promise<CaseEvent[] | null>;
  /** Portal: Fälle dieses Mandanten, neueste zuerst */
  listForTenant(tenant: Tenant): Promise<SharedCaseRecord[]>;
  /** Portal: ein Fall, nur wenn er an diesen Mandanten geteilt wurde */
  getForTenant(tenant: Tenant, caseId: string): Promise<SharedCaseRecord | null>;
  /** Portal: Aktion des Händlers. Wird ein CaseEvent, das die App beim nächsten Abruf bekommt. */
  addRetailerAction(
    tenant: Tenant,
    caseId: string,
    action: RetailerAction,
  ): Promise<CaseEvent | null>;
}
