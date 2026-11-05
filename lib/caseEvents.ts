// Ereignisse der Fallakte als lesbare Zeilen. Quelle ist immer CaseEvent (B-36).
import { demoConfig } from '@/config/demo.config';
import { getGuide } from '@/lib/guideCatalog';
import { de } from '@/i18n/de';
import { formatDate, formatEuro } from '@/i18n/format';
import { goodwillShare } from '@/model/sharing';
import type { CaseEvent, CaseStatus, PhotoPurpose } from '@/model/types';

import { caseStatusLabel } from './caseView';

const f = de.file.event;

function stepTitle(e: CaseEvent): string | undefined {
  const guide = getGuide(String(e.payload.guideId));
  const n = Number(e.payload.step);
  if (!guide || !n) return undefined;
  const s = guide.steps[n - 1];
  // In der Fallakte steht die Seite der Gebrauchsanweisung (Entscheidung 20)
  return s?.src ? f.stepPage(n, s.t, s.src.page) : f.step(n, s?.t ?? '');
}

export function eventLabel(e: CaseEvent): string {
  const base = de.caseEvent[e.type];
  const p = e.payload;
  let detail: string | undefined;
  switch (e.type) {
    case 'anleitung_gestartet':
      detail = getGuide(String(p.guideId))
        ? de.common.dot(
            f.guide(getGuide(String(p.guideId))?.title ?? ''),
            getGuide(String(p.guideId))?.sourceDocument ?? '',
          )
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
      detail = p.replaced ? f.replaced : f.outcome[p.outcome as keyof typeof f.outcome];
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
        demoConfig.insurers.find((i) => i.name === e.actor.name)?.shortName ??
          demoConfig.insurer.shortName,
      ]
        .filter(Boolean)
        .join(' · ');
      break;
    case 'videocall_angefragt':
      detail = p.art === 'rueckruf' ? f.callback(String(p.slot)) : String(p.expert ?? '');
      break;
    case 'termin_angefragt':
      // Die Nachbesserung steht als Gewährleistung in der Fallakte (Nr. 32)
      detail = p.rework
        ? f.reworkBooking(String(p.partner), String(p.slot))
        : f.booking(String(p.partner), String(p.slot));
      break;
    case 'nachbesserung_verlangt':
      detail = f.rework(String(p.partner), formatDate(String(p.until)));
      break;
    case 'reparatur_abgeschlossen':
      detail = p.rework ? f.reworkDone : undefined;
      break;
    case 'problem_besteht_weiter': {
      const reason = p.warranty as string | undefined;
      detail =
        reason === 'abgelaufen' || reason === 'nachbesserung_gescheitert'
          ? f.noRework[reason]
          : undefined;
      break;
    }
    case 'zahlungspflichtig_gebucht':
      detail = f.binding(String(p.partner), String(p.slot), formatEuro(Number(p.amount)));
      break;
    case 'preis_genannt':
      detail = f.price(String(p.partner), formatEuro(Number(p.price)));
      break;
    case 'nicht_gebucht':
    case 'termin_abgesagt':
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
    case 'haendler_rueckfrage':
      detail = String(p.question ?? '');
      break;
    case 'haendler_entscheidung': {
      const decision =
        de.sharing.eventDetail.decision[p.decision as keyof typeof de.sharing.eventDetail.decision];
      const share = goodwillShare(p);
      detail = share ? `${decision} · ${f.goodwill(formatEuro(share.cover))}` : decision;
      break;
    }
    case 'haendler_betrieb':
      detail = [String(p.partnerName ?? ''), p.slot ? String(p.slot) : '']
        .filter(Boolean)
        .join(' · ');
      break;
    case 'haendler_status':
      detail =
        de.sharing.eventDetail.status[p.status as keyof typeof de.sharing.eventDetail.status];
      break;
  }
  return detail ? f.detail(base, detail) : base;
}
