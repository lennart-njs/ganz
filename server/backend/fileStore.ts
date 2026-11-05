// Demo-Backend: speichert geteilte Fälle, Einstellungen und anonyme Zahlen in einer JSON-Datei
// (.data/ganz-backend.json). Ein echtes Backend implementiert dasselbe Interface (types.ts).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  fillTemplate,
  inServiceHours,
  type AnonymousOutcome,
  type DealerSettings,
  type Workflow,
  type WorkflowStatus,
} from '@/model/portal';
import type {
  RetailerAction,
  SharedCaseFile,
  SharedCaseRecord,
  WorkflowAction,
} from '@/model/sharing';
import { retailerEventType } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

import { seedAnonymous, seedRecords, seedSettings } from './seed';
import type { BulkAction, CaseStore, ShareResult, Tenant } from './types';

interface Stored {
  record: SharedCaseRecord;
  /** sha256 des Tokens, das nur die App kennt */
  tokenHash: string;
}

interface Db {
  version: 2;
  shares: Record<string, Stored>;
  settings: Record<string, DealerSettings>;
  anonymous: Record<string, AnonymousOutcome[]>;
  /** Abstand der jüngsten Beispielaktivität zum Anlegen. So bleiben die Beispiele frisch. */
  exampleGapMs: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Verschiebt alle Zeitpunkte in einem Objekt */
function shiftDates<T>(x: T, ms: number): T {
  if (typeof x === 'string')
    return (ISO.test(x) ? new Date(Date.parse(x) + ms).toISOString() : x) as T;
  if (Array.isArray(x)) return x.map((y) => shiftDates(y, ms)) as T;
  if (x && typeof x === 'object')
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, shiftDates(v, ms)])) as T;
  return x;
}

/** Jüngster Zeitpunkt bis jetzt (Ablaufdaten in der Zukunft zählen nicht) */
function latest(x: unknown, until: number): number {
  if (typeof x === 'string') {
    if (!ISO.test(x)) return 0;
    const t = Date.parse(x);
    return t <= until ? t : 0;
  }
  if (Array.isArray(x)) return Math.max(0, ...x.map((y) => latest(y, until)));
  if (x && typeof x === 'object') return latest(Object.values(x), until);
  return 0;
}

/** Zugriffe derselben Person in diesem Abstand zählen als einer */
const ACCESS_MERGE_MS = 10 * 60_000;

/** Ab so viel Ruhe rücken die Beispielfälle an die Gegenwart heran */
const STALE_MS = 6 * 3_600_000;

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const newId = (p: string) => `${p}_${crypto.randomBytes(8).toString('hex')}`;
const now = () => new Date().toISOString();

function sameHash(a: string, b: string) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Nach dem Widerruf: nur Fallnummer, Empfänger und Zeitpunkte */
function redact(file: SharedCaseFile): SharedCaseFile {
  return {
    ...file,
    customer: { name: '' },
    device: { manufacturer: '', model: '', category: file.device.category, categoryLabel: '' },
    protection: undefined,
    case: { ...file.case, problemLabel: '' },
    results: [],
    guide: undefined,
    finding: undefined,
    quote: undefined,
    booking: undefined,
    photos: [],
    timeline: [],
    answers: [],
    messages: [],
  };
}

/** Bearbeitungsstand nach einer Aktion des Händlers */
const afterAction: Partial<Record<RetailerAction['type'], WorkflowStatus>> = {
  annehmen: 'wartet_uns',
  rueckfrage: 'wartet_kunde',
  nachricht: 'wartet_kunde',
  termin: 'wartet_kunde',
  entscheidung: 'wartet_uns',
};

function setStatus(record: SharedCaseRecord, status: WorkflowStatus, at = now()) {
  const wf: Workflow = record.workflow ?? { status: 'neu', since: at };
  if (wf.status !== status) record.workflow = { ...wf, status, since: at };
  else record.workflow = wf;
}

/** Zeit, in der dieselbe Aktion noch einmal als Doppelklick gilt */
const REPEAT_MS = 15_000;

/**
 * Die schon gespeicherte Aktion, wenn event sie nur wiederholt: „annehmen“ immer, alles andere,
 * wenn das letzte Ereignis derselben Art innerhalb von REPEAT_MS denselben Inhalt hat.
 */
export function repeated(events: readonly CaseEvent[], event: CaseEvent): CaseEvent | undefined {
  const sameType = events.filter((e) => e.type === event.type);
  if (event.type === 'haendler_angenommen') return sameType[0];
  const last = sameType.at(-1);
  if (!last) return undefined;
  const close = Date.parse(event.at) - Date.parse(last.at) < REPEAT_MS;
  return close && JSON.stringify(last.payload) === JSON.stringify(event.payload) ? last : undefined;
}

export class FileCaseStore implements CaseStore {
  constructor(private readonly file: string) {}

  /** Liest die Datei bei jedem Zugriff frisch: Jede API-Route hat ihre eigene Instanz. */
  private load(): Db {
    if (fs.existsSync(this.file)) {
      const db = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<Db>;
      if (db.version === 2 && db.shares && db.settings && db.anonymous)
        return this.refresh(db as Db);
      // Älterer Stand: Fälle behalten, Einstellungen und Beispiele ergänzen
      const fresh = this.seed();
      const merged: Db = { ...fresh, shares: { ...fresh.shares, ...(db.shares ?? {}) } };
      this.save(merged);
      return merged;
    }
    const db = this.seed();
    this.save(db);
    return db;
  }

  private seed(): Db {
    // Beispielfälle, damit das Portal ohne Telefon etwas zeigt. Ihr Token kennt niemand.
    const shares: Db['shares'] = {};
    for (const record of seedRecords()) {
      shares[record.file.caseId] = {
        record,
        tokenHash: hash(crypto.randomBytes(24).toString('hex')),
      };
    }
    const examples = Object.values(shares).map((x) => x.record);
    return {
      version: 2,
      shares,
      settings: seedSettings(),
      anonymous: seedAnonymous(),
      exampleGapMs: Date.now() - latest(examples, Date.now()),
    };
  }

  /**
   * Demo: Die Beispielfälle sollen am Tag der Vorführung so aussehen wie beim Anlegen
   * (neue Fälle von heute, Fristen knapp). Nach längerer Ruhe rücken alle Zeitpunkte der
   * Beispiele um dieselbe Spanne vor. Fälle aus der App bleiben, wie sie sind.
   */
  private refresh(db: Db): Db {
    const now = Date.now();
    const examples = Object.values(db.shares).filter((x) => x.record.file.isExample);
    const last = latest(
      examples.map((x) => x.record),
      now,
    );
    const delta = now - last - (db.exampleGapMs ?? 0);
    if (!last || delta < STALE_MS) return db;
    for (const x of examples) x.record = shiftDates(x.record, delta);
    db.anonymous = shiftDates(db.anonymous, delta);
    this.save(db);
    return db;
  }

  private save(db: Db) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(db));
  }

  private event(
    caseId: string,
    tenant: { id: string; name: string },
    action: RetailerAction,
    by: string,
    at = now(),
    extra: Record<string, unknown> = {},
  ): CaseEvent {
    const { type: _type, ...payload } = action;
    return {
      id: newId('hev'),
      caseId,
      type: retailerEventType[action.type],
      at,
      actor: { kind: 'haendler', id: tenant.id, name: tenant.name },
      payload: { ...payload, by, ...extra },
    };
  }

  /** Regeln des Händlers für einen neuen Fall */
  private onNewCase(db: Db, record: SharedCaseRecord): CaseEvent[] {
    const file = record.file;
    const dealer = { id: file.recipient.id, name: file.recipient.name };
    const s = db.settings[dealer.id];
    record.workflow = { status: 'neu', since: file.sharedAt, lastCustomerAt: file.sharedAt };
    if (!s) return [];
    const events: CaseEvent[] = [];
    const values = {
      kunde: file.customer.name.split(' ')[0],
      fall: file.caseId,
      haendler: s.profile.shortName,
      telefon: s.profile.phone,
    };
    const contact = {
      name: s.service.ownService ? s.service.serviceName : s.profile.name,
      phone: s.profile.phone,
      email: s.profile.email,
      hours: s.profile.hours,
    };
    if (s.messages.greeting.enabled) {
      events.push(
        this.event(
          file.caseId,
          dealer,
          { type: 'nachricht', text: fillTemplate(s.messages.greeting.text, values) },
          s.profile.shortName,
          now(),
          { auto: true, contact },
        ),
      );
    }
    if (s.messages.away.enabled && !inServiceHours(s.profile.hours)) {
      events.push(
        this.event(
          file.caseId,
          dealer,
          { type: 'nachricht', text: fillTemplate(s.messages.away.text, values) },
          s.profile.shortName,
          now(),
          { auto: true },
        ),
      );
    }
    if (s.rules.autoAccept) {
      events.push(this.event(file.caseId, dealer, { type: 'annehmen' }, s.profile.shortName));
      setStatus(record, 'wartet_uns');
    }
    const assign = s.rules.autoAssign.find((r) => r.category === file.device.category);
    if (assign && record.workflow) record.workflow.assigneeId = assign.assigneeId;
    const hasProof = file.photos.some((p) => p.purpose === 'kaufbeleg');
    const q = s.messages.questions.find((x) => x.id === 'beleg');
    if (s.rules.requestProof && !hasProof && q) {
      events.push(
        this.event(
          file.caseId,
          dealer,
          { type: 'rueckfrage', question: q.question, options: q.options },
          s.profile.shortName,
          now(),
          { auto: true },
        ),
      );
    }
    record.retailerEvents.push(...events);
    return events;
  }

  /** Neue Antworten oder Nachrichten der Kundschaft: der Fall wartet wieder auf den Händler */
  private onCustomerUpdate(db: Db, record: SharedCaseRecord, before: SharedCaseFile): CaseEvent[] {
    const file = record.file;
    const events: CaseEvent[] = [];
    const newAnswers = file.answers.filter(
      (a) => !before.answers.some((b) => b.questionEventId === a.questionEventId),
    );
    const newMessages = (file.messages ?? []).filter(
      (m) => !(before.messages ?? []).some((b) => b.id === m.id),
    );
    if (newAnswers.length || newMessages.length) {
      const at = now();
      record.workflow = {
        ...(record.workflow ?? { status: 'neu', since: at }),
        lastCustomerAt: at,
      };
      if (record.workflow.status === 'wartet_kunde') setStatus(record, 'wartet_uns', at);
    }
    // Zeitfenster gewählt: Der Termin steht, der Händler bestätigt ihn gleich im Gespräch
    for (const a of newAnswers) {
      const offer = record.retailerEvents.find(
        (e) => e.id === a.questionEventId && e.type === 'haendler_termin',
      );
      if (!offer) continue;
      const s = db.settings[file.recipient.id];
      const ev = this.event(
        file.caseId,
        { id: file.recipient.id, name: file.recipient.name },
        { type: 'betrieb', partnerName: String(offer.payload.partnerName ?? ''), slot: a.answer },
        s?.profile.shortName ?? file.recipient.name,
        now(),
        { auto: true },
      );
      record.retailerEvents.push(ev);
      events.push(ev);
      setStatus(record, 'termin');
    }
    // Erledigt oder von der Kundschaft abgebrochen (Nr. 34): Im Portal ist der Fall dann zu, die
    // Frist läuft nicht weiter
    if (file.case.status === 'erledigt' || file.case.status === 'abgebrochen')
      setStatus(record, 'erledigt');
    return events;
  }

  private byToken(db: Db, caseId: string, token: string): Stored | undefined {
    const s = db.shares[caseId];
    return s && sameHash(s.tokenHash, hash(token)) ? s : undefined;
  }

  async upsertShare(file: SharedCaseFile, token: string | undefined): Promise<ShareResult> {
    const db = this.load();
    const existing = db.shares[file.caseId];
    if (existing) {
      if (!token || !sameHash(existing.tokenHash, hash(token)))
        return { ok: false, reason: 'token' };
      if (existing.record.revokedAt) return { ok: false, reason: 'widerrufen' };
      const before = existing.record.file;
      existing.record.file = file;
      const events = this.onCustomerUpdate(db, existing.record, before);
      this.save(db);
      return { ok: true, token, events };
    }
    const fresh = crypto.randomBytes(24).toString('base64url');
    const record: SharedCaseRecord = { file, retailerEvents: [], notes: [], access: [] };
    const events = this.onNewCase(db, record);
    db.shares[file.caseId] = { record, tokenHash: hash(fresh) };
    this.save(db);
    return { ok: true, token: fresh, events };
  }

  async revokeShare(caseId: string, token: string) {
    const db = this.load();
    const s = this.byToken(db, caseId, token);
    if (!s) return false;
    s.record = {
      file: redact(s.record.file),
      retailerEvents: [],
      revokedAt: now(),
      workflow: { status: 'erledigt', since: now() },
      notes: [],
      access: s.record.access,
    };
    this.save(db);
    return true;
  }

  async retailerEvents(caseId: string, token: string, since?: string) {
    const s = this.byToken(this.load(), caseId, token);
    if (!s) return null;
    return s.record.retailerEvents.filter((e) => !since || e.at > since);
  }

  async listForTenant(tenant: Tenant) {
    return Object.values(this.load().shares)
      .map((s) => s.record)
      .filter((r) => r.file.recipient.id === tenant.id)
      .sort((a, b) => b.file.updatedAt.localeCompare(a.file.updatedAt));
  }

  async getForTenant(tenant: Tenant, caseId: string) {
    const db = this.load();
    const r = db.shares[caseId]?.record;
    if (!r || r.file.recipient.id !== tenant.id) return null;
    // Zugriffsprotokoll und „gelesen“. Wer die Akte offen hat (Live-Aktualisierung), steht einmal
    // im Protokoll, mit der letzten Zeit.
    const at = now();
    const access = r.access ?? [];
    const last = access.at(-1);
    if (
      last &&
      last.by === tenant.userName &&
      Date.parse(at) - Date.parse(last.at) < ACCESS_MERGE_MS
    )
      last.at = at;
    else access.push({ at, by: tenant.userName });
    r.access = access.slice(-200);
    if (r.workflow) r.workflow.seenAt = at;
    this.save(db);
    return r;
  }

  async addRetailerAction(tenant: Tenant, caseId: string, action: RetailerAction) {
    const db = this.load();
    const s = db.shares[caseId];
    if (!s || s.record.file.recipient.id !== tenant.id || s.record.revokedAt) return null;
    const event = this.event(caseId, tenant, action, tenant.userName);
    // Ein Doppelklick oder ein zweiter Tab löst nichts doppelt aus: Angenommen ist ein Fall nur
    // einmal, und dieselbe Aktion kurz nach der letzten gilt als dieselbe.
    const same = repeated(s.record.retailerEvents, event);
    if (same) return same;
    s.record.retailerEvents.push(event);
    s.record.file = { ...s.record.file, updatedAt: event.at };
    const next =
      action.type === 'status' && action.status === 'abgeschlossen'
        ? 'erledigt'
        : action.type === 'betrieb' && action.slot
          ? 'termin'
          : afterAction[action.type];
    if (next) setStatus(s.record, next, event.at);
    else if (!s.record.workflow) s.record.workflow = { status: 'wartet_uns', since: event.at };
    if (s.record.workflow && !s.record.workflow.assigneeId && tenant.memberId)
      s.record.workflow.assigneeId = tenant.memberId;
    this.save(db);
    return event;
  }

  async applyWorkflow(tenant: Tenant, caseId: string, action: WorkflowAction) {
    const db = this.load();
    const s = db.shares[caseId];
    if (!s || s.record.file.recipient.id !== tenant.id) return false;
    const r = s.record;
    if (action.type === 'notiz') {
      r.notes = [
        ...(r.notes ?? []),
        { id: newId('note'), at: now(), by: tenant.userName, text: action.text },
      ];
    } else if (action.type === 'kaufbeleg') {
      if (!r.file.photos.some((p) => p.id === action.photoId)) return false;
      r.proofPhotoId = action.photoId;
    } else if (action.type === 'zuweisen') {
      r.workflow = {
        ...(r.workflow ?? { status: 'neu', since: now() }),
        assigneeId: action.assigneeId ?? undefined,
      };
    } else {
      setStatus(r, action.status);
    }
    this.save(db);
    return true;
  }

  async bulk(tenant: Tenant, caseIds: string[], action: BulkAction) {
    let n = 0;
    for (const id of caseIds.slice(0, 200)) {
      if (action.type === 'annehmen') {
        const r = (await this.listForTenant(tenant)).find((x) => x.file.caseId === id);
        if (
          r &&
          (r.workflow?.status ?? 'neu') === 'neu' &&
          (await this.addRetailerAction(tenant, id, { type: 'annehmen' }))
        )
          n++;
      } else if (
        await this.applyWorkflow(
          tenant,
          id,
          action.type === 'zuweisen'
            ? { type: 'zuweisen', assigneeId: action.assigneeId }
            : { type: 'stand', status: action.status },
        )
      ) {
        n++;
      }
    }
    return n;
  }

  async getSettings(tenant: Tenant) {
    return this.load().settings[tenant.id] ?? seedSettings()[tenant.id] ?? seedSettings().fruend!;
  }

  async saveSettings(tenant: Tenant, settings: DealerSettings) {
    const db = this.load();
    db.settings[tenant.id] = settings;
    this.save(db);
    return settings;
  }

  async anonymousOutcomes(tenant: Tenant) {
    return this.load().anonymous[tenant.id] ?? [];
  }
}
