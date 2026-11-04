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
import { GET as stats } from '@/app/api/v1/portal/auswertung+api';
import { GET as getSettings, PUT as putSettings } from '@/app/api/v1/portal/einstellungen+api';
import { GET as list } from '@/app/api/v1/portal/faelle+api';
import { GET as detail } from '@/app/api/v1/portal/faelle/[id]+api';
import { POST as act } from '@/app/api/v1/portal/faelle/[id]/aktionen+api';
import { POST as work } from '@/app/api/v1/portal/faelle/[id]/bearbeitung+api';
import { POST as bulk } from '@/app/api/v1/portal/sammelaktion+api';
import { fruendSettings, portalLogin, portalSeed } from '@/config/portal.demo';
import type { DealerSettings } from '@/model/portal';
import type { SharedCaseFile, SharedCaseRecord } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';
import { setCaseStore } from '@/server/backend';
import { FileCaseStore } from '@/server/backend/fileStore';
import { seedAnonymous, seedRecords } from '@/server/backend/seed';

const req = (url: string, init: RequestInit & { json?: unknown } = {}) =>
  new Request(`http://localhost${url}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });

const file = (over: Partial<SharedCaseFile> = {}): SharedCaseFile => {
  const base = seedRecords()[0]!.file;
  return {
    ...base,
    caseId: 'GS-30001',
    isExample: false,
    customer: {
      name: 'Sam Beispiel',
      address: { street: 'Beispielstraße 12', zip: '32549', city: 'Bad Oeynhausen' },
    },
    device: {
      ...base.device,
      manufacturer: 'Miele',
      model: 'WKB 130',
      category: 'waschmaschine',
      categoryLabel: 'Waschmaschine',
    },
    photos: [],
    answers: [],
    messages: [],
    ...over,
  };
};

async function portalToken() {
  const res = await login(
    req('/api/v1/portal/anmelden', {
      method: 'POST',
      json: { email: portalLogin.email, password: 'demo' },
    }),
  );
  return ((await res.json()) as { token: string }).token;
}
const authed = async () => ({ Authorization: `Bearer ${await portalToken()}` });

async function shareFile(f: SharedCaseFile, token?: string) {
  const res = await share(
    req('/api/v1/faelle', {
      method: 'POST',
      json: { file: f },
      headers: token ? { 'X-Share-Token': token } : {},
    }),
  );
  return { status: res.status, body: (await res.json()) as { token: string; events: CaseEvent[] } };
}

async function record(id: string): Promise<SharedCaseRecord> {
  const res = await detail(req(`/api/v1/portal/faelle/${id}`, { headers: await authed() }), { id });
  return ((await res.json()) as { record: SharedCaseRecord }).record;
}

async function saveSection(section: string, value: unknown) {
  return putSettings(
    req('/api/v1/portal/einstellungen', {
      method: 'PUT',
      headers: await authed(),
      json: { section, value },
    }),
  );
}

let dir: string;
let dbFile: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ganz-backend-'));
  dbFile = path.join(dir, 'db.json');
  setCaseStore(new FileCaseStore(dbFile));
});
afterEach(() => setCaseStore(undefined));

describe('Demo-Backend: Fall an den Händler (Entscheidung 28)', () => {
  test('ganzer Weg: teilen, Begrüßung sofort, im Portal sehen, Rückfrage, abrufen, widerrufen', async () => {
    const shared = await shareFile(file());
    expect(shared.status).toBe(200);
    const { token } = shared.body;
    expect(token.length).toBeGreaterThan(20);
    // Regeln von Fründ: Begrüßung mit Kontakt und Frage nach dem Kaufbeleg, sofort in der Antwort
    expect(shared.body.events.map((e) => e.type)).toEqual(
      expect.arrayContaining(['haendler_nachricht', 'haendler_rueckfrage']),
    );
    const greeting = shared.body.events.find((e) => e.type === 'haendler_nachricht')!;
    expect(greeting.payload.text).toContain('Hallo Sam');
    expect(greeting.payload.text).toContain('GS-30001');
    expect(greeting.payload.contact).toEqual(
      expect.objectContaining({ phone: fruendSettings.profile.phone }),
    );

    const auth = await authed();
    const cases = (await (await list(req('/api/v1/portal/faelle', { headers: auth }))).json()) as {
      cases: SharedCaseRecord[];
    };
    expect(cases.cases.map((c) => c.file.caseId)).toContain('GS-30001');
    expect(cases.cases).toHaveLength(portalSeed.cases + 1);

    const one = await record('GS-30001');
    expect(one.file.customer.name).toBe('Sam Beispiel');
    // Automatisch zugewiesen (Waschmaschine → Lea W.) und im Zugriffsprotokoll Sandra K.
    expect(one.workflow).toEqual(expect.objectContaining({ status: 'neu', assigneeId: 'lw' }));
    expect(one.access?.at(-1)?.by).toBe('Sandra K.');

    const asked = await act(
      req('/api/v1/portal/faelle/GS-30001/aktionen', {
        method: 'POST',
        headers: auth,
        json: {
          type: 'rueckfrage',
          question: 'Ist das Gerät freistehend?',
          options: ['Ja', 'Nein'],
        },
      }),
      { id: 'GS-30001' },
    );
    expect(asked.status).toBe(200);
    expect((await record('GS-30001')).workflow?.status).toBe('wartet_kunde');

    const fromApp = await events(
      req('/api/v1/faelle/GS-30001/ereignisse', { headers: { 'X-Share-Token': token } }),
      { id: 'GS-30001' },
    );
    const got = (await fromApp.json()) as { events: CaseEvent[] };
    expect(got.events.at(-1)).toEqual(
      expect.objectContaining({
        type: 'haendler_rueckfrage',
        actor: expect.objectContaining({ kind: 'haendler' }),
        payload: expect.objectContaining({ by: 'Sandra K.' }),
      }),
    );

    // Antwort aus der App: Der Fall wartet wieder auf den Händler
    const q = got.events.at(-1)!;
    const answered = await shareFile(
      file({ answers: [{ questionEventId: q.id, answer: 'Ja', at: new Date().toISOString() }] }),
      token,
    );
    expect(answered.status).toBe(200);
    const after = await record('GS-30001');
    expect(after.workflow?.status).toBe('wartet_uns');
    expect(after.workflow?.lastCustomerAt).toBeDefined();

    const gone = await revoke(
      req('/api/v1/faelle/GS-30001', { method: 'DELETE', headers: { 'X-Share-Token': token } }),
      { id: 'GS-30001' },
    );
    expect(gone.status).toBe(200);
    const revoked = await record('GS-30001');
    expect(revoked.revokedAt).toBeDefined();
    expect(revoked.file.customer.name).toBe('');
    expect(revoked.file.photos).toEqual([]);
    expect(revoked.file.messages).toEqual([]);
  });

  test('freier Chat: Nachricht vom Händler, Nachricht aus der App setzt den Stand', async () => {
    const { body } = await shareFile(file());
    const auth = await authed();
    const sent = await act(
      req('/api/v1/portal/faelle/GS-30001/aktionen', {
        method: 'POST',
        headers: auth,
        json: { type: 'nachricht', text: 'Wir schauen uns das an.' },
      }),
      { id: 'GS-30001' },
    );
    const { event } = (await sent.json()) as { event: CaseEvent };
    expect(event.type).toBe('haendler_nachricht');
    expect(event.payload).toEqual({ text: 'Wir schauen uns das an.', by: 'Sandra K.' });
    expect((await record('GS-30001')).workflow?.status).toBe('wartet_kunde');

    await shareFile(
      file({ messages: [{ id: 'm1', at: new Date().toISOString(), text: 'Danke' }] }),
      body.token,
    );
    expect((await record('GS-30001')).workflow?.status).toBe('wartet_uns');
  });

  test('Terminvorschlag: Zeitfenster aus der App wird zum Termin', async () => {
    const { body } = await shareFile(file());
    const auth = await authed();
    const res = await act(
      req('/api/v1/portal/faelle/GS-30001/aktionen', {
        method: 'POST',
        headers: auth,
        json: {
          type: 'termin',
          partnerName: 'Fründ Kundendienst',
          slots: ['Mo, 8–12 Uhr', 'Di, 12–16 Uhr'],
        },
      }),
      { id: 'GS-30001' },
    );
    const { event } = (await res.json()) as { event: CaseEvent };
    expect(event.type).toBe('haendler_termin');
    const answered = await shareFile(
      file({
        answers: [
          { questionEventId: event.id, answer: 'Di, 12–16 Uhr', at: new Date().toISOString() },
        ],
      }),
      body.token,
    );
    expect(answered.body.events).toEqual([
      expect.objectContaining({
        type: 'haendler_betrieb',
        payload: expect.objectContaining({
          slot: 'Di, 12–16 Uhr',
          partnerName: 'Fründ Kundendienst',
        }),
      }),
    ]);
    expect((await record('GS-30001')).workflow?.status).toBe('termin');
  });

  test('Notiz, Zuweisung und Stand bleiben im Portal', async () => {
    const { body } = await shareFile(file());
    const auth = await authed();
    for (const json of [
      { type: 'notiz', text: 'Kaufbeleg in SAP gefunden.' },
      { type: 'zuweisen', assigneeId: 'mt' },
      { type: 'stand', status: 'termin' },
    ]) {
      const res = await work(
        req('/api/v1/portal/faelle/GS-30001/bearbeitung', { method: 'POST', headers: auth, json }),
        { id: 'GS-30001' },
      );
      expect(res.status).toBe(200);
    }
    const r = await record('GS-30001');
    expect(r.notes?.map((n) => n.text)).toEqual(['Kaufbeleg in SAP gefunden.']);
    expect(r.workflow).toEqual(expect.objectContaining({ assigneeId: 'mt', status: 'termin' }));
    const fromApp = (await (
      await events(
        req('/api/v1/faelle/GS-30001/ereignisse', { headers: { 'X-Share-Token': body.token } }),
        {
          id: 'GS-30001',
        },
      )
    ).json()) as { events: CaseEvent[] };
    expect(JSON.stringify(fromApp.events)).not.toContain('SAP');
  });

  test('Sammelaktion: alle neuen Fälle annehmen', async () => {
    const auth = await authed();
    const all = (await (await list(req('/api/v1/portal/faelle', { headers: auth }))).json()) as {
      cases: SharedCaseRecord[];
    };
    const fresh = all.cases.filter((c) => c.workflow?.status === 'neu').map((c) => c.file.caseId);
    expect(fresh.length).toBeGreaterThan(1);
    const res = await bulk(
      req('/api/v1/portal/sammelaktion', {
        method: 'POST',
        headers: auth,
        json: { ids: fresh, action: { type: 'annehmen' } },
      }),
    );
    expect(((await res.json()) as { count: number }).count).toBe(fresh.length);
    const r = await record(fresh[0]!);
    expect(r.workflow?.status).toBe('wartet_uns');
    expect(r.retailerEvents.at(-1)?.type).toBe('haendler_angenommen');
  });

  test('Sammelaktion „Stand“: nur ein Stand der Arbeitsliste', async () => {
    const auth = await authed();
    const all = (await (await list(req('/api/v1/portal/faelle', { headers: auth }))).json()) as {
      cases: SharedCaseRecord[];
    };
    const ids = all.cases.slice(0, 2).map((c) => c.file.caseId);
    const stand = (status: unknown) =>
      bulk(
        req('/api/v1/portal/sammelaktion', {
          method: 'POST',
          headers: auth,
          json: { ids, action: { type: 'stand', status } },
        }),
      );
    for (const status of ['eskaliert', 'offen', '', 3, null]) {
      expect([status, (await stand(status)).status]).toEqual([status, 400]);
    }
    const res = await stand('wartet_kunde');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { count: number }).count).toBe(ids.length);
    expect((await record(ids[0]!)).workflow?.status).toBe('wartet_kunde');
  });

  test('Einstellungen: lesen, abschnittsweise speichern, Regeln greifen beim nächsten Fall', async () => {
    const auth = await authed();
    const got = (await (
      await getSettings(req('/api/v1/portal/einstellungen', { headers: auth }))
    ).json()) as {
      settings: DealerSettings;
    };
    expect(got.settings.profile.name).toBe('Fründ Elektrogeräte AG');

    expect((await saveSection('rules', { ...got.settings.rules, autoAccept: 'ja' })).status).toBe(
      400,
    );
    expect((await saveSection('gibtsnicht', {})).status).toBe(400);
    expect((await saveSection('integrations', { whatsapp: 'kaputt' })).status).toBe(400);
    expect((await saveSection('rules', { ...got.settings.rules, autoAccept: true })).status).toBe(
      200,
    );
    expect(
      (
        await saveSection('profile', {
          ...got.settings.profile,
          hours: { days: [], from: '08:00', to: '18:00' },
        })
      ).status,
    ).toBe(200);
    expect(
      (await saveSection('integrations', { ...got.settings.integrations, whatsapp: 'verbunden' }))
        .status,
    ).toBe(200);

    const { body } = await shareFile(file());
    const types = body.events.map((e) => e.type);
    expect(types).toContain('haendler_angenommen');
    // Außerhalb der Servicezeit: Abwesenheitsnachricht
    expect(body.events.filter((e) => e.type === 'haendler_nachricht')).toHaveLength(2);
    expect((await record('GS-30001')).workflow?.status).toBe('wartet_uns');
    const again = (await (
      await getSettings(req('/api/v1/portal/einstellungen', { headers: auth }))
    ).json()) as {
      settings: DealerSettings;
    };
    expect(again.settings.integrations.whatsapp).toBe('verbunden');
  });

  test('Auswertung: nur anonyme Zahlen', async () => {
    const res = await stats(req('/api/v1/portal/auswertung', { headers: await authed() }));
    const { anonymous } = (await res.json()) as { anonymous: Record<string, unknown>[] };
    expect(anonymous).toHaveLength(portalSeed.anonymous);
    expect(Object.keys(anonymous[0]!).sort()).toEqual([
      'at',
      'category',
      'model',
      'outcome',
      'problem',
    ]);
  });

  test('ohne Token darf niemand den Fall ändern oder Antworten lesen', async () => {
    await shareFile(file());
    expect((await shareFile(file())).status).toBe(403);
    const read = await events(
      req('/api/v1/faelle/GS-30001/ereignisse', { headers: { 'X-Share-Token': 'falsch' } }),
      { id: 'GS-30001' },
    );
    expect(read.status).toBe(403);
  });

  test('Portal: ohne Anmeldung 401, falsches Passwort 401, fremde Fälle 404', async () => {
    expect((await list(req('/api/v1/portal/faelle'))).status).toBe(401);
    expect((await getSettings(req('/api/v1/portal/einstellungen'))).status).toBe(401);
    expect((await stats(req('/api/v1/portal/auswertung'))).status).toBe(401);
    const bad = await login(
      req('/api/v1/portal/anmelden', {
        method: 'POST',
        json: { email: portalLogin.email, password: 'falsch' },
      }),
    );
    expect(bad.status).toBe(401);
    const other = file({
      caseId: 'GS-30002',
      recipient: { id: 'technikhaus', kind: 'haendler', name: 'Technikhaus Online' },
    });
    await shareFile(other);
    const auth = await authed();
    const res = await detail(req('/api/v1/portal/faelle/GS-30002', { headers: auth }), {
      id: 'GS-30002',
    });
    expect(res.status).toBe(404);
    const w = await work(
      req('/api/v1/portal/faelle/GS-30002/bearbeitung', {
        method: 'POST',
        headers: auth,
        json: { type: 'notiz', text: 'x' },
      }),
      { id: 'GS-30002' },
    );
    expect(w.status).toBe(404);
  });

  test('ungültige Akten und Aktionen werden abgelehnt', async () => {
    expect((await shareFile(file({ caseId: '../x' }))).status).toBe(400);
    expect((await shareFile(file({ rating: 9 }))).status).toBe(400);
    const auth = await authed();
    const id = seedRecords()[0]!.file.caseId;
    const bad = await act(
      req(`/api/v1/portal/faelle/${id}/aktionen`, {
        method: 'POST',
        headers: auth,
        json: { type: 'entscheidung', decision: 'alles_gratis' },
      }),
      { id },
    );
    expect(bad.status).toBe(400);
    const badWork = await work(
      req(`/api/v1/portal/faelle/${id}/bearbeitung`, {
        method: 'POST',
        headers: auth,
        json: { type: 'stand', status: 'irgendwas' },
      }),
      { id },
    );
    expect(badWork.status).toBe(400);
  });
});

describe('Beispielfälle (Entscheidung 37)', () => {
  test('rund 40 Fälle in allen Ständen, eindeutige Nummern, gleich bei jedem Start', () => {
    const a = seedRecords(Date.parse('2026-11-06T09:00:00Z'));
    const b = seedRecords(Date.parse('2026-11-06T09:00:00Z'));
    expect(a).toHaveLength(portalSeed.cases);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(new Set(a.map((r) => r.file.caseId)).size).toBe(a.length);
    const states = new Set(a.map((r) => r.workflow?.status));
    expect([...states].sort()).toEqual(['erledigt', 'neu', 'termin', 'wartet_kunde', 'wartet_uns']);
    // Alles in der Vergangenheit (bis auf Ablaufdaten), keine Zeitpunkte nach jetzt
    const now = Date.parse('2026-11-06T09:00:00Z');
    const late: string[] = [];
    const walk = (x: unknown, key: string): void => {
      if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(x) && Date.parse(x) > now)
        late.push(key);
      else if (x && typeof x === 'object')
        for (const [k, v] of Object.entries(x)) if (k !== 'validUntil') walk(v, k);
    };
    a.forEach((r) => walk(r, ''));
    expect(late).toEqual([]);
    expect(a.some((r) => r.file.rating)).toBe(true);
    expect(seedAnonymous(now).fruend).toHaveLength(portalSeed.anonymous);
  });

  test('nach längerer Ruhe rücken die Beispielfälle an heute heran', async () => {
    const store = new FileCaseStore(dbFile);
    const tenant = {
      kind: 'haendler' as const,
      id: 'fruend',
      name: 'Fründ',
      userName: 'Sandra K.',
    };
    const newestShared = (list: SharedCaseRecord[]) =>
      Math.max(...list.map((r) => Date.parse(r.file.sharedAt)));
    const newest = newestShared(await store.listForTenant(tenant));
    // Datei um drei Tage altern lassen
    const raw = fs.readFileSync(dbFile, 'utf8');
    const old = raw.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, (x) =>
      new Date(Date.parse(x) - 3 * 86_400_000).toISOString(),
    );
    fs.writeFileSync(dbFile, old);
    const after = newestShared(await store.listForTenant(tenant));
    expect(Math.abs(after - newest)).toBeLessThan(5 * 60_000);
  });
});
