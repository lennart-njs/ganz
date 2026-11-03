// Backend für geteilte Fälle (app/api/v1/…, docs/BACKEND.md). Heute der Expo-Dev-Server mit
// Dateispeicher, später ein echtes Backend unter derselben Schnittstelle.
import type { SharedCaseFile } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

export type ShareResult =
  | { ok: true; token: string; events: CaseEvent[] }
  | { ok: false; reason: 'token' | 'widerrufen' | 'netz' };

export interface BackendService {
  /** Akte anlegen (ohne Token) oder aktualisieren (mit Token). Mit den Ereignissen, die dabei entstanden. */
  share(file: SharedCaseFile, token?: string): Promise<ShareResult>;
  /** Ereignisse des Händlers seit einem Zeitpunkt. null: nicht erreichbar oder kein Zugriff. */
  retailerEvents(caseId: string, token: string, since?: string): Promise<CaseEvent[] | null>;
  /** Widerruf: Der Händler sieht danach keine Personendaten mehr */
  revoke(caseId: string, token: string): Promise<boolean>;
}

export const httpBackendService: BackendService = {
  async share(file, token) {
    try {
      const res = await fetch('/api/v1/faelle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Share-Token': token } : {}),
        },
        body: JSON.stringify({ file }),
      });
      const data = (await res.json()) as { token?: string; error?: string; events?: CaseEvent[] };
      if (res.ok && data.token)
        return {
          ok: true,
          token: data.token,
          events: Array.isArray(data.events) ? data.events : [],
        };
      return { ok: false, reason: data.error === 'widerrufen' ? 'widerrufen' : 'token' };
    } catch {
      return { ok: false, reason: 'netz' };
    }
  },
  async retailerEvents(caseId, token, since) {
    try {
      const q = since ? `?seit=${encodeURIComponent(since)}` : '';
      const res = await fetch(`/api/v1/faelle/${encodeURIComponent(caseId)}/ereignisse${q}`, {
        headers: { 'X-Share-Token': token },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { events?: CaseEvent[] };
      return Array.isArray(data.events) ? data.events : null;
    } catch {
      return null;
    }
  },
  async revoke(caseId, token) {
    try {
      const res = await fetch(`/api/v1/faelle/${encodeURIComponent(caseId)}`, {
        method: 'DELETE',
        headers: { 'X-Share-Token': token },
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
