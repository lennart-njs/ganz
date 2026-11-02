// Stand eines Falls aus Sicht des Händlers, aus seinen Ereignissen und den Antworten des Haushalts.
import type { SharedCaseRecord } from '@/model/sharing';

export type RetailerState =
  | 'neu'
  | 'angenommen'
  | 'rueckfrage'
  | 'beantwortet'
  | 'entschieden'
  | 'abgeschlossen'
  | 'widerrufen';

export function retailerState(r: SharedCaseRecord): RetailerState {
  if (r.revokedAt) return 'widerrufen';
  const ev = r.retailerEvents;
  if (ev.some((e) => e.type === 'haendler_status' && e.payload.status === 'abgeschlossen'))
    return 'abgeschlossen';
  const question = ev.findLast((e) => e.type === 'haendler_rueckfrage');
  if (question) {
    const answered = r.file.answers.some((a) => a.questionEventId === question.id);
    const later = ev.some((e) => e.at > question.at && e.type !== 'haendler_rueckfrage');
    if (!later) return answered ? 'beantwortet' : 'rueckfrage';
  }
  if (ev.some((e) => e.type === 'haendler_entscheidung')) return 'entschieden';
  if (ev.length) return 'angenommen';
  return 'neu';
}

export type Filter = 'alle' | 'neu' | 'offen' | 'erledigt';

export function matches(state: RetailerState, filter: Filter): boolean {
  if (filter === 'alle') return true;
  if (filter === 'neu') return state === 'neu';
  if (filter === 'erledigt') return state === 'abgeschlossen' || state === 'widerrufen';
  return !['neu', 'abgeschlossen', 'widerrufen'].includes(state);
}
