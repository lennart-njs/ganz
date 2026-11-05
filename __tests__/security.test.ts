/**
 * @jest-environment node
 */
// Härtung von Demo-Backend und Portal: Fälle aus der App, Anmeldung, Abmelden, Einstellungen,
// Cookie und Header des Portals.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { POST as share } from '@/app/api/v1/faelle+api';
import { POST as signOut } from '@/app/api/v1/portal/abmelden+api';
import { POST as login } from '@/app/api/v1/portal/anmelden+api';
import { GET as stats } from '@/app/api/v1/portal/auswertung+api';
import { GET as getSettings, PUT as putSettings } from '@/app/api/v1/portal/einstellungen+api';
import { GET as list } from '@/app/api/v1/portal/faelle+api';
import { GET as detail } from '@/app/api/v1/portal/faelle/[id]+api';
import { POST as act } from '@/app/api/v1/portal/faelle/[id]/aktionen+api';
import { POST as work } from '@/app/api/v1/portal/faelle/[id]/bearbeitung+api';
import { POST as bulk } from '@/app/api/v1/portal/sammelaktion+api';
import { portalLogin } from '@/config/portal.demo';
import { de } from '@/i18n/de';
import { createRateLimiter } from '@/lib/chat/guard';
import type { SharedCaseFile } from '@/model/sharing';
import { getCaseStore, setCaseStore } from '@/server/backend';
import { demoPassword } from '@/server/backend/auth';
import { FileCaseStore } from '@/server/backend/fileStore';
import { seedRecords } from '@/server/backend/seed';
import {
  loginFailures,
  loginRate,
  shareCreateRate,
  shareRateLimits,
  shareUpdateRate,
} from '@/server/http/rateLimits';

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
const dataDirBefore = process.env.GANZ_DATA_DIR;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganz-security-'));
  setCaseStore(new FileCaseStore(path.join(dir, 'db.json')));
  // Sperrliste der Sitzungen je Test frisch. Das Geheimnis hat auth.ts schon beim Laden gelesen.
  process.env.GANZ_DATA_DIR = dir;
  shareRateLimits.create.reset();
  shareRateLimits.update.reset();
  loginFailures.reset();
});
afterEach(() => {
  setCaseStore(undefined);
  if (dataDirBefore === undefined) delete process.env.GANZ_DATA_DIR;
  else process.env.GANZ_DATA_DIR = dataDirBefore;
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

async function bearer() {
  const res = await signIn(portalLogin.email, 'demo');
  expect(res.status).toBe(200);
  return { Authorization: `Bearer ${((await res.json()) as { token: string }).token}` };
}

/** Jede Route unter /api/v1/portal/ mit diesen Headern: ihre Statuscodes */
async function everyPortalRoute(headers: Record<string, string>) {
  const id = seedRecords()[0]!.file.caseId;
  const put = { method: 'PUT', headers, json: { section: 'notifications', value: {} } };
  const post = (json: unknown) => ({ method: 'POST', headers, json });
  return [
    (await list(req('/api/v1/portal/faelle', { headers }))).status,
    (await detail(req(`/api/v1/portal/faelle/${id}`, { headers }), { id })).status,
    (await act(req(`/api/v1/portal/faelle/${id}/aktionen`, post({ type: 'annehmen' })), { id }))
      .status,
    (
      await work(
        req(`/api/v1/portal/faelle/${id}/bearbeitung`, post({ type: 'notiz', text: 'x' })),
        {
          id,
        },
      )
    ).status,
    (
      await bulk(
        req('/api/v1/portal/sammelaktion', post({ ids: [id], action: { type: 'annehmen' } })),
      )
    ).status,
    (await getSettings(req('/api/v1/portal/einstellungen', { headers }))).status,
    (await putSettings(req('/api/v1/portal/einstellungen', put))).status,
    (await stats(req('/api/v1/portal/auswertung', { headers }))).status,
    (await signOut(req('/api/v1/portal/abmelden', { method: 'POST', headers }))).status,
  ];
}

describe('Abmelden sperrt das Token', () => {
  test('nach dem Abmelden lehnt jede Route unter /api/v1/portal/ das Token ab', async () => {
    // Gegenprobe: Mit einem gültigen Token kommt keine Route mit 401 zurück
    expect(await everyPortalRoute(await bearer())).not.toContain(401);
    const auth = await bearer();
    expect((await list(req('/api/v1/portal/faelle', { headers: auth }))).status).toBe(200);
    const out = await signOut(req('/api/v1/portal/abmelden', { method: 'POST', headers: auth }));
    expect(out.status).toBe(200);
    expect(await everyPortalRoute(auth)).toEqual(Array(9).fill(401));
  });

  test('nur dieses Token: eine andere Anmeldung bleibt gültig', async () => {
    const first = await bearer();
    const second = await bearer();
    await signOut(req('/api/v1/portal/abmelden', { method: 'POST', headers: first }));
    expect((await list(req('/api/v1/portal/faelle', { headers: first }))).status).toBe(401);
    expect((await list(req('/api/v1/portal/faelle', { headers: second }))).status).toBe(200);
  });

  test('ohne gültiges Token: 401, die Sperrliste bleibt, wie sie ist', async () => {
    const res = await signOut(req('/api/v1/portal/abmelden', { method: 'POST' }));
    expect(res.status).toBe(401);
    const bad = await signOut(
      req('/api/v1/portal/abmelden', { method: 'POST', headers: { Authorization: 'Bearer x.y' } }),
    );
    expect(bad.status).toBe(401);
    expect(fs.existsSync(path.join(dir, 'portal-revoked.json'))).toBe(false);
  });

  test('die Sperrliste vergisst abgelaufene Tokens', async () => {
    const file = path.join(dir, 'portal-revoked.json');
    fs.writeFileSync(file, JSON.stringify({ alt: Date.now() - 1000, offen: Date.now() + 60_000 }));
    await signOut(req('/api/v1/portal/abmelden', { method: 'POST', headers: await bearer() }));
    const listed = Object.keys(JSON.parse(fs.readFileSync(file, 'utf8')) as object);
    expect(listed).toHaveLength(2);
    expect(listed).toContain('offen');
    expect(listed).not.toContain('alt');
  });

  test('Tokens ohne Kennung (von vor der Sperrliste) gelten nicht mehr', async () => {
    const secret = 'nur-fuer-diesen-test';
    let auth: typeof import('@/server/backend/auth') | undefined;
    await withEnv({ PORTAL_SESSION_SECRET: secret }, async () => {
      jest.isolateModules(() => {
        // Neu laden, damit auth.ts dieses Geheimnis liest
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        auth = require('@/server/backend/auth');
      });
    });
    const token = (claims: object) => {
      const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
      const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
      return new Request('http://localhost/api/v1/portal/faelle', {
        headers: { Authorization: `Bearer ${body}.${sig}` },
      });
    };
    const claims = { ...fruend, exp: Date.now() + 60_000 };
    expect(auth!.tenantFrom(token(claims))).toBeNull();
    expect(auth!.tenantFrom(token({ ...claims, jti: 'k1' }))).toMatchObject({ id: 'fruend' });
    expect(auth!.tenantFrom(token({ ...claims, jti: 'k1', exp: Date.now() - 1 }))).toBeNull();
  });
});

describe('Anmeldung: Rate-Limit für Fehlversuche', () => {
  const via = (ip: string, email: unknown, password: unknown) =>
    login(
      req('/api/v1/portal/anmelden', {
        method: 'POST',
        headers: { 'X-Forwarded-For': ip },
        json: { email, password },
      }),
    );

  test('nach 10 Fehlversuchen 429 mit Retry-After, auch mit dem richtigen Passwort', async () => {
    for (let i = 0; i < loginRate.perWindow; i++) {
      expect((await signIn(portalLogin.email, `falsch-${i}`)).status).toBe(401);
    }
    const blocked = await signIn(portalLogin.email, 'demo');
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toEqual({ error: 'zu_viele' });
    const retry = Number(blocked.headers.get('retry-after'));
    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThanOrEqual(loginRate.windowMs / 1000);
  });

  test('nach dem Fenster geht es wieder', async () => {
    const start = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(start);
    try {
      for (let i = 0; i < loginRate.perWindow; i++) await signIn(portalLogin.email, 'falsch');
      expect((await signIn(portalLogin.email, 'demo')).status).toBe(429);
      clock.mockReturnValue(start + loginRate.windowMs + 1000);
      expect((await signIn(portalLogin.email, 'demo')).status).toBe(200);
    } finally {
      clock.mockRestore();
    }
  });

  test('erfolgreiche Anmeldungen zählen nicht', async () => {
    for (let i = 0; i < loginRate.perWindow * 2; i++) {
      expect((await signIn(portalLogin.email, 'demo')).status).toBe(200);
    }
  });

  test('je IP-Adresse und je E-Mail, wenn ein vertrauter Proxy die Adresse nennt', async () => {
    await withEnv({ CHAT_TRUSTED_PROXY_HOPS: '1' }, async () => {
      // Eine Adresse probiert viele E-Mails: Diese Adresse ist gesperrt, eine andere nicht
      for (let i = 0; i < loginRate.perWindow; i++) {
        expect((await via('10.0.0.1', `x${i}@example.org`, 'falsch')).status).toBe(401);
      }
      expect((await via('10.0.0.1', portalLogin.email, 'demo')).status).toBe(429);
      expect((await via('10.0.0.2', portalLogin.email, 'demo')).status).toBe(200);
      // Viele Adressen probieren eine E-Mail: Diese E-Mail ist gesperrt, egal von wo
      for (let i = 0; i < loginRate.perWindow; i++) {
        const email = ` ${portalLogin.email.toUpperCase()} `;
        expect((await via(`10.0.1.${i}`, email, 'x')).status).toBe(401);
      }
      expect((await via('10.0.0.3', portalLogin.email, 'demo')).status).toBe(429);
      expect((await via('10.0.0.3', 'jemand@example.org', 'falsch')).status).toBe(401);
    });
  });

  test('der Text für das Portal: ruhig, Sie-Form, ohne Ausrufezeichen', () => {
    expect(de.portal.login.tooMany).toMatch(/\bSie\b/);
    expect(de.portal.login.tooMany).not.toMatch(/!/);
  });
});
