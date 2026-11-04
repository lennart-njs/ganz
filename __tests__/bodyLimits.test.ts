/**
 * @jest-environment node
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ReadableStream } from 'node:stream/web';

import { GET as guides } from '@/app/api/guides+api';
import { POST as share } from '@/app/api/v1/faelle+api';
import { POST as login } from '@/app/api/v1/portal/anmelden+api';
import { PUT as putSettings } from '@/app/api/v1/portal/einstellungen+api';
import { POST as act } from '@/app/api/v1/portal/faelle/[id]/aktionen+api';
import { POST as work } from '@/app/api/v1/portal/faelle/[id]/bearbeitung+api';
import { POST as bulk } from '@/app/api/v1/portal/sammelaktion+api';
import { portalLogin } from '@/config/portal.demo';
import { demoConfig } from '@/config/demo.config';
import { setCaseStore } from '@/server/backend';
import { FileCaseStore } from '@/server/backend/fileStore';
import { loadApprovedCatalog } from '@/server/guides/catalogStore';
import { bodyLimits, readJson } from '@/server/http/readJson';
import type { GuideService } from '@/services/guideService';

const { httpGuideService } = jest.requireActual<{ httpGuideService: GuideService }>(
  '@/services/guideService',
);

const req = (headers: Record<string, string>, body: string) =>
  new Request('http://localhost/api/v1/faelle', { method: 'POST', headers, body });

/**
 * Ein Body ohne Content-Length, wie bei chunked: `count` gleiche Stücke, erst auf Nachfrage.
 * `seen` zählt, wie viele Stücke gelesen wurden und ob der Stream abgebrochen wurde. Der Stream
 * kommt aus node:stream/web wie am Server (Readable.toWeb). Den aus der Testumgebung würde
 * Request in einen eigenen Stream packen, und Abbruch und Zählung gälten dann nicht für ihn.
 */
function chunked(count: number, headers: Record<string, string> = {}, size = 64 * 1024) {
  const chunk = new TextEncoder().encode(' '.repeat(size));
  const seen = { pulled: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (seen.pulled >= count) return controller.close();
        seen.pulled += 1;
        controller.enqueue(chunk);
      },
      cancel() {
        seen.cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const init = { method: 'POST', headers, body, duplex: 'half' } as unknown as RequestInit;
  return { request: (url = 'http://localhost/api') => new Request(url, init), seen, size };
}

/** So viele Stücke liest die Route höchstens, bevor sie bei `limit` abbricht */
const chunksUpTo = (limit: number, size: number) => Math.floor(limit / size) + 1;

let dir: string;
let dbFile: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganz-limits-'));
  dbFile = path.join(dir, 'db.json');
  setCaseStore(new FileCaseStore(dbFile));
});
afterEach(() => setCaseStore(undefined));

describe('readJson', () => {
  test('kein JSON 400, zu lang 413, sonst der Body', async () => {
    expect(await readJson(req({}, 'kein json'), 100)).toEqual({
      ok: false,
      status: 400,
      error: 'ungueltig',
    });
    expect(await readJson(req({}, JSON.stringify({ a: 'x'.repeat(200) })), 100)).toEqual({
      ok: false,
      status: 413,
      error: 'zu_gross',
    });
    expect(await readJson(req({}, '{"a":1}'), 100)).toEqual({ ok: true, body: { a: 1 } });
    expect(await readJson(req({}, ''), 100)).toMatchObject({ ok: false, status: 400 });
  });

  test('die Grenze zählt Bytes, nicht Zeichen', async () => {
    const text = JSON.stringify({ a: 'ä'.repeat(60) });
    expect(text.length).toBeLessThan(100);
    expect(await readJson(req({}, text), 100)).toMatchObject({ ok: false, status: 413 });
    expect(await readJson(req({}, text), 200)).toEqual({
      ok: true,
      body: { a: 'ä'.repeat(60) },
    });
  });

  test('nennt Content-Length mehr als die Grenze, wird nichts gelesen', async () => {
    const big = chunked(4, { 'Content-Length': String(10 * 64 * 1024) });
    expect(await readJson(big.request(), 64 * 1024)).toMatchObject({ status: 413 });
    expect(big.seen.pulled).toBe(0);
  });

  test('ohne Content-Length bricht das Lesen an der Grenze ab', async () => {
    const big = chunked(200);
    const limit = 3 * big.size + 10;
    expect(await readJson(big.request(), limit)).toEqual({
      ok: false,
      status: 413,
      error: 'zu_gross',
    });
    expect(big.seen.pulled).toBe(chunksUpTo(limit, big.size));
    expect(big.seen.cancelled).toBe(true);
  });

  test('ohne Content-Length unter der Grenze: ganz gelesen', async () => {
    const small = chunked(3, {}, 10);
    // Nur Leerzeichen: gelesen, aber kein JSON
    expect(await readJson(small.request(), 100)).toMatchObject({ status: 400 });
    expect(small.seen).toEqual({ pulled: 3, cancelled: false });
  });
});

describe('Fallakte an den Händler: POST /api/v1/faelle', () => {
  test('zu große Fallakte: 413, ohne zu lesen', async () => {
    const res = await share(req({ 'Content-Length': String(bodyLimits.share + 1) }, '{}'));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'zu_gross' });
    expect(fs.existsSync(dbFile)).toBe(false);
  });

  test('ohne Content-Length: 413 an der Grenze, der Rest bleibt ungelesen', async () => {
    const big = chunked(Math.ceil(bodyLimits.share / (64 * 1024)) + 40);
    const res = await share(big.request('http://localhost/api/v1/faelle'));
    expect(res.status).toBe(413);
    expect(big.seen.pulled).toBe(chunksUpTo(bodyLimits.share, big.size));
    expect(big.seen.cancelled).toBe(true);
    expect(fs.existsSync(dbFile)).toBe(false);
  });

  test('kein JSON bleibt 400', async () => {
    expect((await share(req({}, 'kein json'))).status).toBe(400);
  });
});

describe('Portal: Grenze für jede Route mit Body', () => {
  const portalReq = (url: string, method: string, headers: Record<string, string>, body = '{}') =>
    new Request(`http://localhost${url}`, { method, headers, body });

  async function bearer() {
    const res = await login(
      portalReq(
        '/api/v1/portal/anmelden',
        'POST',
        { 'Content-Type': 'application/json' },
        JSON.stringify({ email: portalLogin.email, password: 'demo' }),
      ),
    );
    expect(res.status).toBe(200);
    return `Bearer ${((await res.json()) as { token: string }).token}`;
  }

  const tooLong = { 'Content-Length': String(bodyLimits.portal + 1) };

  test('Anmeldung: zu groß 413, kein JSON weiter 401', async () => {
    const big = await login(portalReq('/api/v1/portal/anmelden', 'POST', tooLong));
    expect(big.status).toBe(413);
    const bad = await login(portalReq('/api/v1/portal/anmelden', 'POST', {}, 'kein json'));
    expect(bad.status).toBe(401);
  });

  test('ein Body null bringt keine Route zum Absturz', async () => {
    expect((await login(portalReq('/api/v1/portal/anmelden', 'POST', {}, 'null'))).status).toBe(
      401,
    );
    const auth = { Authorization: await bearer() };
    const res = await putSettings(portalReq('/api/v1/portal/einstellungen', 'PUT', auth, 'null'));
    expect(res.status).toBe(400);
  });

  test('Einstellungen, Aktion, Bearbeitung, Sammelaktion: 413 mit Anmeldung', async () => {
    const auth = { Authorization: await bearer(), ...tooLong };
    const id = { id: 'GS-30001' };
    const results = [
      await putSettings(portalReq('/api/v1/portal/einstellungen', 'PUT', auth)),
      await act(portalReq('/api/v1/portal/faelle/GS-30001/aktionen', 'POST', auth), id),
      await work(portalReq('/api/v1/portal/faelle/GS-30001/bearbeitung', 'POST', auth), id),
      await bulk(portalReq('/api/v1/portal/sammelaktion', 'POST', auth)),
    ];
    expect(results.map((r) => r.status)).toEqual([413, 413, 413, 413]);
  });

  test('ohne Content-Length bricht die Aktion an der Grenze ab', async () => {
    const big = chunked(40, { Authorization: await bearer() });
    const res = await act(big.request('http://localhost/api/v1/portal/faelle/GS-1/aktionen'), {
      id: 'GS-1',
    });
    expect(res.status).toBe(413);
    expect(big.seen.pulled).toBe(chunksUpTo(bodyLimits.portal, big.size));
    expect(big.seen.cancelled).toBe(true);
  });

  test('ohne Anmeldung liest keine Route den Body', async () => {
    const big = chunked(40);
    const res = await act(big.request('http://localhost/api/v1/portal/faelle/GS-1/aktionen'), {
      id: 'GS-1',
    });
    expect(res.status).toBe(401);
    expect(big.seen.pulled).toBe(0);
  });
});

describe('Katalog: GET /api/guides', () => {
  const url = (q: string) => new Request(`http://localhost/api/guides?${q}`);

  test('Hersteller und Materialnummer haben eine Form', () => {
    expect(
      guides(url(`hersteller=${'m'.repeat(41)}&kategorie=waschmaschine&modell=WKB%20130`)).status,
    ).toBe(400);
    expect(
      guides(url('hersteller=miele&kategorie=waschmaschine&modell=WKB%20130&material=%3Cscript%3E'))
        .status,
    ).toBe(400);
    expect(
      guides(url(`hersteller=miele&kategorie=waschmaschine&modell=x&material=${'1'.repeat(41)}`))
        .status,
    ).toBe(400);
    expect(
      guides(url('hersteller=miele&kategorie=waschmaschine&modell=x&material=11%20450%20120'))
        .status,
    ).toBe(200);
  });

  test('die App fragt eine Materialnummer in anderer Form nicht an, nur das Modell', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false });
    const original = global.fetch;
    global.fetch = fetchMock;
    try {
      const device = {
        manufacturerId: demoConfig.manufacturer.id,
        category: 'waschmaschine' as const,
        model: demoConfig.device.model,
      };
      await httpGuideService.forDevice({ ...device, materialNumber: '11 450 120 (alt)' });
      await httpGuideService.forDevice({
        ...device,
        materialNumber: demoConfig.device.typePlate.materialNumber,
      });
      const [odd, plain] = fetchMock.mock.calls.map(
        ([u]) => new URL(String(u), 'http://localhost').searchParams,
      );
      expect(odd!.has('material')).toBe(false);
      expect(odd!.get('modell')).toBe(demoConfig.device.model);
      expect(plain!.get('material')).toBe(demoConfig.device.typePlate.materialNumber);
    } finally {
      global.fetch = original;
    }
  });

  test('eine unlesbare Datei im Katalog: das Log nennt die Fehlerart, nicht den Inhalt', () => {
    const catalog = fs.mkdtempSync(path.join(os.tmpdir(), 'katalog-'));
    fs.writeFileSync(path.join(catalog, 'kaputt.json'), 'Hausnummer 12 geheim');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(loadApprovedCatalog(catalog, true)).toEqual([]);
      const logged = warn.mock.calls.flat().join(' ');
      expect(logged).toContain('kaputt.json');
      expect(logged).toContain('SyntaxError');
      expect(logged).not.toContain('Hausnummer');
    } finally {
      warn.mockRestore();
    }
  });
});
