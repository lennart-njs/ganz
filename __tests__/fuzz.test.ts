// Fuzz-Test über den echten Store (Schritt 24, ZUKUNFTSPLAN Phase 1 „Befehle ohne Absturz“).
// Jede Folge wählt ihre Schritte aus dem, was gerade möglich ist: availableActions je Fall,
// „Problem melden“ je Gerät und die Welt draußen (Simulation, Call, Befund, Widerruf).
// Kein Schritt darf werfen. Je Gerät gibt es höchstens einen offenen Fall, je Fall höchstens
// eine offene Anleitung und je Art höchstens einen Termin, der zählt. Eine Ablehnung ändert nichts.
// Ein Termin, für den der Haushalt zahlt, läuft nur mit dem Tap „Zahlungspflichtig buchen“, und
// diesen Tap gibt es nie, solange der Versicherer prüft (Entscheidung Nr. 31). Die Vor-Ort-Diagnose
// läuft erst mit Preis und Tap, und „Nicht buchen“ beendet die Anfrage ohne Kosten (Nr. 33).
// Abbrechen geht auch in der Reparatur. Danach läuft kein Termin mehr, jeder bekommt seine Absage,
// und die Simulation macht keinen Schritt mehr (Nr. 34). Hilft eine Reparatur nicht, bessert der
// Betrieb in der Gewährleistung nach, ohne Schadenfall und ohne Betrag (Nr. 32). Ein Gerät, das
// beim Händler gekauft ist, geht an ihn, sobald Hilfe nötig ist, mit höchstens einer gültigen
// Weitergabe je Fall, und Nachrichten an ihn gibt es nur mit ihr (Entscheidungen 28, 32).
import { array, assert, boolean, constantFrom, integer, nat, property } from 'fast-check';
import type { StateStorage } from 'zustand/middleware';

import { demoConfig } from '@/config/demo.config';
import { caseService } from '@/lib/service';
import { isClosed } from '@/model/caseMachine';
import { ALL_ACTIONS, availableActions, type ActionKey } from '@/model/policies/actions';
import { selectCaseFacts, type CaseFacts } from '@/model/policies/caseFacts';
import type { OpenCaseOptions } from '@/model/policies/openCase';
import type { Booking, Case, CaseEntry, Claim, PartnerRef } from '@/model/types';
import {
  createAppStore,
  nextSimulationDue,
  selectOpenCases,
  type AppState,
  type AppStore,
  type NewConsent,
} from '@/store/appStore';
import type { StoreEnv } from '@/store/env';
import { unwrap } from '@/test/result';

/** Zahl der Folgen. Mit FUZZ_SEED=<Zahl> läuft eine andere, wiederholbare Auswahl. */
const RUNS = 1000;
const SEED = Number(process.env.FUZZ_SEED ?? 20261103);

/** Speicher ohne Inhalt: persist schreibt, behält aber nichts */
const nowhere: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function testEnv(): StoreEnv {
  let n = 0;
  let t = Date.parse(demoConfig.demo.startAt);
  return {
    now: () => new Date((t += 1000)).toISOString(),
    newId: (p) => `${p}-${++n}`,
  };
}

interface Step {
  /** ActionKey, wenn der Schritt eine Aktion des Haushalts ist */
  action?: ActionKey;
  /** Der Fall, um den es geht, für Schritte der Welt draußen */
  caseId?: string;
  name: string;
  run: (s: AppState) => unknown;
}

const OPENINGS: [CaseEntry, string, OpenCaseOptions][] = [
  ['symptom', 'Wäsche noch nass', { guideId: 'nass' }],
  ['foto', 'Foto vom Display', {}],
  ['symptom', 'Tür geht nicht auf', { guideId: 'tuer', neuesProblem: true }],
  ['pflege', 'Hygiene-Programm', { guideId: 'hygiene' }],
];

/** Händler, bei dem die Geräte gekauft sind, wenn die Folge mit Händler beginnt (Entscheidung 31) */
const DEALER: PartnerRef = {
  id: demoConfig.dealers[0]!.id,
  kind: 'haendler',
  name: demoConfig.dealers[0]!.name,
};

/** Betriebe, die der Fall anbietet: beim Händler-Gerät ohne Schutz sein Kundendienst (lib/service.ts) */
const partnersOf = (s: AppState, caseId: string) =>
  caseService(s, caseId).partners.map((p) => p.id);

/**
 * Die Bestätigung an die Fachkraft, die der Tap auf „Videocall starten“ erteilt. Sie nennt den
 * Betrieb der Fachkraft, die den Fall übernimmt, wie der Satz im Gespräch (namesExpert im Store).
 */
function share(s: AppState, caseId: string): NewConsent {
  const partner = caseService(s, caseId).expert.partner;
  return {
    caseId,
    purpose: 'weitergabe_fachkraft',
    legalBasis: 'vertrag',
    recipient: { id: partner.id, kind: 'betrieb', name: partner.name },
    dataCategories: ['Fotos'],
    textVersion: '1',
  };
}

/** Was der Haushalt mit einer Aktion im Store auslöst, wie die Screens */
function household(key: ActionKey, c: Case, f: CaseFacts, s: AppState): Step[] {
  const step = (name: string, run: (s: AppState) => unknown): Step => ({ action: key, name, run });
  const id = c.id;
  const booking = (kind: 'reparatur' | 'vor_ort_diagnose', selfPay: boolean) =>
    partnersOf(s, id).map((partnerId) =>
      step(`${key} ${partnerId}`, (x) =>
        x.requestBooking({
          caseId: id,
          kind,
          partnerId,
          slotLabel: demoConfig.slots[0]!,
          selfPay,
          partName: f.quote?.repair.partName,
        }),
      ),
    );
  switch (key) {
    case 'problem_aendern':
      return [
        step(key, (x) =>
          x.openCaseFor(c.deviceId, 'symptom', 'Tür geht nicht auf', {
            aendern: id,
            guideId: 'tuer',
          }),
        ),
      ];
    case 'anleitung_starten':
      return ['ablauf', 'nass'].map((g) => step(`${key} ${g}`, (x) => x.startGuide(id, g)));
    case 'anleitung_fortsetzen': {
      const run = f.guideRun!;
      return [
        step(`${key} weiter`, (x) => x.moveGuideStep(run.id, 'next')),
        step(`${key} läuft wieder`, (x) => x.finishGuide(run.id, 'laeuft_wieder')),
        step(`${key} geht nicht`, (x) => x.finishGuide(run.id, 'geht_nicht', 'klemmt')),
      ];
    }
    case 'hilfe_holen':
      return [step(key, (x) => x.escalate(id))];
    case 'videocall_anfragen':
      return [step(key, (x) => x.requestVideoCall(id, { share: share(x, id) }))];
    case 'rueckruf_anfragen':
      return [step(key, (x) => x.requestCallback(id, demoConfig.slots[1]!))];
    case 'termin_diagnose':
      return booking('vor_ort_diagnose', false);
    case 'an_haendler_senden':
      return [step(key, (x) => x.shareWithDealer(id, 'fuzz'))];
    case 'haendler_schreiben':
      return [
        step(key, (x) => x.messageDealer(id, 'Ist das Ersatzteil schon da?')),
        // Leer geht nichts an den Händler
        step(`${key} leer`, (x) => x.messageDealer(id, '   ')),
      ];
    case 'schaden_melden':
      return [step(key, (x) => x.reportClaim(id))];
    case 'selbst_zahlen':
    case 'selbst_zahlen_nach_ablehnung':
    case 'termin_selbst':
      return booking('reparatur', true);
    case 'termin_versicherer':
      return booking('reparatur', false);
    case 'zahlungspflichtig_buchen': {
      const due = f.bindingDue!;
      return [
        step(key, (x) => x.bookBinding(id, due.amount)),
        // Ein anderer Betrag als der gezeigte wird nie gebucht
        step(`${key} anderer Betrag`, (x) => x.bookBinding(id, due.amount + 100)),
      ];
    }
    case 'nicht_buchen':
      return [step(key, (x) => x.declineBinding(id))];
    case 'nachbesserung_anfragen':
      return [step(key, (x) => x.requestRework(id, demoConfig.slots[2]!))];
    case 'reparatur_bestaetigen':
      return [step(key, (x) => x.confirmRepair(id, true))];
    case 'problem_besteht_weiter':
      return [step(key, (x) => x.confirmRepair(id, false))];
    case 'bewerten': {
      const b = f.bookings.reparatur;
      return b ? [step(key, (x) => x.rateBooking(b.id, 5))] : [];
    }
    case 'weitergabe_erneuern':
      return [step(key, (x) => x.renewTransfer(id))];
    case 'pausieren':
      return [step(key, (x) => x.pauseCase(id))];
    case 'abbrechen':
      return [step(key, (x) => x.runCommand(id, 'abbrechen', { cancelReason: 'Fuzz' }))];
  }
}

const NOCHMAL_HAENDLER = 'nach dem Widerruf noch einmal an den Händler';

/** Was außerhalb des Telefons passiert: Versicherer, Betrieb, Fachkraft, Widerruf in der Fallakte */
function world(c: Case, f: CaseFacts, s: AppState): Step[] {
  const id = c.id;
  const steps: Step[] = [{ name: 'simulation', caseId: id, run: (x) => x.simulateNext(id) }];
  const v = f.lastVideoSession;
  if (v && !v.endedAt) {
    for (const change of ['verbunden', 'keine_fachkraft', 'beendet'] as const) {
      steps.push({ name: `call ${change}`, run: (x) => x.updateVideoCall(v.id, change) });
    }
  }
  // Befund nach einem Call, wie im Gespräch
  if (v?.outcome === 'verbunden' && availableActions(f).includes('videocall_anfragen')) {
    for (const option of ['geloest', 'reparatur', 'ersatzgeraet'] as const) {
      steps.push({ name: `befund ${option}`, run: (x) => x.setFinding(id, option, 'fachkraft') });
    }
  }
  for (const consent of s.consents.filter((k) => k.caseId === id && !k.revokedAt)) {
    steps.push({ name: `widerruf ${consent.purpose}`, run: (x) => x.revokeConsent(consent.id) });
  }
  if (c.pausedAt) steps.push({ name: 'fortsetzen', run: (x) => x.resumeCase(id) });
  // Ein Tap auf „Ja, senden“ aus einem älteren Bild, nachdem die Weitergabe an den Händler
  // widerrufen ist. Der Store muss ablehnen: einmal je Fall (Entscheidung 28).
  if (
    s.consents.some((k) => k.caseId === id && k.purpose === 'weitergabe_haendler' && k.revokedAt)
  ) {
    steps.push({ name: NOCHMAL_HAENDLER, caseId: id, run: (x) => x.shareWithDealer(id, 'fuzz') });
  }
  return steps;
}

/**
 * Was jetzt möglich ist, in Gruppen: „Problem melden“ für die Geräte, dann je Fall seine Aktionen
 * und die Welt draußen. Erst wählt die Folge die Gruppe, dann den Schritt. So kommen auch lange
 * Wege in einem Fall vor, statt dass neue Meldungen die Auswahl füllen.
 */
function menu(store: AppStore): Step[][] {
  const s = store.getState();
  const opening: Step[] = s.devices.flatMap((d) =>
    OPENINGS.map(([entry, label, options]) => ({
      name: `melden ${entry}`,
      run: (x: AppState) => x.openCaseFor(d.id, entry, label, options),
    })),
  );
  const perCase = Object.values(s.cases).map((c) => {
    const f = selectCaseFacts(s, c.id)!;
    return [...availableActions(f).flatMap((key) => household(key, c, f, s)), ...world(c, f, s)];
  });
  return [opening, ...perCase].filter((g) => g.length > 0);
}

const pick = (groups: Step[][], choice: number): Step => {
  const group = groups[choice % groups.length]!;
  return group[Math.floor(choice / groups.length) % group.length]!;
};

/** Womit eine Folge beginnt. Jeder Stand entsteht über dieselben Befehle wie in der App. */
type Start =
  | 'leer'
  | 'befund'
  | 'gemeldet'
  | 'vorbehaltlich'
  | 'diagnose'
  | 'reparatur'
  | 'nachbesserung'
  | 'nachgebessert';
const STARTS: Start[] = [
  'leer',
  'befund',
  'gemeldet',
  'vorbehaltlich',
  'diagnose',
  'reparatur',
  'nachbesserung',
  'nachgebessert',
];

function setup(
  start: Start,
  contract: boolean,
  dealer: boolean,
  devices: number,
  claimScenario: 'freigeben' | 'ablehnen',
  deductible: number,
  repairLongAgo: boolean,
) {
  const store = createAppStore(nowhere, testEnv());
  const s = () => store.getState();
  s().ensureHousehold();
  s().setDemo({ claimScenario, deductible, repairLongAgo });
  if (contract) s().linkContract('vertragsnummer');
  for (let i = 0; i < devices; i++) {
    s().addDevice({
      manufacturerId: demoConfig.manufacturer.id,
      category: 'waschmaschine',
      model: demoConfig.device.model,
      identifiedBy: 'vertrag',
      contractId: s().contracts[0]?.id,
      ...(dealer ? { soldBy: DEALER } : {}),
    });
  }
  if (start === 'leer') return store;
  const id = unwrap(s().openCaseFor(s().devices[0]!.id, 'foto', 'Foto vom Display')).caseId;
  unwrap(s().escalate(id));
  const booking = (kind: 'reparatur' | 'vor_ort_diagnose', selfPay: boolean) =>
    unwrap(
      s().requestBooking({
        caseId: id,
        kind,
        partnerId: partnersOf(s(), id)[0]!,
        slotLabel: demoConfig.slots[0]!,
        selfPay,
      }),
    );
  if (start === 'diagnose') {
    booking('vor_ort_diagnose', false);
    return store;
  }
  // Videocall mit Befund „Reparatur“ und Kostenvoranschlag
  const call = unwrap(s().requestVideoCall(id, { share: share(s(), id) }));
  unwrap(s().updateVideoCall(call.id, 'verbunden'));
  unwrap(s().updateVideoCall(call.id, 'beendet'));
  unwrap(s().setFinding(id, 'reparatur', 'fachkraft'));
  if ((start === 'gemeldet' || start === 'vorbehaltlich') && contract) unwrap(s().reportClaim(id));
  // Termin vorbehaltlich Freigabe: Nach der Freigabe wartet er mit Selbstbeteiligung auf den Tap
  // „Zahlungspflichtig buchen“ (Nr. 31)
  if (start === 'vorbehaltlich' && contract) booking('reparatur', false);
  if (start === 'reparatur' || start === 'nachbesserung' || start === 'nachgebessert') {
    // Selbst gezahlt, der Betrieb ist fertig
    booking('reparatur', true);
    while (s().simulateNext(id));
  }
  // „Problem besteht weiter“: in der Gewährleistung die Nachbesserung, sonst eine neue Runde
  if (start === 'nachbesserung' || start === 'nachgebessert') unwrap(s().confirmRepair(id, false));
  // Der Betrieb hat nachgebessert, die Frage ist, ob das Gerät jetzt läuft
  if (start === 'nachgebessert' && s().cases[id]?.rework) {
    unwrap(s().requestRework(id, demoConfig.slots[1]!));
    while (s().simulateNext(id));
  }
  return store;
}

/**
 * Je Gerät höchstens ein offener Fall (Nr. 13), je Fall höchstens eine offene Anleitung (B-05)
 * und je Art und Runde höchstens ein Termin, der zählt (R-08). Ein Termin vorbehaltlich Freigabe, der nach
 * der Ablehnung nur angefragt ist, zählt nicht mehr. Gibt den ersten Verstoß zurück. Ohne expect
 * je Schritt, damit 1.000 Folgen schnell laufen.
 */
function violation(s: AppState): string | undefined {
  const devices = new Set<string>();
  for (const c of selectOpenCases(s)) {
    if (devices.has(c.deviceId)) return `zwei offene Fälle für ${c.deviceId}`;
    devices.add(c.deviceId);
  }
  for (const c of Object.values(s.cases)) {
    const running = c.guideRunIds.filter((r) => s.guideRuns[r] && !s.guideRuns[r].endedAt);
    if (running.length > 1) return `zwei offene Anleitungen in ${c.id}`;
    // Je Runde (model/policies/rounds.ts): jede frühere für sich und die laufende. Jeder Termin
    // des Falls gehört zu genau einer Runde.
    const own = s.bookings.filter((b) => b.caseId === c.id);
    const rounds = c.rounds ?? [];
    const archived = rounds.flatMap((r) => r.bookingIds);
    if (new Set(archived).size < archived.length) return `Termin in zwei Runden in ${c.id}`;
    if (archived.some((id) => !own.some((b) => b.id === id)))
      return `Runde mit fremdem Termin in ${c.id}`;
    const groups = [
      ...rounds.map((r) => ({ ids: r.bookingIds, claim: r.claim })),
      { ids: own.filter((b) => !archived.includes(b.id)).map((b) => b.id), claim: c.claim },
    ];
    for (const g of groups) {
      const rejected = g.claim?.decision?.result === 'abgelehnt';
      const kinds = own
        .filter(
          (b) =>
            g.ids.includes(b.id) &&
            b.status !== 'storniert' &&
            !(rejected && b.subjectToApproval && b.status === 'angefragt'),
        )
        .map((b) => b.kind);
      if (new Set(kinds).size < kinds.length) return `zwei Termine derselben Art in ${c.id}`;
    }
  }
  return undefined;
}

const REACHED: Booking['status'][] = ['bestaetigt', 'unterwegs', 'erledigt'];

/** Die Taps auf „Zahlungspflichtig buchen“ für einen Termin, so wie die Fallakte sie hält */
const bindings = (s: AppState, bookingId: string) =>
  s.events.filter(
    (e) => e.type === 'zahlungspflichtig_gebucht' && e.payload.bookingId === bookingId,
  );

/**
 * Zahlt der Haushalt für diesen Termin, nachgerechnet ohne die Regeln der App: Selbstzahler den
 * Preis, nach der Freigabe die Selbstbeteiligung über 0 €. Vorbehaltlich Freigabe nur, wenn sie
 * kam. Claim ist der Schadenfall der Runde, zu der der Termin gehört. Die Vor-Ort-Diagnose kostet,
 * was der Betrieb genannt hat. Ohne Preis kann der Betrieb sie nicht bestätigen, das prüft
 * bindingViolation.
 */
function owes(b: Booking, claim: Claim | undefined, deductible: number): boolean {
  // Die Nachbesserung kostet den Haushalt nichts (Nr. 32), das prüft reworkViolation
  if (b.reworkOf) return false;
  if (b.kind === 'vor_ort_diagnose') return b.price !== undefined && b.price > 0;
  if (b.kind !== 'reparatur') return false;
  const approved = claim?.decision?.result === 'freigegeben';
  if (b.subjectToApproval || approved) return approved && deductible > 0;
  return true;
}

/**
 * Nr. 31: Kein Termin bestätigt, unterwegs oder erledigt und kein Fall in der Reparatur mit
 * einem Betrag, den der Haushalt zahlt, ohne den Tap „Zahlungspflichtig buchen“ in der Fallakte,
 * mit genau dem Betrag am Termin. Kein verbindlicher Termin, solange der Versicherer prüft, und
 * eine Anfrage vorbehaltlich Freigabe wird nach einer Ablehnung nie zur Buchung.
 */
function bindingViolation(s: AppState): string | undefined {
  const deductible = s.contracts[0]?.deductible ?? 0;
  for (const c of Object.values(s.cases)) {
    const rounds = c.rounds ?? [];
    /** Die Runde des Termins: eine frühere oder die laufende (model/policies/rounds.ts) */
    const roundOf = (b: Booking) => rounds.find((r) => r.bookingIds.includes(b.id));
    for (const b of s.bookings.filter((x) => x.caseId === c.id)) {
      const round = roundOf(b);
      const claim = round ? round.claim : c.claim;
      const running =
        REACHED.includes(b.status) ||
        (c.status === 'in_reparatur' &&
          !round &&
          b.kind === 'reparatur' &&
          b.status !== 'storniert');
      const taps = bindings(s, b.id);
      if (running && owes(b, claim, deductible)) {
        if (!b.binding || taps.length !== 1) return `${b.id} läuft ohne Zahlungspflichtig buchen`;
        if (taps[0]!.payload.amount !== b.binding.amount || b.binding.amount <= 0)
          return `${b.id} mit anderem Betrag gebucht`;
      }
      if (b.kind === 'reparatur' && b.binding && claim && !claim.decision)
        return `${b.id} verbindlich, während der Versicherer prüft`;
      const lapsed = b.subjectToApproval && claim?.decision?.result === 'abgelehnt';
      if (lapsed && (b.binding || taps.length || REACHED.includes(b.status)))
        return `${b.id} nach der Ablehnung gebucht`;
      // Nr. 33: kein Besuch ohne genannten Preis, „Nicht buchen“ beendet die Anfrage ohne Kosten
      if (b.kind === 'vor_ort_diagnose' && REACHED.includes(b.status) && b.price === undefined)
        return `${b.id} Vor-Ort-Diagnose ohne Preis bestätigt`;
      const declined = s.events.some(
        (e) => e.type === 'nicht_gebucht' && e.payload.bookingId === b.id,
      );
      if (declined && (b.status !== 'storniert' || b.binding || taps.length))
        return `${b.id} nach „Nicht buchen“ weiter gebucht`;
    }
  }
  return undefined;
}

/** Ein neuer Tap „Zahlungspflichtig buchen“ in diesem Schritt, während der Versicherer prüfte? */
function bindingDuringReview(before: AppState, after: AppState): string | undefined {
  for (const e of after.events.slice(before.events.length)) {
    if (e.type !== 'zahlungspflichtig_gebucht') continue;
    for (const s of [before, after]) {
      const c = s.cases[e.caseId];
      if (c?.status === 'freigabe_noetig' || (c?.claim && !c.claim.decision))
        return `Zahlungspflichtig gebucht in ${e.caseId}, während der Versicherer prüft`;
    }
  }
  return undefined;
}

/** Ein Termin, der noch läuft */
const RUNNING: Booking['status'][] = ['angefragt', 'bestaetigt', 'unterwegs'];

/** Termine der laufenden Runde eines Falls (model/policies/rounds.ts) */
const currentOf = (s: AppState, c: Case) => {
  const earlier = (c.rounds ?? []).flatMap((r) => r.bookingIds);
  return s.bookings.filter((b) => b.caseId === c.id && !earlier.includes(b.id));
};

/**
 * Nr. 34: Ein abgebrochener Fall hat keinen laufenden Termin und keinen nächsten Schritt der
 * Simulation. Ist der Betrieb mit der Reparatur fertig, bricht nichts den Fall mehr ab. Wird ein
 * Fall in diesem Schritt abgebrochen, ist jeder Termin, der vorher lief,
 * storniert und hat seine Absage in der Fallakte. Dabei entsteht keine neue Weitergabe. Ein
 * Schritt der Simulation in einem geschlossenen Fall schreibt nichts.
 */
function cancelViolation(before: AppState, after: AppState, step: Step): string | undefined {
  for (const c of Object.values(after.cases)) {
    if (c.status !== 'abgebrochen') continue;
    if (currentOf(after, c).some((b) => RUNNING.includes(b.status)))
      return `${c.id} abgebrochen mit laufendem Termin`;
    if (nextSimulationDue(after, c.id) !== undefined)
      return `${c.id} abgebrochen, die Simulation hat noch einen Schritt`;
    const was = before.cases[c.id];
    if (!was || was.status === 'abgebrochen') continue;
    // Ist der Betrieb fertig, gibt es nichts mehr abzusagen (Gegenprüfung Nr. 31 bis 34, F4)
    if (currentOf(before, was).some((b) => b.kind === 'reparatur' && b.status === 'erledigt'))
      return `${c.id} abgebrochen, obwohl der Betrieb fertig war`;
    for (const b of currentOf(before, was).filter((x) => RUNNING.includes(x.status))) {
      const notice = after.events.filter(
        (e) => e.type === 'termin_abgesagt' && e.payload.bookingId === b.id,
      );
      if (notice.length !== 1) return `${b.id} ohne Absage abgebrochen`;
    }
    const shared = (s: AppState) =>
      s.consents.filter((k) => k.caseId === c.id && k.purpose === 'weitergabe_betrieb').length;
    if (shared(after) !== shared(before)) return `${c.id} Abbruch mit neuer Weitergabe`;
  }
  if (step.name === 'simulation' && step.caseId) {
    const c = before.cases[step.caseId];
    if (c && isClosed(c.status) && after !== before) return `${c.id} Simulation nach dem Abschluss`;
  }
  return undefined;
}

/**
 * Nr. 32: Eine Nachbesserung hat nie einen Schadenfall, nie einen Tap „Zahlungspflichtig buchen“
 * und nie einen Betrag. Ihr Termin geht an den Betrieb der Reparatur, die sie nachbessert, und
 * gehört zu einer Runde, die als Nachbesserung markiert ist. Eine Nachbesserung wird nicht noch
 * einmal nachgebessert. Eine Nachbesserung gibt es nur innerhalb der Frist, mit „Reparatur liegt
 * länger zurück“ nie.
 */
function reworkViolation(s: AppState, longAgo: boolean): string | undefined {
  for (const c of Object.values(s.cases)) {
    const rounds = c.rounds ?? [];
    if (c.status === 'nachbesserung' && !c.rework) return `${c.id} Nachbesserung ohne Markierung`;
    for (const r of [...rounds.map((x) => x), { claim: c.claim, rework: c.rework }]) {
      if (r.rework && r.claim) return `${c.id} Nachbesserung mit Schadenfall`;
      if (r.rework && Date.parse(r.rework.claimedAt) > Date.parse(r.rework.until))
        return `${c.id} Nachbesserung nach Ablauf der Frist`;
    }
    const own = s.bookings.filter((b) => b.caseId === c.id);
    for (const b of own.filter((x) => x.reworkOf)) {
      const repaired = own.find((x) => x.id === b.reworkOf);
      if (!repaired) return `${b.id} Nachbesserung ohne Reparatur`;
      if (repaired.reworkOf) return `${b.id} Nachbesserung einer Nachbesserung`;
      if (repaired.provider.id !== b.provider.id)
        return `${b.id} Nachbesserung bei anderem Betrieb`;
      if (b.binding || b.subjectToApproval || b.price !== undefined || bindings(s, b.id).length)
        return `${b.id} Nachbesserung mit Betrag oder Freigabe`;
      const round = rounds.find((r) => r.bookingIds.includes(b.id));
      const marked = round ? round.rework : c.rework;
      if (marked?.repairBookingId !== b.reworkOf) return `${b.id} Nachbesserung ohne ihre Runde`;
    }
    if (longAgo && s.events.some((e) => e.caseId === c.id && e.type === 'nachbesserung_verlangt'))
      return `${c.id} Nachbesserung, obwohl die Reparatur länger zurückliegt`;
  }
  return undefined;
}

/**
 * Nr. 32 je Schritt: Solange der Fall nachbessert, entsteht kein Schadenfall und kein Tap. Ein neuer
 * Termin zur Nachbesserung braucht eine gültige Weitergabe an den Betrieb und legt keine neue an.
 */
function reworkStep(before: AppState, after: AppState): string | undefined {
  for (const e of after.events.slice(before.events.length)) {
    if (e.type !== 'schaden_gemeldet' && e.type !== 'zahlungspflichtig_gebucht') continue;
    for (const s of [before, after]) {
      if (s.cases[e.caseId]?.rework) return `${e.type} während der Nachbesserung in ${e.caseId}`;
    }
  }
  for (const b of after.bookings.filter((x) => x.reworkOf)) {
    if (before.bookings.some((x) => x.id === b.id)) continue;
    const c = before.cases[b.caseId]!;
    const active = before.consents.some(
      (k) =>
        k.caseId === c.id &&
        k.purpose === 'weitergabe_betrieb' &&
        !k.revokedAt &&
        k.recipient.id === b.provider.id,
    );
    if (!active) return `${b.id} Nachbesserung ohne gültige Weitergabe`;
    if (after.consents.length !== before.consents.length)
      return `${b.id} Nachbesserung mit neuer Weitergabe`;
  }
  return undefined;
}

/** Gültige Weitergaben eines Falls an den Händler */
const dealerShares = (s: AppState, caseId: string) =>
  s.consents.filter(
    (k) => k.caseId === caseId && k.purpose === 'weitergabe_haendler' && !k.revokedAt,
  );

/**
 * Hilfe ist nötig, nachgerechnet ohne die Regeln der App, so wie mach’s das Angebot „Fall an …
 * senden“ vor der Übertragung zeigte: nach „Hilfe holen“, während der Prüfung, nach der Ablehnung,
 * mit Kostenvoranschlag oder wenn die neueste Anleitung nicht ging.
 */
function needsHelp(s: AppState, c: Case): boolean {
  const last = c.guideRunIds
    .map((r) => s.guideRuns[r])
    .filter((r) => !!r)
    .at(-1);
  return (
    ['eskaliert', 'freigabe_noetig', 'abgelehnt'].includes(c.status) ||
    s.quotes.some((q) => q.id === c.quoteId) ||
    last?.outcome === 'geht_nicht' ||
    last?.outcome === 'laeuft_nicht'
  );
}

/**
 * Entscheidungen 28 und 32: Je Fall höchstens eine Weitergabe an den Händler, auch nach einem
 * Widerruf keine zweite. Das Backend nähme sie ohne das Token der ersten nicht an. Sie entsteht nur
 * für ein Gerät, das bei ihm gekauft ist, an genau ihn, in einem offenen Fall, der Hilfe braucht.
 * Eine Nachricht an den Händler gibt es nur mit gültiger Weitergabe in einem offenen Fall.
 */
function dealerViolation(before: AppState, after: AppState): string | undefined {
  for (const c of Object.values(after.cases)) {
    if (dealerShares(after, c.id).length > 1) return `${c.id} zweimal an den Händler`;
  }
  const fresh = after.consents.filter(
    (k) => k.purpose === 'weitergabe_haendler' && !before.consents.some((b) => b.id === k.id),
  );
  for (const k of fresh) {
    const c = before.cases[k.caseId!];
    if (!c) return `${k.id} an den Händler ohne Fall`;
    const soldBy = before.devices.find((d) => d.id === c.deviceId)?.soldBy;
    if (!soldBy || soldBy.id !== k.recipient.id) return `${c.id} an einen fremden Händler`;
    if (isClosed(c.status)) return `${c.id} geschlossen an den Händler`;
    if (!needsHelp(before, c)) return `${c.id} an den Händler, ohne dass Hilfe nötig war`;
    if (dealerShares(before, c.id).length) return `${c.id} an den Händler, obwohl er ihn hat`;
    if (
      before.shares[c.id] ||
      before.consents.some((b) => b.caseId === c.id && b.purpose === 'weitergabe_haendler')
    )
      return `${c.id} ein zweites Mal an den Händler`;
    if (after.shares[c.id]?.consentId !== k.id) return `${c.id} Weitergabe ohne Eintrag zum Senden`;
  }
  for (const e of after.events.slice(before.events.length)) {
    if (e.type !== 'nachricht_an_haendler') continue;
    const c = before.cases[e.caseId];
    if (!c || isClosed(c.status))
      return `${e.caseId} Nachricht an den Händler im geschlossenen Fall`;
    if (!dealerShares(before, c.id).length)
      return `${c.id} Nachricht an den Händler ohne gültige Weitergabe`;
  }
  return undefined;
}

const isRefused = (r: unknown): boolean =>
  typeof r === 'object' && r !== null && 'ok' in r && (r as { ok: unknown }).ok === false;

test('1.000 zufällige Folgen aus availableActions: keine Exception, je Gerät höchstens ein offener Fall', () => {
  const seen = new Set<ActionKey>();
  /** Wege, die die Folgen erreichen müssen, damit die Invarianten etwas prüfen */
  const reached = new Set<string>();
  let steps = 0;
  assert(
    property(
      constantFrom(...STARTS),
      boolean(),
      // Gekauft beim Händler (Entscheidung 31), mit oder ohne Schutz
      boolean(),
      integer({ min: 1, max: 2 }),
      constantFrom('freigeben' as const, 'ablehnen' as const),
      // Selbstbeteiligung wie in der Demo-Steuerung: 0 € oder 50 € (Entscheidung Nr. 4)
      constantFrom(0, 5000),
      // „Reparatur liegt länger zurück“ aus der Demo-Steuerung (Nr. 32)
      boolean(),
      array(nat(), { minLength: 5, maxLength: 25, size: 'max' }),
      (start, contract, dealer, devices, claimScenario, deductible, longAgo, choices) => {
        const store = setup(start, contract, dealer, devices, claimScenario, deductible, longAgo);
        const trail: string[] = [start];
        for (const choice of choices) {
          const step = pick(menu(store), choice);
          const before = store.getState();
          const result = step.run(before);
          trail.push(step.name);
          steps += 1;
          if (step.action) seen.add(step.action);
          // Eine Ablehnung schreibt nichts
          const after = store.getState();
          const problem =
            isRefused(result) && after !== before
              ? `Ablehnung hat geschrieben: ${step.name}`
              : (violation(after) ??
                bindingViolation(after) ??
                bindingDuringReview(before, after) ??
                cancelViolation(before, after, step) ??
                reworkViolation(after, longAgo) ??
                reworkStep(before, after) ??
                dealerViolation(before, after));
          if (problem) throw new Error(`${problem} nach ${trail.join(' → ')}`);
          for (const c of Object.values(after.cases)) {
            if (before.cases[c.id]?.status === 'in_reparatur' && c.status === 'abgebrochen')
              reached.add('abbruch_in_reparatur');
          }
          for (const e of after.events.slice(before.events.length)) {
            if (e.type === 'nachbesserung_verlangt') reached.add('nachbesserung');
            if (e.type === 'problem_besteht_weiter' && typeof e.payload.warranty === 'string')
              reached.add(`neue_runde_${e.payload.warranty}`);
            if (e.type === 'termin_angefragt' && e.payload.rework)
              reached.add('nachbesserung_termin');
            if (e.type === 'termin_abgesagt' && e.payload.rework === undefined) {
              const b = after.bookings.find((x) => x.id === e.payload.bookingId);
              if (b?.reworkOf) reached.add('nachbesserung_abgesagt');
            }
            if (e.type === 'nachricht_an_haendler') reached.add('haendler_nachricht');
            if (e.type === 'weitergabe_bestaetigt' && e.payload.purpose === 'weitergabe_haendler')
              reached.add('haendler_gesendet');
          }
          // Nach dem Widerruf lehnt der Store ein zweites Senden ab, auch im offenen Fall, der
          // Hilfe braucht. Dort sendete mach’s vor der Übertragung noch einmal.
          const tried = step.name === NOCHMAL_HAENDLER ? before.cases[step.caseId!] : undefined;
          if (tried && isRefused(result) && !isClosed(tried.status) && needsHelp(before, tried)) {
            reached.add('haendler_nach_widerruf_abgelehnt');
          }
        }
      },
    ),
    { numRuns: RUNS, seed: SEED },
  );
  expect(steps).toBeGreaterThanOrEqual(RUNS * 10);
  // Die Folgen kommen überall hin: Jede Aktion des Haushalts lief mindestens einmal
  expect(ALL_ACTIONS.filter((a) => !seen.has(a))).toEqual([]);
  expect([...reached].sort()).toEqual([
    'abbruch_in_reparatur',
    'haendler_gesendet',
    'haendler_nach_widerruf_abgelehnt',
    'haendler_nachricht',
    'nachbesserung',
    'nachbesserung_abgesagt',
    'nachbesserung_termin',
    'neue_runde_abgelaufen',
    'neue_runde_keine_reparatur',
    'neue_runde_nachbesserung_gescheitert',
  ]);
});
