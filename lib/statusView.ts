// Fall-Status als Überschrift, Text, Zeitstrahl und nächste Aktion. Alles aus einer Quelle: Case und CaseEvent (B-33).
import type { TimelineItem } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatDateTime } from '@/i18n/format';
import type { Case } from '@/model/types';
import { activeBooking, selectCaseEvents, type AppData } from '@/store/appStore';

export type NextAction = 'abschluss' | 'kosten' | 'fallakte';

export interface StatusView {
  headline: string;
  text?: string;
  timeline: TimelineItem[];
  next: NextAction;
}

export function statusView(s: AppData, c: Case): StatusView {
  const t = de.status;
  const insurer = demoConfig.insurer.shortName;
  const booking = activeBooking(s, c.id);
  const events = selectCaseEvents(s, c.id);
  const at = (type: string) => events.filter((e) => e.type === type).at(-1);
  const when = (type: string) => {
    const e = at(type);
    return e ? formatDateTime(e.at) : t.timeline.next;
  };
  const callback = events
    .filter((e) => e.type === 'videocall_angefragt' && e.payload.art === 'rueckruf')
    .at(-1);
  const replacement = s.diagnoses.some(
    (d) => d.caseId === c.id && d.errorPattern === 'ersatzgeraet_noetig',
  );

  const timeline: TimelineItem[] = [
    { when: formatDateTime(c.createdAt), what: t.timeline.gemeldet },
  ];
  if (c.claim) {
    timeline.push({ when: formatDateTime(c.claim.reportedAt), what: t.timeline.schaden });
    const d = c.claim.decision;
    timeline.push(
      d
        ? {
            when: formatDateTime(d.at),
            what:
              d.result === 'freigegeben'
                ? t.timeline.freigegeben(insurer)
                : t.timeline.abgelehnt(insurer),
          }
        : { when: t.timeline.next, what: t.timeline.freigabe(insurer), pending: true },
    );
  }
  if (callback) timeline.push({ when: formatDateTime(callback.at), what: t.timeline.rueckruf });
  if (booking) {
    const done = (st: string[]) => st.includes(booking.status);
    timeline.push({ when: when('termin_angefragt'), what: t.timeline.angefragt });
    timeline.push({
      when: when('termin_bestaetigt'),
      what: t.timeline.bestaetigt,
      pending: !done(['bestaetigt', 'unterwegs', 'erledigt']),
    });
    timeline.push({
      when: when('betrieb_unterwegs'),
      what: t.timeline.unterwegs,
      pending: !done(['unterwegs', 'erledigt']),
    });
    timeline.push(
      booking.kind === 'vor_ort_diagnose'
        ? {
            when: when('angebot_erstellt'),
            what: t.timeline.diagnose,
            pending: !done(['erledigt']),
          }
        : {
            when: when('reparatur_abgeschlossen'),
            what: t.timeline.repariert,
            pending: !done(['erledigt']),
          },
    );
  }

  const partner = booking?.provider.name ?? '';
  let headline: string = t.headline.hilfe;
  let text: string | undefined;
  let next: NextAction = 'fallakte';
  if (c.status === 'erledigt') headline = t.headline.erledigt;
  else if (c.status === 'abgebrochen') headline = t.headline.abgebrochen;
  else if (c.status === 'abgelehnt') {
    headline = t.headline.abgelehnt(insurer);
    next = 'kosten';
  } else if (c.status === 'freigabe_noetig') {
    headline = t.headline.pruefung(insurer);
    text = t.text.pruefung;
  } else if (replacement && c.status === 'freigegeben') {
    headline = t.headline.ersatzgeraet(insurer);
  } else if (booking?.status === 'erledigt' && booking.kind === 'vor_ort_diagnose') {
    headline = t.headline.diagnoseFertig;
    text = t.text.diagnoseFertig;
    next = 'kosten';
  } else if (booking?.status === 'erledigt') {
    headline = t.headline.repariert;
    text = t.text.repariert;
    next = 'abschluss';
  } else if (booking?.status === 'unterwegs') {
    headline = t.headline.unterwegs(partner);
    text = t.text.unterwegs;
  } else if (booking?.status === 'bestaetigt') {
    headline = t.headline.bestaetigt(booking.slotLabel);
    text = booking.kind === 'reparatur' ? t.text.bestaetigt(partner) : undefined;
  } else if (booking?.status === 'angefragt') {
    headline = c.status === 'freigegeben' ? t.headline.freigegeben(insurer) : t.headline.angefragt;
    text = t.text.angefragt(partner);
  } else if (callback) {
    headline = t.headline.rueckruf(String(callback.payload.slot ?? ''));
    text = t.text.rueckruf;
  }
  return { headline, text, timeline, next };
}
