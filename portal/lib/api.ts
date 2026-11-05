// Das Portal spricht nur über die API mit dem Backend (docs/BACKEND.md).
// Heute: Expo-Dev-Server (GANZ_API_URL, Standard http://127.0.0.1:8081). Später: echtes Backend.
import 'server-only';

import { redirect } from 'next/navigation';

import type { AnonymousOutcome, DealerSettings, SettingsSection } from '@/model/portal';
import type { RetailerAction, SharedCaseRecord, WorkflowAction } from '@/model/sharing';
import type { BulkAction } from '@/server/backend/types';

import { sessionToken } from './session';

const BASE = process.env.GANZ_API_URL ?? 'http://127.0.0.1:8081';

export interface TenantInfo {
  id: string;
  name: string;
  userName: string;
  memberId?: string;
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await sessionToken();
  if (!token) redirect('/anmelden');
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (res.status === 401) redirect('/anmelden');
  return res;
}

export async function listCases(): Promise<{ tenant: TenantInfo; cases: SharedCaseRecord[] }> {
  const res = await call('/api/v1/portal/faelle');
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return res.json();
}

export async function getCase(
  id: string,
): Promise<{ tenant: TenantInfo; record: SharedCaseRecord } | null> {
  const res = await call(`/api/v1/portal/faelle/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return res.json();
}

export async function sendAction(id: string, action: RetailerAction): Promise<boolean> {
  const res = await call(`/api/v1/portal/faelle/${encodeURIComponent(id)}/aktionen`, {
    method: 'POST',
    body: JSON.stringify(action),
  });
  return res.ok;
}

/** Notiz, Zuweisung oder Stand, nur im Portal */
export async function sendWorkflow(id: string, action: WorkflowAction): Promise<boolean> {
  const res = await call(`/api/v1/portal/faelle/${encodeURIComponent(id)}/bearbeitung`, {
    method: 'POST',
    body: JSON.stringify(action),
  });
  return res.ok;
}

export async function sendBulk(ids: string[], action: BulkAction): Promise<number> {
  const res = await call('/api/v1/portal/sammelaktion', {
    method: 'POST',
    body: JSON.stringify({ ids, action }),
  });
  if (!res.ok) return 0;
  return ((await res.json()) as { count: number }).count;
}

export async function getSettings(): Promise<{ tenant: TenantInfo; settings: DealerSettings }> {
  const res = await call('/api/v1/portal/einstellungen');
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return res.json();
}

export async function saveSettings(section: SettingsSection, value: unknown): Promise<boolean> {
  const res = await call('/api/v1/portal/einstellungen', {
    method: 'PUT',
    body: JSON.stringify({ section, value }),
  });
  return res.ok;
}

export async function getAnonymous(): Promise<AnonymousOutcome[]> {
  const res = await call('/api/v1/portal/auswertung');
  if (!res.ok) throw new Error(`Backend ${res.status}`);
  return ((await res.json()) as { anonymous: AnonymousOutcome[] }).anonymous;
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string } | 'falsch' | 'offline'> {
  try {
    const res = await fetch(`${BASE}/api/v1/portal/anmelden`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return 'falsch';
    return (await res.json()) as { token: string };
  } catch {
    return 'offline';
  }
}

/**
 * Abmelden: sperrt das Token im Backend. Danach gilt es nirgends mehr, auch nicht, wenn jemand das
 * Cookie kopiert hat. false: Backend nicht erreichbar oder Token schon ungültig. Das Cookie löscht
 * die Route /abmelden in jedem Fall.
 */
export async function logout(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/v1/portal/abmelden`, {
      method: 'POST',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
