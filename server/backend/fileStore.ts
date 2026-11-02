// Demo-Backend: speichert geteilte Fälle in einer JSON-Datei (.data/ganz-backend.json).
// Für die Demo reicht das. Ein echtes Backend implementiert dasselbe Interface (types.ts).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { RetailerAction, SharedCaseFile, SharedCaseRecord } from '@/model/sharing';
import { retailerEventType } from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

import { seedRecords } from './seed';
import type { CaseStore, Tenant } from './types';

interface Stored {
  record: SharedCaseRecord;
  /** sha256 des Tokens, das nur die App kennt */
  tokenHash: string;
}

interface Db {
  shares: Record<string, Stored>;
}

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

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
  };
}

export class FileCaseStore implements CaseStore {
  private db: Db | undefined;

  constructor(private readonly file: string) {}

  /** Liest die Datei bei jedem Zugriff frisch: Jede API-Route hat ihre eigene Instanz. */
  private load(): Db {
    if (fs.existsSync(this.file)) {
      this.db = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Db;
    } else {
      // Beispielfälle, damit das Portal ohne Telefon etwas zeigt. Ihr Token kennt niemand.
      const shares: Db['shares'] = {};
      for (const record of seedRecords()) {
        shares[record.file.caseId] = {
          record,
          tokenHash: hash(crypto.randomBytes(24).toString('hex')),
        };
      }
      this.db = { shares };
      this.save();
    }
    return this.db;
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.db, null, 2));
  }

  private byToken(caseId: string, token: string): Stored | undefined {
    const s = this.load().shares[caseId];
    return s && sameHash(s.tokenHash, hash(token)) ? s : undefined;
  }

  async upsertShare(file: SharedCaseFile, token: string | undefined) {
    const db = this.load();
    const existing = db.shares[file.caseId];
    if (existing) {
      if (!token || !sameHash(existing.tokenHash, hash(token)))
        return { ok: false as const, reason: 'token' as const };
      if (existing.record.revokedAt) return { ok: false as const, reason: 'widerrufen' as const };
      existing.record.file = file;
      this.save();
      return { ok: true as const, token };
    }
    const fresh = crypto.randomBytes(24).toString('base64url');
    db.shares[file.caseId] = { record: { file, retailerEvents: [] }, tokenHash: hash(fresh) };
    this.save();
    return { ok: true as const, token: fresh };
  }

  async revokeShare(caseId: string, token: string) {
    const s = this.byToken(caseId, token);
    if (!s) return false;
    s.record = {
      file: redact(s.record.file),
      retailerEvents: [],
      revokedAt: new Date().toISOString(),
    };
    this.save();
    return true;
  }

  async retailerEvents(caseId: string, token: string, since?: string) {
    const s = this.byToken(caseId, token);
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
    const r = this.load().shares[caseId]?.record;
    return r && r.file.recipient.id === tenant.id ? r : null;
  }

  async addRetailerAction(tenant: Tenant, caseId: string, action: RetailerAction) {
    const s = this.load().shares[caseId];
    if (!s || s.record.file.recipient.id !== tenant.id || s.record.revokedAt) return null;
    const { type: _type, ...payload } = action;
    const event: CaseEvent = {
      id: `hev_${crypto.randomBytes(8).toString('hex')}`,
      caseId,
      type: retailerEventType[action.type],
      at: new Date().toISOString(),
      actor: { kind: 'haendler', id: tenant.id, name: tenant.name },
      payload: { ...payload, by: tenant.userName },
    };
    s.record.retailerEvents.push(event);
    s.record.file = { ...s.record.file, updatedAt: event.at };
    this.save();
    return event;
  }
}
