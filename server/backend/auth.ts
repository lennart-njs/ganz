// Anmeldung im Händlerportal (Demo). Ein Konto aus config/portal.demo.ts (Sandra K. bei Fründ).
// Kein echtes Konto, kein echtes Passwort. Später übernimmt das der Login des Backends, mit
// Rollen je Teammitglied.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { demoConfig } from '@/config/demo.config';
import { fruendSettings, portalLogin } from '@/config/portal.demo';

import type { Tenant } from './types';

const SESSION_HOURS = 8;
/**
 * Geheimnis zum Signieren der Sitzung. Expo bündelt jede API-Route einzeln, darum liegt es für die
 * Demo im Datenordner und gilt für alle Routen. In echt: PORTAL_SESSION_SECRET setzen.
 */
function sessionSecret(): string {
  if (process.env.PORTAL_SESSION_SECRET) return process.env.PORTAL_SESSION_SECRET;
  const dir = process.env.GANZ_DATA_DIR ?? path.join(process.cwd(), '.data');
  const file = path.join(dir, 'portal-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const fresh = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, fresh, { mode: 0o600 });
    return fresh;
  }
}
const secret = sessionSecret();

/** Das Demo-Konto (config/portal.demo.ts) */
const accounts = [portalLogin].flatMap((l) => {
  const dealer = demoConfig.dealers.find((d) => d.id === l.dealerId);
  const member = fruendSettings.team.find((m) => m.id === l.memberId);
  if (!dealer || !member) return [];
  const tenant: Tenant = {
    kind: 'haendler',
    id: dealer.id,
    name: dealer.name,
    userName: member.name,
    memberId: member.id,
  };
  return [{ email: l.email, tenant }];
});

const sign = (data: string) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Das Passwort des Demo-Kontos. PORTAL_DEMO_PASSWORD, wenn gesetzt. Sonst das aus der
 * Konfiguration, aber nur in der Entwicklung (`npx expo start` setzt NODE_ENV=development) oder
 * mit PORTAL_DEMO_LOGIN=1. In Produktion ohne beides: null, niemand kann sich anmelden.
 */
export function demoPassword(env: Record<string, string | undefined> = process.env): string | null {
  if (env.PORTAL_DEMO_PASSWORD) return env.PORTAL_DEMO_PASSWORD;
  const demo = env.NODE_ENV !== 'production' || env.PORTAL_DEMO_LOGIN === '1';
  return demo ? portalLogin.demoPassword : null;
}

/** Gibt ein Sitzungs-Token zurück oder null */
export function login(email: unknown, password: unknown): { token: string; tenant: Tenant } | null {
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const account = accounts.find((a) => a.email === email.trim().toLowerCase());
  const expected = demoPassword();
  if (!account || expected === null || !safeEqual(password, expected)) return null;
  const tenant: Tenant = account.tenant;
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
    return {
      kind: 'haendler',
      id: data.id,
      name: data.name,
      userName: data.userName,
      ...(data.memberId ? { memberId: data.memberId } : {}),
    };
  } catch {
    return null;
  }
}
