// Fall-Status als Überschrift, Text, Zeitstrahl und nächste Aktion. Alles aus einer Quelle: Case und CaseEvent (B-33).
import type { TimelineItem } from '@/components/ds';
import { demoConfig } from '@/config/demo.config';
import { de } from '@/i18n/de';
import { formatDateTime } from '@/i18n/format';
import { caseAppliance } from '@/lib/appliance';
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
  const a = caseAppliance(s, c.id);
  const events = selectCaseEvents(s, c.id);
  const at = (type: string) => events.filter((e) => e.type === type).at(-1);
  const callback = events
    .filter((e) => e.type === 'videocall_angefragt' && e.payload.art === 'rueckruf')
    .at(-1);
  const replacement = s.diagnoses.some(
    (d) => d.caseId === c.id && d.errorPattern === 'ersatzgeraet_noetig',
  );

  // Jeder Eintrag mit Zeitpunkt. Erledigtes steht in zeitlicher Folge oben, was aussteht, darunter.
  const entries: { at?: string; item: TimelineItem }[] = [
    { at: c.createdAt, item: { when: formatDateTime(c.createdAt), what: t.timeline.gemeldet } },
  ];
  const done = (what: string, iso: string) =>
    entries.push({ at: iso, item: { when: formatDateTime(iso), what } });
  const pending = (what: string) =>
    entries.push({ item: { when: t.timeline.next, what, pending: true } });
  /** Erledigt, wenn das Ereignis da ist, sonst ausstehend */
  const byEvent = (type: string, what: string, isDone: boolean) => {
    const e = at(type);
    if (isDone && e) done(what, e.at);
    else pending(what);
  };

  if (c.claim) {
    done(t.timeline.schaden, c.claim.reportedAt);
    const d = c.claim.decision;
    if (d) {
      done(
        d.result === 'freigegeben'
          ? t.timeline.freigegeben(insurer)
          : t.timeline.abgelehnt(insurer),
        d.at,
      );
    } else pending(t.timeline.freigabe(insurer));
  }
  if (callback) done(t.timeline.rueckruf, callback.at);
  // Nach einer Ablehnung kommt kein Termin mehr. Er erscheint nur, wenn neu gebucht wird.
  if (booking && c.status !== 'abgelehnt') {
    const reached = (st: string[]) => st.includes(booking.status);
    byEvent('termin_angefragt', t.timeline.angefragt, true);
    byEvent(
      'termin_bestaetigt',
      t.timeline.bestaetigt,
      reached(['bestaetigt', 'unterwegs', 'erledigt']),
    );
    byEvent('betrieb_unterwegs', t.timeline.unterwegs, reached(['unterwegs', 'erledigt']));
    if (booking.kind === 'vor_ort_diagnose') {
      byEvent('angebot_erstellt', t.timeline.diagnose, reached(['erledigt']));
    } else {
      byEvent('reparatur_abgeschlossen', t.timeline.repariert, reached(['erledigt']));
    }
  }
  const timeline: TimelineItem[] = [
    ...entries
      .filter((e) => e.at)
      .sort((x, y) => x.at!.localeCompare(y.at!))
      .map((e) => e.item),
    ...entries.filter((e) => !e.at).map((e) => e.item),
  ];

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
    text = a.runsAgainAsk;
    next = 'abschluss';
  } else if (booking?.status === 'unterwegs') {
    headline = t.headline.unterwegs(partner);
    text = a.reachable;
  } else if (booking?.status === 'bestaetigt') {
    headline = t.headline.bestaetigt(booking.slotLabel);
    text = booking.kind === 'reparatur' ? t.text.bestaetigt(partner, a.finding.partAcc) : undefined;
  } else if (booking?.status === 'angefragt') {
    headline = c.status === 'freigegeben' ? t.headline.freigegeben(insurer) : t.headline.angefragt;
    text = t.text.angefragt(partner);
  } else if (callback) {
    headline = t.headline.rueckruf(String(callback.payload.slot ?? ''));
    text = t.text.rueckruf;
  }
  return { headline, text, timeline, next };
}
