// Gespräch in der Fallakte: Nachrichten der Kundschaft, Antworten des Händlers (so, wie sie in der
// App stehen), Notizen des Teams und die Schritte aus der App als Systemzeilen.
import { de } from '@/i18n/de';
import { goodwillLine } from '@/lib/goodwill';
import type {
  PartStatus,
  RetailerDecision,
  RetailerStatus,
  SharedCaseRecord,
  SharedPhoto,
} from '@/model/sharing';
import type { CaseEvent } from '@/model/types';

export type ConvItem =
  | { kind: 'system'; at: string; texts: { at: string; text: string }[] }
  | { kind: 'customer'; at: string; text: string; photo?: SharedPhoto; answer?: boolean }
  | {
      kind: 'dealer';
      at: string;
      by: string;
      auto: boolean;
      text: string;
      note?: string;
      options?: string[];
      chosen?: string;
      contact?: boolean;
    }
  | { kind: 'note'; at: string; by: string; text: string };

/** Was die Kundschaft in der App liest */
export function dealerText(e: CaseEvent, dealerShort: string): string {
  const p = e.payload;
  switch (e.type) {
    case 'haendler_nachricht':
      return String(p.text ?? '');
    case 'haendler_rueckfrage':
      return String(p.question ?? '');
    case 'haendler_termin':
      return de.sharing.slotOffer(String(p.partnerName ?? ''));
    case 'haendler_ersatzteil':
      return de.sharing.part(
        String(p.part ?? ''),
        (p.status as PartStatus) ?? 'bestellt',
        p.eta ? String(p.eta) : undefined,
      );
    case 'haendler_angenommen':
      return de.sharing.accepted(dealerShort);
    case 'haendler_entscheidung': {
      // Mit Betrag bei Kulanz, wie die Kundschaft es liest
      const text = de.sharing.decision[p.decision as RetailerDecision] ?? '';
      const share = goodwillLine(dealerShort, p);
      return share ? `${text}\n${share}` : text;
    }
    case 'haendler_betrieb':
      return de.sharing.partner(String(p.partnerName ?? ''), p.slot ? String(p.slot) : undefined);
    case 'haendler_status':
      return de.sharing.status[p.status as RetailerStatus] ?? '';
    default:
      return de.caseEvent[e.type] ?? '';
  }
}

/** Zeitstrahl-Einträge, die im Gespräch schon anders stehen */
const skip: CaseEvent['type'][] = ['rueckfrage_beantwortet', 'nachricht_an_haendler'];

/**
 * Was der Händler selbst tat (haendler_*), kommt mit dem Abgleich als Ereignis in den Zeitstrahl
 * der App zurück. Im Portal steht es schon als seine Nachricht, eine Systemzeile davor wäre doppelt.
 */
const ownEcho = (type: CaseEvent['type']) => type.startsWith('haendler_');

/** short: Kurzname des Händlers aus seinen Einstellungen, für Nachrichten ohne Absender */
export function conversation(r: SharedCaseRecord, short = r.file.recipient.name): ConvItem[] {
  const f = r.file;
  const items: ConvItem[] = [];
  for (const x of f.timeline) {
    if (skip.includes(x.type) || ownEcho(x.type)) continue;
    items.push({ kind: 'system', at: x.at, texts: [{ at: x.at, text: x.label }] });
  }
  for (const m of f.messages ?? []) {
    items.push({
      kind: 'customer',
      at: m.at,
      text: m.text,
      photo: m.photoId ? f.photos.find((p) => p.id === m.photoId) : undefined,
    });
  }
  for (const a of f.answers)
    items.push({ kind: 'customer', at: a.at, text: a.answer, answer: true });
  for (const e of r.retailerEvents) {
    const p = e.payload;
    const options = Array.isArray(p.options)
      ? (p.options as string[])
      : Array.isArray(p.slots)
        ? (p.slots as string[])
        : undefined;
    items.push({
      kind: 'dealer',
      at: e.at,
      by: String(p.by ?? short),
      auto: !!p.auto,
      text: dealerText(e, short),
      note: p.note ? String(p.note) : undefined,
      options,
      chosen: f.answers.find((a) => a.questionEventId === e.id)?.answer,
      contact: !!p.contact,
    });
  }
  for (const n of r.notes ?? []) items.push({ kind: 'note', at: n.at, by: n.by, text: n.text });
  items.sort((a, b) => a.at.localeCompare(b.at));
  // Aufeinanderfolgende Systemzeilen zusammenfassen
  const out: ConvItem[] = [];
  for (const x of items) {
    const prev = out.at(-1);
    if (x.kind === 'system' && prev?.kind === 'system') prev.texts.push(...x.texts);
    else out.push(x.kind === 'system' ? { ...x, texts: [...x.texts] } : x);
  }
  return out;
}
