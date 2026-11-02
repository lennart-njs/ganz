// Anmeldung im Händlerportal (Demo). Ein Konto je Händler aus config/demo.config.ts,
// Passwort aus PORTAL_DEMO_PASSWORD (Standard „demo“). Kein echtes Konto, kein echtes Passwort.
// Später übernimmt das der Login des Backends, mit Rollen je Mitarbeiter.
import crypto from 'node:crypto';

import { demoConfig } from '@/config/demo.config';

import type { Tenant } from './types';

const SESSION_HOURS = 8;
const secret = process.env.PORTAL_SESSION_SECRET ?? crypto.randomBytes(32).toString('hex');

/** Ein Demo-Konto je Händler mit `portalUser` (config/demo.config.ts) */
const accounts = demoConfig.dealers.flatMap((d) =>
  'portalUser' in d && d.portalUser
    ? [{ email: d.portalUser, tenant: { kind: 'haendler' as const, id: d.id, name: d.name } }]
    : [],
);

const sign = (data: string) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Gibt ein Sitzungs-Token zurück oder null */
export function login(email: unknown, password: unknown): { token: string; tenant: Tenant } | null {
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const account = accounts.find((a) => a.email === email.trim().toLowerCase());
  const expected = process.env.PORTAL_DEMO_PASSWORD ?? 'demo';
  if (!account || !safeEqual(password, expected)) return null;
  const tenant: Tenant = { ...account.tenant, userName: account.email };
  const body = Buffer.from(
    JSON.stringify({ ...tenant, exp: Date.now() + SESSION_HOURS * 3_600_000 }),
  ).toString('base64url');
  return { token: `${body}.${sign(body)}`, tenant };
}

/** Mandant aus „Authorization: Bearer …“, sonst null */
export function tenantFrom(request: Request): Tenant | null {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Tenant & {
      exp: number;
    };
    if (data.exp < Date.now()) return null;
    return { kind: 'haendler', id: data.id, name: data.name, userName: data.userName };
  } catch {
    return null;
  }
}
