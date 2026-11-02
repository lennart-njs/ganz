/**
 * @jest-environment node
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { POST as share } from '@/app/api/v1/faelle+api';
import { DELETE as revoke } from '@/app/api/v1/faelle/[id]+api';
import { GET as events } from '@/app/api/v1/faelle/[id]/ereignisse+api';
import { POST as login } from '@/app/api/v1/portal/anmelden+api';
import { GET as list } from '@/app/api/v1/portal/faelle+api';
import { GET as detail } from '@/app/api/v1/portal/faelle/[id]+api';
import { POST as act } from '@/app/api/v1/portal/faelle/[id]/aktionen+api';
import { demoConfig } from '@/config/demo.config';
import type { SharedCaseFile } from '@/model/sharing';
import { setCaseStore } from '@/server/backend';
import { FileCaseStore } from '@/server/backend/fileStore';
import { seedRecords } from '@/server/backend/seed';

const req = (url: string, init: RequestInit & { json?: unknown } = {}) =>
  new Request(`http://localhost${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });

const file = (): SharedCaseFile => ({
  ...seedRecords()[1]!.file,
  caseId: 'GS-30001',
  isExample: false,
  customer: { name: 'Sam', address: { street: 'Beispielstraße 12', zip: '12043', city: 'Berlin' } },
});

async function portalToken() {
  const res = await login(
    req('/api/v1/portal/anmelden', {
      method: 'POST',
      json: { email: demoConfig.dealers[0]!.portalUser!, password: 'demo' },
    }),
  );
  return ((await res.json()) as { token: string }).token;
}

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganz-backend-'));
  setCaseStore(new FileCaseStore(path.join(dir, 'db.json')));
});
afterEach(() => setCaseStore(undefined));

describe('Demo-Backend: Fall an den Händler (Entscheidung 28)', () => {
  test('ganzer Weg: teilen, im Portal sehen, Rückfrage, in der App abrufen, widerrufen', async () => {
    const shared = await share(req('/api/v1/faelle', { method: 'POST', json: { file: file() } }));
    expect(shared.status).toBe(200);
    const { token } = (await shared.json()) as { token: string };
    expect(token.length).toBeGreaterThan(20);

    const auth = { Authorization: `Bearer ${await portalToken()}` };
    const cases = (await (await list(req('/api/v1/portal/faelle', { headers: auth }))).json()) as {
      cases: { file: SharedCaseFile }[];
    };
    // Zwei Beispielfälle und der neue Fall
    expect(cases.cases.map((c) => c.file.caseId)).toContain('GS-30001');
    expect(cases.cases).toHaveLength(3);

    const one = await detail(req('/api/v1/portal/faelle/GS-30001', { headers: auth }), {
      id: 'GS-30001',
    });
    expect(
      ((await one.json()) as { record: { file: SharedCaseFile } }).record.file.customer.name,
    ).toBe('Sam');

    const asked = await act(
      req('/api/v1/portal/faelle/GS-30001/aktionen', {
        method: 'POST',
        headers: auth,
        json: {
          type: 'rueckfrage',
          question: 'Hast du den Kaufbeleg noch?',
          options: ['Ja', 'Nein'],
        },
      }),
      { id: 'GS-30001' },
    );
    expect(asked.status).toBe(200);

    const fromApp = await events(
      req('/api/v1/faelle/GS-30001/ereignisse', { headers: { 'X-Share-Token': token } }),
      { id: 'GS-30001' },
    );
    const got = (await fromApp.json()) as { events: { type: string; actor: { kind: string } }[] };
    expect(got.events).toEqual([
      expect.objectContaining({
        type: 'haendler_rueckfrage',
        actor: expect.objectContaining({ kind: 'haendler' }),
      }),
    ]);

    const gone = await revoke(
      req('/api/v1/faelle/GS-30001', { method: 'DELETE', headers: { 'X-Share-Token': token } }),
      { id: 'GS-30001' },
    );
    expect(gone.status).toBe(200);
    const after = (await (
      await detail(req('/api/v1/portal/faelle/GS-30001', { headers: auth }), { id: 'GS-30001' })
    ).json()) as { record: { revokedAt?: string; file: SharedCaseFile } };
    expect(after.record.revokedAt).toBeDefined();
    expect(after.record.file.customer.name).toBe('');
    expect(after.record.file.photos).toEqual([]);
  });

  test('ohne Token darf niemand den Fall ändern oder Antworten lesen', async () => {
    await share(req('/api/v1/faelle', { method: 'POST', json: { file: file() } }));
    const again = await share(req('/api/v1/faelle', { method: 'POST', json: { file: file() } }));
    expect(again.status).toBe(403);
    const read = await events(
      req('/api/v1/faelle/GS-30001/ereignisse', { headers: { 'X-Share-Token': 'falsch' } }),
      { id: 'GS-30001' },
    );
    expect(read.status).toBe(403);
  });

  test('Portal: ohne Anmeldung 401, falsches Passwort 401, fremde Fälle 404', async () => {
    expect((await list(req('/api/v1/portal/faelle'))).status).toBe(401);
    const bad = await login(
      req('/api/v1/portal/anmelden', {
        method: 'POST',
        json: { email: demoConfig.dealers[0]!.portalUser!, password: 'falsch' },
      }),
    );
    expect(bad.status).toBe(401);
    const other = {
      ...file(),
      caseId: 'GS-30002',
      recipient: { id: 'technikhaus-nord', kind: 'haendler' as const, name: 'Technikhaus Nord' },
    };
    await share(req('/api/v1/faelle', { method: 'POST', json: { file: other } }));
    const auth = { Authorization: `Bearer ${await portalToken()}` };
    const res = await detail(req('/api/v1/portal/faelle/GS-30002', { headers: auth }), {
      id: 'GS-30002',
    });
    expect(res.status).toBe(404);
  });

  test('ungültige Akten und Aktionen werden abgelehnt', async () => {
    const res = await share(
      req('/api/v1/faelle', { method: 'POST', json: { file: { ...file(), caseId: '../x' } } }),
    );
    expect(res.status).toBe(400);
    const auth = { Authorization: `Bearer ${await portalToken()}` };
    const bad = await act(
      req('/api/v1/portal/faelle/GS-24790/aktionen', {
        method: 'POST',
        headers: auth,
        json: { type: 'entscheidung', decision: 'alles_gratis' },
      }),
      { id: 'GS-24790' },
    );
    expect(bad.status).toBe(400);
  });
});
