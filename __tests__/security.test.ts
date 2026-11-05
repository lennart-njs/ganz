/**
 * @jest-environment node
 */
// Härtung von Demo-Backend und Portal: Fälle aus der App, Anmeldung, Abmelden, Einstellungen,
// Cookie und Header des Portals.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { POST as share } from '@/app/api/v1/faelle+api';
import { POST as login } from '@/app/api/v1/portal/anmelden+api';
import { portalLogin } from '@/config/portal.demo';
import { createRateLimiter } from '@/lib/chat/guard';
import type { SharedCaseFile } from '@/model/sharing';
import { getCaseStore, setCaseStore } from '@/server/backend';
import { demoPassword } from '@/server/backend/auth';
import { FileCaseStore } from '@/server/backend/fileStore';
import { seedRecords } from '@/server/backend/seed';
import { shareCreateRate, shareRateLimits, shareUpdateRate } from '@/server/http/rateLimits';

const req = (url: string, init: RequestInit & { json?: unknown } = {}) =>
  new Request(`http://localhost${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });

const file = (over: Partial<SharedCaseFile> = {}): SharedCaseFile => ({
  ...seedRecords()[0]!.file,
  caseId: 'GS-40001',
  consentId: `consent-${over.caseId ?? 'GS-40001'}`,
  isExample: false,
  photos: [],
  answers: [],
  messages: [],
  ...over,
});

async function shareFile(f: unknown, headers: Record<string, string> = {}) {
  const res = await share(req('/api/v1/faelle', { method: 'POST', json: { file: f }, headers }));
  return {
    status: res.status,
    retryAfter: res.headers.get('retry-after'),
    body: (await res.json()) as { token?: string; error?: string },
  };
}

const fruend = { kind: 'haendler' as const, id: 'fruend', name: 'Fründ', userName: 'Sandra K.' };
const stored = async (id: string) =>
  (await getCaseStore().listForTenant(fruend)).find((r) => r.file.caseId === id);

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganz-security-'));
  setCaseStore(new FileCaseStore(path.join(dir, 'db.json')));
  shareRateLimits.create.reset();
  shareRateLimits.update.reset();
});
afterEach(() => {
  setCaseStore(undefined);
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('Fälle aus der App: POST /api/v1/faelle', () => {
  test('nur an Händler, die das Backend kennt', async () => {
    const res = await shareFile(
      file({ recipient: { id: 'irgendwer', kind: 'haendler', name: 'Fründ Elektrogeräte AG' } }),
    );
    expect(res).toMatchObject({ status: 400, body: { error: 'empfaenger' } });
    // Abgelehnt, bevor der Speicher etwas anlegt
    expect(fs.existsSync(path.join(dir, 'db.json'))).toBe(false);
    // Die Händler aus der Demo gehen
    const ok = await shareFile(
      file({ recipient: { id: 'technikhaus', kind: 'haendler', name: 'Technikhaus Online' } }),
    );
    expect(ok.status).toBe(200);
  });

  test('keine Fallnummer zweimal, keine Bestätigung für einen zweiten Fall', async () => {
    const first = await shareFile(file());
    expect(first.status).toBe(200);
    // Dieselbe Fallnummer ohne Token: abgelehnt, der Fall bleibt, wie er war
    const again = await shareFile(file({ customer: { name: 'Jemand Anderes' } }));
    expect(again).toMatchObject({ status: 403, body: { error: 'token' } });
    expect((await stored('GS-40001'))?.file.customer.name).toBe(
      seedRecords()[0]!.file.customer.name,
    );
    // Dieselbe Bestätigung mit neuer Fallnummer: kein neuer Fall
    const copy = await shareFile(file({ caseId: 'GS-40002', consentId: 'consent-GS-40001' }));
    expect(copy).toMatchObject({ status: 409, body: { error: 'doppelt' } });
    expect(await stored('GS-40002')).toBeUndefined();
  });

  test('mit Token bleibt der Empfänger derselbe', async () => {
    const { body } = await shareFile(file());
    const moved = await shareFile(
      file({ recipient: { id: 'technikhaus', kind: 'haendler', name: 'Technikhaus Online' } }),
      { 'X-Share-Token': body.token! },
    );
    expect(moved).toMatchObject({ status: 403, body: { error: 'token' } });
    expect((await stored('GS-40001'))?.file.recipient.id).toBe('fruend');
    // Eine Aktualisierung an denselben Händler geht
    const update = await shareFile(file({ rating: 5 }), { 'X-Share-Token': body.token! });
    expect(update.status).toBe(200);
  });

  test('Rate-Limit für neue Fälle: 429 mit Retry-After, ohne den Body zu lesen', async () => {
    for (let i = 0; i < shareCreateRate.perWindow; i++) {
      const id = `GS-5${String(i).padStart(4, '0')}`;
      expect((await shareFile(file({ caseId: id }))).status).toBe(200);
    }
    const blocked = await share(
      new Request('http://localhost/api/v1/faelle', { method: 'POST', body: 'kein json' }),
    );
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await blocked.json()).toEqual({ error: 'zu_viele' });
  });

  test('Aktualisierungen mit Token zählen getrennt und großzügiger', async () => {
    const { body } = await shareFile(file());
    for (let i = 1; i < shareCreateRate.perWindow; i++)
      shareRateLimits.create.record(['ip:unbekannt']);
    expect((await shareFile(file({ caseId: 'GS-40009' }))).status).toBe(429);
    // Der Fall auf dem Telefon geht weiter
    const update = await shareFile(file({ rating: 4 }), { 'X-Share-Token': body.token! });
    expect(update.status).toBe(200);
    expect(shareUpdateRate.perWindow).toBeGreaterThan(shareCreateRate.perWindow);
  });

  test('eine falsche Installations-ID ist 400', async () => {
    const res = await shareFile(file(), { 'X-Ganz-Installation': 'x' });
    expect(res.status).toBe(400);
  });
});

describe('Rate-Limit: prüfen ohne zu zählen', () => {
  const config = { perWindow: 2, windowMs: 60_000, perDay: 100, dailyTotal: 100 };

  test('check zählt nicht, record zählt, take prüft und zählt', () => {
    let t = Date.parse('2026-11-06T09:00:00Z');
    const limiter = createRateLimiter(() => t);
    for (let i = 0; i < 5; i++) expect(limiter.check(['a'], config).ok).toBe(true);
    limiter.record(['a'], config);
    limiter.record(['a'], config);
    expect(limiter.check(['a'], config)).toMatchObject({ ok: false, reason: 'zu_viele' });
    expect(limiter.take(['a'], config).ok).toBe(false);
    // Ein anderer Schlüssel ist frei, nach dem Fenster auch der erste wieder
    expect(limiter.check(['b'], config).ok).toBe(true);
    t += 60_001;
    expect(limiter.take(['a'], config).ok).toBe(true);
  });
});

/** Setzt Umgebungsvariablen für die Dauer von run und stellt sie danach wieder her */
async function withEnv<T>(vars: Record<string, string | undefined>, run: () => Promise<T>) {
  const env = process.env as Record<string, string | undefined>;
  const before = Object.fromEntries(Object.keys(vars).map((k) => [k, env[k]]));
  Object.assign(env, vars);
  for (const [k, v] of Object.entries(vars)) if (v === undefined) delete env[k];
  try {
    return await run();
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete env[k];
      else env[k] = v;
    }
  }
}

const signIn = (email: unknown, password: unknown) =>
  login(req('/api/v1/portal/anmelden', { method: 'POST', json: { email, password } }));

describe('Anmeldung: Passwort nur ausdrücklich', () => {
  test('Demo-Passwort aus der Konfiguration, nur in der Entwicklung oder mit PORTAL_DEMO_LOGIN=1', () => {
    expect(portalLogin.demoPassword).toBe('demo');
    expect(demoPassword({ NODE_ENV: 'development' })).toBe('demo');
    expect(demoPassword({ NODE_ENV: 'test' })).toBe('demo');
    expect(demoPassword({})).toBe('demo');
    expect(demoPassword({ NODE_ENV: 'production' })).toBeNull();
    expect(demoPassword({ NODE_ENV: 'production', PORTAL_DEMO_LOGIN: '1' })).toBe('demo');
    expect(demoPassword({ NODE_ENV: 'production', PORTAL_DEMO_LOGIN: 'true' })).toBeNull();
    expect(demoPassword({ NODE_ENV: 'production', PORTAL_DEMO_PASSWORD: 'lang-und-geheim' })).toBe(
      'lang-und-geheim',
    );
    // Leer zählt nicht als gesetzt
    expect(demoPassword({ NODE_ENV: 'production', PORTAL_DEMO_PASSWORD: '' })).toBeNull();
  });

  test('in Produktion ohne Angabe: keine Anmeldung, auch nicht mit „demo“', async () => {
    const off = {
      NODE_ENV: 'production',
      PORTAL_DEMO_LOGIN: undefined,
      PORTAL_DEMO_PASSWORD: undefined,
    };
    const res = await withEnv(off, () => signIn(portalLogin.email, 'demo'));
    expect(res.status).toBe(401);
    const empty = await withEnv(off, () => signIn(portalLogin.email, ''));
    expect(empty.status).toBe(401);
    // Mit Passwort aus der Umgebung: nur dieses
    const own = { ...off, PORTAL_DEMO_PASSWORD: 'lang-und-geheim' };
    expect((await withEnv(own, () => signIn(portalLogin.email, 'demo'))).status).toBe(401);
    expect((await withEnv(own, () => signIn(portalLogin.email, 'lang-und-geheim'))).status).toBe(
      200,
    );
    // In der Entwicklung (Demo) wie bisher
    const dev = { NODE_ENV: 'development', PORTAL_DEMO_PASSWORD: undefined };
    expect((await withEnv(dev, () => signIn(portalLogin.email, 'demo'))).status).toBe(200);
  });
});
