// Ereignisse der Fallakte als lesbare Zeilen. Quelle ist immer CaseEvent (B-36).
import { demoConfig } from '@/config/demo.config';
import { guides, type GuideId } from '@/data/guides';
import { de } from '@/i18n/de';
import type { CaseEvent, CaseStatus, PhotoPurpose } from '@/model/types';

import { caseStatusLabel } from './caseView';

const f = de.file.event;

function stepTitle(e: CaseEvent): string | undefined {
  const guide = guides[e.payload.guideId as GuideId];
  const n = Number(e.payload.step);
  return guide && n ? f.step(n, guide.steps[n - 1]?.t ?? '') : undefined;
}

export function eventLabel(e: CaseEvent): string {
  const base = de.caseEvent[e.type];
  const p = e.payload;
  let detail: string | undefined;
  switch (e.type) {
    case 'anleitung_gestartet':
      detail = guides[p.guideId as GuideId]
        ? f.guide(guides[p.guideId as GuideId].title)
        : undefined;
      break;
    case 'schritt_erledigt':
    case 'schritt_zurueck':
    case 'sicherheit_bestaetigt':
      detail = stepTitle(e);
      break;
    case 'schritt_geht_nicht':
      detail = [stepTitle(e), p.note ? f.note(String(p.note)) : undefined]
        .filter(Boolean)
        .join(' · ');
      break;
    case 'anleitung_beendet':
      detail = f.outcome[p.outcome as keyof typeof f.outcome];
      break;
    case 'foto_aufgenommen':
      detail = f.photo(de.caseFile.photoPurpose[p.purpose as PhotoPurpose] ?? '');
      break;
    case 'status_geaendert':
      detail = f.status(caseStatusLabel(p.to as CaseStatus));
      break;
    case 'weitergabe_bestaetigt':
      detail = f.shared(String(p.recipient));
      break;
    case 'freigabe_entschieden':
      detail = [
        f.decision[p.result as keyof typeof f.decision],
        f.by[p.actor as keyof typeof f.by],
        demoConfig.insurer.shortName,
      ]
        .filter(Boolean)
        .join(' · ');
      break;
    case 'videocall_angefragt':
      detail = p.art === 'rueckruf' ? f.callback(String(p.slot)) : String(p.expert ?? '');
      break;
    case 'termin_angefragt':
      detail = f.booking(String(p.partner), String(p.slot));
      break;
    case 'bewertet':
      detail = f.stars(Number(p.stars));
      break;
    case 'rueckfrage_beantwortet':
      detail = f.answer(String(p.question), String(p.answer));
      break;
    case 'abgebrochen':
      detail = p.reason ? f.reason(String(p.reason)) : undefined;
      break;
  }
  return detail ? f.detail(base, detail) : base;
}
